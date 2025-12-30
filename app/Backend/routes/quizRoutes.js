const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const QuestionHistory = require('../models/QuestionHistory');
const UserPerformance = require('../models/UserPerformance');
const fs = require('fs').promises;
const path = require('path');

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Create a new quiz session with intelligent question selection
router.post('/create', asyncHandler(async (req, res) => {
  try {
    const { roadmapType, difficulty, questionCount = 20, timeLimit = 30, adaptiveDifficulty = false, topic } = req.body;

    // Get user performance data for adaptive selection
    let userPerformance = await UserPerformance.findOne({
      userId: req.user.id,
      roadmapType
    });

    if (!userPerformance) {
      userPerformance = new UserPerformance({
        userId: req.user.id,
        roadmapType
      });
      await userPerformance.save();
    }

    // Get question history to avoid repetition
    const questionHistory = await QuestionHistory.find({
      userId: req.user.id,
      roadmapType
    }).select('questionId');

    const attemptedQuestionIds = new Set(questionHistory.map(h => h.questionId));


    // Map roadmap types to categories (same as PersonalizedQuestionSetService)
    const categoryMapping = {
      'frontend': ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'Angular', 'Frontend'],
      'backend': ['Node.js', 'Express', 'API', 'Database', 'Server', 'Backend'],
      'full-stack': ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Database', 'Full-Stack'],
      'mobile': ['React Native', 'Flutter', 'iOS', 'Android', 'Mobile'],
      'ai-ml': ['Machine Learning', 'AI', 'Python', 'Data Science', 'Neural Networks'],
      'devops': ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'DevOps', 'Cloud'],
      'database': ['SQL', 'MongoDB', 'Database', 'Data Science', 'Analytics'],
      'cybersecurity': ['Security', 'Encryption', 'Network Security', 'Cybersecurity']
    };

    const relevantCategories = categoryMapping[roadmapType] || [roadmapType];

    // Fetch questions from database using categories (same approach as PersonalizedQuestionSetService)
    console.log(`Fetching questions for categories: ${relevantCategories.join(', ')}`);

    let allQuestions = await Question.find({
      category: { $in: relevantCategories }
    }).lean();

    console.log(`Found ${allQuestions.length} questions in database for ${roadmapType}`);

    // Debug: Log first few questions
    if (allQuestions.length > 0) {
      console.log('Sample questions from DB:', allQuestions.slice(0, 2).map(q => ({
        id: q._id,
        content: q.content?.substring(0, 50),
        categories: q.category,
        difficulty: q.difficulty
      })));
    }

    // Fallback to JSON files if database has no questions
    if (allQuestions.length === 0) {
      console.log(`No questions in database for categories ${relevantCategories.join(', ')}, loading from JSON files...`);

      const jsonFileMapping = {
        'frontend': 'frontend',
        'backend': 'backend',
        'full-stack': 'full-stack',
        'mobile': 'mobile-app',
        'ai-ml': 'ai-machine-learning',
        'devops': 'devops-cloud',
        'database': 'database-data-science',
        'cybersecurity': 'cybersecurity'
      };

      const questionFile = jsonFileMapping[roadmapType] || roadmapType;
      const questionsPath = path.join(__dirname, '../Questions', `${questionFile}.json`);

      try {
        const questionsData = await fs.readFile(questionsPath, 'utf8');
        const { questions: jsonQuestions } = JSON.parse(questionsData);

        // Transform JSON questions to match database format
        allQuestions = (jsonQuestions || []).map(q => ({
          _id: q.questionId,
          content: q.question,
          options: q.options,
          correctAnswer: q.answer,
          explanation: q.explanation,
          category: [q.topic || roadmapType],
          difficulty: q.difficulty === 'easy' ? 3 : q.difficulty === 'medium' ? 6 : 9,
          questionId: q.questionId,
          question: q.question,
          answer: q.answer,
          topic: q.topic
        }));

        console.log(`Loaded ${allQuestions.length} questions from ${questionFile}.json`);
      } catch (err) {
        console.error(`Error loading questions from JSON: ${err.message}`);
        allQuestions = [];
      }
    }

    // Determine effective difficulty based on adaptive settings
    let effectiveDifficulty = difficulty;
    if (adaptiveDifficulty && userPerformance.overallStats.totalQuestions > 10) {
      effectiveDifficulty = userPerformance.adaptiveSettings.currentDifficultyLevel;
    }

    // Convert difficulty to numeric range (more inclusive ranges)
    const getDifficultyRange = (diff) => {
      if (diff === 'easy') return { min: 1, max: 5 };
      if (diff === 'medium') return { min: 3, max: 8 };
      if (diff === 'hard') return { min: 6, max: 10 };
      if (diff === 'mixed') return { min: 1, max: 10 };
      return { min: 1, max: 10 };
    };

    const difficultyRange = getDifficultyRange(effectiveDifficulty);

    // Smart question filtering with time-based freshness
    const now = new Date();
    const daysSinceAttempt = (questionId) => {
      const history = questionHistory.find(h => h.questionId === questionId);
      if (!history) return Infinity;
      return (now - new Date(history.lastAttempted)) / (1000 * 60 * 60 * 24);
    };

    console.log(`Filtering questions with difficulty range: ${difficultyRange.min}-${difficultyRange.max}`);
    console.log(`Topic filter: ${topic || 'none'}`);

    // First, try with topic filter
    let availableQuestions = allQuestions.filter(q => {
      // Use questionId for JSON questions, _id for database questions
      const qId = q._id ? q._id.toString() : q.questionId;

      // Allow questions attempted more than 7 days ago
      const daysSince = daysSinceAttempt(qId);
      if (attemptedQuestionIds.has(qId) && daysSince < 7) {
        return false;
      }

      // Filter by difficulty range
      const qDifficulty = typeof q.difficulty === 'number' ? q.difficulty :
        (q.difficulty === 'easy' ? 3 : q.difficulty === 'medium' ? 6 : 9);

      const passesDifficulty = qDifficulty >= difficultyRange.min && qDifficulty <= difficultyRange.max;
      if (!passesDifficulty) {
        return false;
      }

      // Filter by topic if provided (more flexible matching)
      if (topic) {
        const topicLower = topic.toLowerCase();
        const hasMatchingTopic = q.topic === topic ||
          (q.category && q.category.includes(topic)) ||
          (q.category && q.category.some(cat =>
            cat.toLowerCase().includes(topicLower) ||
            topicLower.includes(cat.toLowerCase())
          ));
        return hasMatchingTopic;
      }

      return true;
    });

    console.log(`Questions after filtering: ${availableQuestions.length}`);

    // If topic filter is too restrictive, try without it
    if (topic && availableQuestions.length < questionCount) {
      console.log(`⚠️ Topic filter too restrictive (${availableQuestions.length} questions), trying without topic filter...`);

      availableQuestions = allQuestions.filter(q => {
        const qId = q._id ? q._id.toString() : q.questionId;

        // Allow questions attempted more than 7 days ago
        const daysSince = daysSinceAttempt(qId);
        if (attemptedQuestionIds.has(qId) && daysSince < 7) {
          return false;
        }

        // Filter by difficulty range only
        const qDifficulty = typeof q.difficulty === 'number' ? q.difficulty :
          (q.difficulty === 'easy' ? 3 : q.difficulty === 'medium' ? 6 : 9);

        return qDifficulty >= difficultyRange.min && qDifficulty <= difficultyRange.max;
      });

      console.log(`Questions without topic filter: ${availableQuestions.length}`);
    }

    // If not enough fresh questions, include some previously attempted ones
    if (availableQuestions.length < questionCount) {
      const additionalQuestions = allQuestions.filter(q => {
        const qId = q._id ? q._id.toString() : q.questionId;
        if (effectiveDifficulty !== 'mixed') {
          return q.difficulty === effectiveDifficulty && attemptedQuestionIds.has(qId);
        }
        return attemptedQuestionIds.has(qId);
      });

      availableQuestions = [...availableQuestions, ...additionalQuestions];
    }

    // Enhanced prioritization with spaced repetition
    const prioritizeQuestions = (questions) => {
      return questions.map(q => {
        let priority = 1;
        const qId = q._id ? q._id.toString() : q.questionId;
        const history = questionHistory.find(h => h.questionId === qId);

        // Higher priority for incorrect answers (spaced repetition)
        if (history && !history.isCorrect) {
          const daysSince = daysSinceAttempt(qId);
          if (daysSince >= 1) priority += 3; // Recently incorrect
          if (daysSince >= 3) priority += 2; // Needs review
        }

        // Higher priority for weak topics
        if (userPerformance.overallStats.weakTopics.includes(q.topic)) {
          priority += 2;
        }

        // Lower priority for strong topics (but still include some)
        if (userPerformance.overallStats.strongTopics.includes(q.topic)) {
          priority -= 1;
        }

        return { ...q, priority };
      }).sort((a, b) => b.priority - a.priority);
    };

    if (userPerformance.overallStats.totalQuestions > 5) {
      availableQuestions = prioritizeQuestions(availableQuestions);

      // Smart distribution: 40% high priority, 40% medium, 20% random
      const highPriorityCount = Math.ceil(questionCount * 0.4);
      const mediumPriorityCount = Math.ceil(questionCount * 0.4);
      const randomCount = questionCount - highPriorityCount - mediumPriorityCount;

      const highPriority = availableQuestions.slice(0, highPriorityCount);
      const mediumPriority = availableQuestions.slice(highPriorityCount, highPriorityCount + mediumPriorityCount);
      const randomQuestions = availableQuestions.slice(highPriorityCount + mediumPriorityCount)
        .sort(() => Math.random() - 0.5).slice(0, randomCount);

      availableQuestions = [...highPriority, ...mediumPriority, ...randomQuestions];
    }

    // Shuffle and limit questions
    const shuffledQuestions = availableQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, questionCount)
      .map(q => {
        // Handle both database and JSON question formats
        const isDbQuestion = q.content && q.correctAnswer; // Database format
        const questionText = isDbQuestion ? q.content : q.question;
        const correctAnswer = isDbQuestion ? q.correctAnswer : q.answer;
        const questionId = isDbQuestion ? q._id.toString() : q.questionId;
        const questionTopic = isDbQuestion ? (q.category[0] || roadmapType) : (q.topic || roadmapType);
        const questionDifficulty = isDbQuestion ? q.difficulty : q.difficulty;
        const questionExplanation = q.explanation || 'No explanation available';

        // Handle different answer formats for JSON questions
        let finalCorrectAnswer = correctAnswer;
        let shuffledOptions = [...q.options];

        if (!isDbQuestion && /^[A-D]$/.test(correctAnswer)) {
          // Handle letter-based answers (A, B, C, D) for JSON questions
          const matchingOption = q.options.find(option =>
            option.startsWith(correctAnswer + '.')
          );
          if (matchingOption) {
            finalCorrectAnswer = matchingOption;
          } else {
            // Fallback: Convert letter to index if no letter prefix found
            const letterIndex = correctAnswer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
            if (letterIndex >= 0 && letterIndex < q.options.length) {
              finalCorrectAnswer = q.options[letterIndex];
            }
          }
        }

        // Shuffle the options
        shuffledOptions = shuffledOptions.sort(() => Math.random() - 0.5);

        return {
          questionId: questionId,
          question: questionText,
          options: shuffledOptions,
          correctAnswer: finalCorrectAnswer,
          originalAnswer: correctAnswer, // Keep original for reference
          topic: questionTopic,
          difficulty: questionDifficulty,
          explanation: questionExplanation,
          userAnswer: '',
          isCorrect: false,
          timeSpent: 0,
          status: 'unanswered'
        };
      });

    console.log(`Available questions after filtering: ${availableQuestions.length}`);
    console.log(`Final shuffled questions: ${shuffledQuestions.length}`);

    // Critical check: Ensure we have questions before creating quiz
    if (shuffledQuestions.length === 0) {
      console.error(`❌ No questions available for quiz creation!`);
      console.error(`   - Roadmap: ${roadmapType}`);
      console.error(`   - Categories: ${relevantCategories.join(', ')}`);
      console.error(`   - Difficulty: ${effectiveDifficulty} (${difficultyRange.min}-${difficultyRange.max})`);
      console.error(`   - Total questions found: ${allQuestions.length}`);
      console.error(`   - After filtering: ${availableQuestions.length}`);

      return res.status(400).json({
        success: false,
        message: 'No questions available for this quiz configuration. Please try a different difficulty level or roadmap.',
        debug: {
          roadmapType,
          categories: relevantCategories,
          difficulty: effectiveDifficulty,
          totalQuestions: allQuestions.length,
          availableAfterFilter: availableQuestions.length
        }
      });
    }

    console.log(`✅ Creating quiz with ${shuffledQuestions.length} questions...`);

    const quiz = new Quiz({
      userId: req.user.id,
      title: `${roadmapType.charAt(0).toUpperCase() + roadmapType.slice(1)} Quiz - ${adaptiveDifficulty ? 'Adaptive' : effectiveDifficulty}`,
      roadmapType,
      difficulty: effectiveDifficulty,
      questions: shuffledQuestions,
      totalQuestions: shuffledQuestions.length,
      timeLimit,
      isAdaptive: adaptiveDifficulty,
      adaptiveSettings: adaptiveDifficulty ? {
        currentDifficulty: effectiveDifficulty === 'mixed' ? 'easy' : effectiveDifficulty,
        consecutiveCorrect: 0,
        consecutiveIncorrect: 0,
        difficultyChanges: [],
        fastAnswerThreshold: 10,
        confidenceBoostThreshold: 2,
        difficultyDropThreshold: 1
      } : undefined
    });

    console.log(`Creating quiz with ${shuffledQuestions.length} questions...`);
    console.log(`First question:`, shuffledQuestions[0]);

    try {
      await quiz.save();
      console.log(`✅ Quiz saved successfully with ID: ${quiz._id}`);
    } catch (saveError) {
      console.error('❌ Error saving quiz to database:', saveError);
      throw saveError;
    }

    res.json({
      success: true,
      data: quiz,
      adaptiveInfo: {
        recommendedDifficulty: userPerformance.overallStats.recommendedDifficulty,
        weakTopics: userPerformance.overallStats.weakTopics,
        strongTopics: userPerformance.overallStats.strongTopics,
        freshQuestions: availableQuestions.length - attemptedQuestionIds.size
      }
    });

  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quiz',
      error: error.message
    });
  }
}));

// Get quiz by ID
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    res.json({
      success: true,
      data: quiz
    });

  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz'
    });
  }
}));

// Update quiz answer with intelligent tracking and adaptive difficulty
router.put('/:id/answer', asyncHandler(async (req, res) => {
  try {
    const { questionIndex, answer, timeSpent } = req.body;

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    let adaptiveChange = null;

    if (questionIndex >= 0 && questionIndex < quiz.questions.length) {
      const question = quiz.questions[questionIndex];
      question.userAnswer = answer;

      // Debug logging to see what's being compared
      console.log('=== ANSWER COMPARISON DEBUG ===');
      console.log('User answer:', JSON.stringify(answer));
      console.log('User answer type:', typeof answer);
      console.log('User answer length:', answer ? answer.length : 'null');
      console.log('Stored correctAnswer:', JSON.stringify(question.correctAnswer));
      console.log('Stored correctAnswer type:', typeof question.correctAnswer);
      console.log('Stored correctAnswer length:', question.correctAnswer ? question.correctAnswer.length : 'null');
      console.log('Original answer:', JSON.stringify(question.originalAnswer));
      console.log('Question options:', JSON.stringify(question.options));
      console.log('Strict equality (===):', answer === question.correctAnswer);
      console.log('Loose equality (==):', answer == question.correctAnswer);
      console.log('Trimmed comparison:', answer?.trim() === question.correctAnswer?.trim());

      // Enhanced answer validation with multiple checks
      let isAnswerCorrect = false;

      if (answer && question.correctAnswer) {
        // Try exact match first
        if (answer === question.correctAnswer) {
          isAnswerCorrect = true;
          console.log('✅ Match: Exact string match');
        }
        // Try trimmed match
        else if (answer.trim() === question.correctAnswer.trim()) {
          isAnswerCorrect = true;
          console.log('✅ Match: Trimmed string match');
        }
        // Try case-insensitive match
        else if (answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()) {
          isAnswerCorrect = true;
          console.log('✅ Match: Case-insensitive match');
        }
        // Check if user answer is in the options and matches correct answer
        else if (question.options.includes(answer) && question.options.includes(question.correctAnswer)) {
          const userIndex = question.options.indexOf(answer);
          const correctIndex = question.options.indexOf(question.correctAnswer);
          if (userIndex === correctIndex) {
            isAnswerCorrect = true;
            console.log('✅ Match: Same option index');
          }
        }
      }

      question.isCorrect = isAnswerCorrect;
      console.log(`Final result: ${isAnswerCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
      console.log('=== END DEBUG ===');
      question.timeSpent = timeSpent || 0;
      question.status = 'answered';

      // Update quiz statistics immediately
      quiz.updateStats();

      // Handle adaptive difficulty adjustment
      if (quiz.isAdaptive) {
        adaptiveChange = quiz.adjustAdaptiveDifficulty(questionIndex, question.isCorrect, timeSpent || 0);
      }

      // Update question history
      try {
        const existingHistory = await QuestionHistory.findOne({
          userId: req.user.id,
          roadmapType: quiz.roadmapType,
          questionId: question.questionId
        });

        if (existingHistory) {
          existingHistory.userAnswer = answer;
          existingHistory.isCorrect = question.isCorrect;
          existingHistory.timeSpent = timeSpent || 0;
          existingHistory.attemptCount++;
          existingHistory.lastAttempted = new Date();
          await existingHistory.save();
        } else {
          const newHistory = new QuestionHistory({
            userId: req.user.id,
            roadmapType: quiz.roadmapType,
            questionId: question.questionId,
            topic: question.topic,
            difficulty: question.difficulty,
            userAnswer: answer,
            correctAnswer: question.correctAnswer,
            isCorrect: question.isCorrect,
            timeSpent: timeSpent || 0
          });
          await newHistory.save();
        }

        // Update user performance
        let userPerformance = await UserPerformance.findOne({
          userId: req.user.id,
          roadmapType: quiz.roadmapType
        });

        if (!userPerformance) {
          userPerformance = new UserPerformance({
            userId: req.user.id,
            roadmapType: quiz.roadmapType
          });
        }

        userPerformance.updatePerformance({
          topic: question.topic,
          difficulty: question.difficulty,
          isCorrect: question.isCorrect,
          timeSpent: timeSpent || 0
        });

        await userPerformance.save();

      } catch (historyError) {
        console.error('Error updating question history:', historyError);
        // Don't fail the main request if history update fails
      }

      await quiz.save();
    }

    res.json({
      success: true,
      data: quiz,
      adaptiveChange
    });

  } catch (error) {
    console.error('Error updating quiz answer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update answer'
    });
  }
}));

// Replace a question with adaptive difficulty question
router.put('/:id/replace-question', async (req, res) => {
  try {
    const { questionIndex } = req.body;

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!quiz || !quiz.isAdaptive) {
      return res.status(400).json({
        success: false,
        message: 'Quiz not found or not adaptive'
      });
    }

    const targetDifficulty = quiz.adaptiveSettings.currentDifficulty;

    // Load question bank
    const roadmapMapping = {
      'frontend': 'frontend',
      'backend': 'backend',
      'full-stack': 'full-stack',
      'mobile': 'mobile-app',
      'ai-ml': 'ai-machine-learning',
      'devops': 'devops-cloud',
      'database': 'database-data-science',
      'cybersecurity': 'cybersecurity'
    };

    const questionFile = roadmapMapping[quiz.roadmapType] || 'frontend';
    const questionsPath = path.join(__dirname, '../Questions', `${questionFile}.json`);
    const questionsData = await fs.readFile(questionsPath, 'utf8');
    const { questions: allQuestions } = JSON.parse(questionsData);

    // Get already used question IDs
    const usedQuestionIds = new Set(quiz.questions.map(q => q.questionId));

    // Find questions matching the target difficulty
    const availableQuestions = allQuestions.filter(q =>
      q.difficulty === targetDifficulty && !usedQuestionIds.has(q.questionId)
    );

    if (availableQuestions.length === 0) {
      return res.json({
        success: true,
        message: 'No questions available at target difficulty',
        replaced: false
      });
    }

    // Select a random question
    const selectedQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

    // Replace the question at the specified index
    if (questionIndex >= 0 && questionIndex < quiz.questions.length) {
      // Handle different answer formats
      let correctAnswer = selectedQuestion.answer;
      let shuffledOptions = [...selectedQuestion.options];

      // Check if answer is letter-based (A, B, C, D) and options have letter prefixes
      if (/^[A-D]$/.test(selectedQuestion.answer)) {
        // Find the option that starts with this letter
        const matchingOption = selectedQuestion.options.find(option =>
          option.startsWith(selectedQuestion.answer + '.')
        );
        if (matchingOption) {
          correctAnswer = matchingOption;
        } else {
          // Fallback: Convert letter to index if no letter prefix found
          const letterIndex = selectedQuestion.answer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
          if (letterIndex >= 0 && letterIndex < selectedQuestion.options.length) {
            correctAnswer = selectedQuestion.options[letterIndex];
          }
        }
      }

      // Now shuffle the options
      shuffledOptions = shuffledOptions.sort(() => Math.random() - 0.5);

      quiz.questions[questionIndex] = {
        questionId: selectedQuestion.questionId,
        question: selectedQuestion.question,
        options: shuffledOptions,
        correctAnswer: correctAnswer,
        originalAnswer: selectedQuestion.answer,
        topic: selectedQuestion.topic,
        difficulty: selectedQuestion.difficulty,
        explanation: selectedQuestion.explanation,
        userAnswer: '',
        isCorrect: false,
        timeSpent: 0,
        wasAdaptivelySelected: true,
        adaptiveDifficultyAtTime: targetDifficulty,
        status: 'unanswered'
      };

      await quiz.save();

      res.json({
        success: true,
        data: quiz,
        replaced: true,
        newDifficulty: targetDifficulty
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid question index'
      });
    }

  } catch (error) {
    console.error('Error replacing question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to replace question'
    });
  }
});

// Get next adaptive question for dynamic difficulty adjustment
router.get('/:id/next-question', async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    if (!quiz.isAdaptive) {
      return res.json({
        success: true,
        message: 'Quiz is not adaptive',
        nextQuestion: null
      });
    }

    const currentIndex = quiz.currentQuestionIndex;
    const targetDifficulty = quiz.adaptiveSettings.currentDifficulty;

    // Load question bank for the roadmap
    const roadmapMapping = {
      'frontend': 'frontend',
      'backend': 'backend',
      'full-stack': 'full-stack',
      'mobile': 'mobile-app',
      'ai-ml': 'ai-machine-learning',
      'devops': 'devops-cloud',
      'database': 'database-data-science',
      'cybersecurity': 'cybersecurity'
    };

    const questionFile = roadmapMapping[quiz.roadmapType] || 'frontend';
    const questionsPath = path.join(__dirname, '../Questions', `${questionFile}.json`);
    const questionsData = await fs.readFile(questionsPath, 'utf8');
    const { questions: allQuestions } = JSON.parse(questionsData);

    // Get already used question IDs
    const usedQuestionIds = new Set(quiz.questions.map(q => q.questionId));

    // Find questions matching the current adaptive difficulty
    const availableQuestions = allQuestions.filter(q =>
      q.difficulty === targetDifficulty && !usedQuestionIds.has(q.questionId)
    );

    if (availableQuestions.length === 0) {
      // Fallback to any difficulty if no questions available at target difficulty
      const fallbackQuestions = allQuestions.filter(q => !usedQuestionIds.has(q.questionId));
      if (fallbackQuestions.length === 0) {
        return res.json({
          success: true,
          message: 'No more questions available',
          nextQuestion: null
        });
      }

      // Select a random fallback question
      const randomQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];

      // Handle different answer formats
      let correctAnswer = randomQuestion.answer;
      let shuffledOptions = [...randomQuestion.options];

      // Check if answer is letter-based (A, B, C, D) and options have letter prefixes
      if (/^[A-D]$/.test(randomQuestion.answer)) {
        // Find the option that starts with this letter
        const matchingOption = randomQuestion.options.find(option =>
          option.startsWith(randomQuestion.answer + '.')
        );
        if (matchingOption) {
          correctAnswer = matchingOption;
        } else {
          // Fallback: Convert letter to index if no letter prefix found
          const letterIndex = randomQuestion.answer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
          if (letterIndex >= 0 && letterIndex < randomQuestion.options.length) {
            correctAnswer = randomQuestion.options[letterIndex];
          }
        }
      }

      // Now shuffle the options
      shuffledOptions = shuffledOptions.sort(() => Math.random() - 0.5);

      const adaptiveQuestion = {
        questionId: randomQuestion.questionId,
        question: randomQuestion.question,
        options: shuffledOptions,
        correctAnswer: correctAnswer,
        originalAnswer: randomQuestion.answer,
        topic: randomQuestion.topic,
        difficulty: randomQuestion.difficulty,
        explanation: randomQuestion.explanation,
        userAnswer: '',
        isCorrect: false,
        timeSpent: 0,
        wasAdaptivelySelected: true,
        adaptiveDifficultyAtTime: targetDifficulty,
        status: 'unanswered'
      };

      return res.json({
        success: true,
        nextQuestion: adaptiveQuestion,
        adaptiveInfo: {
          targetDifficulty,
          actualDifficulty: randomQuestion.difficulty,
          wasFallback: true
        }
      });
    }

    // Select a random question from available ones at target difficulty
    const selectedQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

    // Handle different answer formats
    let correctAnswer = selectedQuestion.answer;
    let shuffledOptions = [...selectedQuestion.options];

    // Check if answer is letter-based (A, B, C, D) and options have letter prefixes
    if (/^[A-D]$/.test(selectedQuestion.answer)) {
      // Find the option that starts with this letter
      const matchingOption = selectedQuestion.options.find(option =>
        option.startsWith(selectedQuestion.answer + '.')
      );
      if (matchingOption) {
        correctAnswer = matchingOption;
      } else {
        // Fallback: Convert letter to index if no letter prefix found
        const letterIndex = selectedQuestion.answer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
        if (letterIndex >= 0 && letterIndex < selectedQuestion.options.length) {
          correctAnswer = selectedQuestion.options[letterIndex];
        }
      }
    }

    // Now shuffle the options
    shuffledOptions = shuffledOptions.sort(() => Math.random() - 0.5);

    const adaptiveQuestion = {
      questionId: selectedQuestion.questionId,
      question: selectedQuestion.question,
      options: shuffledOptions,
      correctAnswer: correctAnswer,
      originalAnswer: selectedQuestion.answer,
      topic: selectedQuestion.topic,
      difficulty: selectedQuestion.difficulty,
      explanation: selectedQuestion.explanation,
      userAnswer: '',
      isCorrect: false,
      timeSpent: 0,
      wasAdaptivelySelected: true,
      adaptiveDifficultyAtTime: targetDifficulty,
      status: 'unanswered'
    };

    res.json({
      success: true,
      nextQuestion: adaptiveQuestion,
      adaptiveInfo: {
        targetDifficulty,
        actualDifficulty: selectedQuestion.difficulty,
        wasFallback: false,
        availableCount: availableQuestions.length
      }
    });

  } catch (error) {
    console.error('Error getting next adaptive question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get next question'
    });
  }
});

// Skip question
router.put('/:id/skip', async (req, res) => {
  try {
    const { questionIndex } = req.body;

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    if (questionIndex >= 0 && questionIndex < quiz.questions.length) {
      quiz.questions[questionIndex].status = 'skipped';
      await quiz.save();
    }

    res.json({
      success: true,
      data: quiz
    });

  } catch (error) {
    console.error('Error skipping question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to skip question'
    });
  }
});

// Complete quiz
router.put('/:id/complete', async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    quiz.status = 'completed';
    quiz.completedAt = new Date();
    await quiz.save();

    // Save test result for dashboard display
    try {
      const TestResult = require('../models/TestResult');
      const TestCompletion = require('../models/TestCompletion');

      // Build detailed results from quiz questions
      const detailedResults = quiz.questions.map(q => ({
        question: q.question,
        userAnswer: q.userAnswer || '',
        correctAnswer: q.correctAnswer,
        isCorrect: q.isCorrect || false,
        topic: q.topic,
        difficulty: q.difficulty,
        timeSpent: q.timeSpent || 0
      }));

      // Map roadmapType to full roadmap name for consistency
      const roadmapMapping = {
        'frontend': 'frontend-development',
        'backend': 'backend-development',
        'full-stack': 'full-stack-development',
        'mobile': 'mobile-development',
        'ai-ml': 'ai-machine-learning',
        'devops': 'devops-cloud',
        'database': 'database-data-science',
        'cybersecurity': 'cybersecurity'
      };

      const roadmapType = roadmapMapping[quiz.roadmapType] || quiz.roadmapType;

      // Calculate time spent in seconds
      const timeSpent = quiz.completedAt ?
        Math.floor((new Date(quiz.completedAt) - new Date(quiz.startedAt)) / 1000) : 0;

      // Create test result
      const testResult = new TestResult({
        userId: req.user.id,
        roadmapType: roadmapType,
        testCategory: quiz.title || 'Quiz',
        difficulty: quiz.difficulty || 'mixed',
        score: quiz.accuracy || 0,
        correctAnswers: quiz.correctAnswers || 0,
        totalQuestions: quiz.totalQuestions || quiz.questions.length,
        timeSpent: timeSpent,
        timeTaken: timeSpent,
        detailedResults: detailedResults
      });

      await testResult.save();
      console.log('Test result saved for quiz completion:', testResult._id);

      // Update or create test completion record
      const existingCompletion = await TestCompletion.findOne({
        userId: req.user.id,
        roadmapType: roadmapType,
        testCategory: quiz.title || 'Quiz',
        difficulty: quiz.difficulty || 'mixed'
      });

      if (existingCompletion) {
        existingCompletion.bestScore = Math.max(existingCompletion.bestScore, quiz.accuracy || 0);
        existingCompletion.attemptCount += 1;
        existingCompletion.lastAttemptDate = new Date();
        await existingCompletion.save();
        console.log('Test completion updated:', existingCompletion._id);
      } else {
        const newCompletion = new TestCompletion({
          userId: req.user.id,
          roadmapType: roadmapType,
          testCategory: quiz.title || 'Quiz',
          difficulty: quiz.difficulty || 'mixed',
          bestScore: quiz.accuracy || 0,
          attemptCount: 1
        });
        await newCompletion.save();
        console.log('Test completion created:', newCompletion._id);
      }
    } catch (resultError) {
      console.error('Error saving quiz test result:', resultError);
      // Don't fail the quiz completion if result saving fails
    }

    res.json({
      success: true,
      data: quiz
    });

  } catch (error) {
    console.error('Error completing quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete quiz'
    });
  }
});

// Get user's quiz history
router.get('/', async (req, res) => {
  try {
    const { limit = 10, status, source } = req.query;

    const query = { userId: req.user.id };
    if (status) {
      query.status = status;
    }
    if (source) {
      query.source = source;
    }

    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-questions.explanation'); // Exclude explanations for list view

    res.json({
      success: true,
      quizzes,
      data: quizzes
    });

  } catch (error) {
    console.error('Error fetching quiz history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz history'
    });
  }
});

// Get dynamic question preview (what questions would be selected)
router.get('/preview', async (req, res) => {
  try {
    const { roadmapType, difficulty, questionCount = 10 } = req.query;

    // Get user performance and history
    const [userPerformance, questionHistory] = await Promise.all([
      UserPerformance.findOne({ userId: req.user.id, roadmapType }),
      QuestionHistory.find({ userId: req.user.id, roadmapType }).select('questionId lastAttempted isCorrect topic')
    ]);

    // Load questions
    const roadmapMapping = {
      'frontend': 'frontend', 'backend': 'backend', 'full-stack': 'full-stack',
      'mobile': 'mobile-app', 'ai-ml': 'ai-machine-learning', 'devops': 'devops-cloud',
      'database': 'database-data-science', 'cybersecurity': 'cybersecurity'
    };

    const questionFile = roadmapMapping[roadmapType] || 'frontend';
    const questionsPath = path.join(__dirname, '../Questions', `${questionFile}.json`);
    const questionsData = await fs.readFile(questionsPath, 'utf8');
    const { questions: allQuestions } = JSON.parse(questionsData);

    // Analyze what questions would be selected
    const attemptedQuestionIds = new Set(questionHistory.map(h => h.questionId));
    const freshQuestions = allQuestions.filter(q => !attemptedQuestionIds.has(q.questionId));
    const reviewQuestions = allQuestions.filter(q => {
      const history = questionHistory.find(h => h.questionId === q.questionId);
      return history && !history.isCorrect;
    });

    const topicDistribution = {};
    allQuestions.forEach(q => {
      if (!topicDistribution[q.topic]) topicDistribution[q.topic] = { total: 0, fresh: 0, review: 0 };
      topicDistribution[q.topic].total++;
      if (!attemptedQuestionIds.has(q.questionId)) topicDistribution[q.topic].fresh++;
      if (reviewQuestions.find(rq => rq.questionId === q.questionId)) topicDistribution[q.topic].review++;
    });

    res.json({
      success: true,
      data: {
        totalAvailable: allQuestions.length,
        freshQuestions: freshQuestions.length,
        reviewQuestions: reviewQuestions.length,
        attemptedQuestions: attemptedQuestionIds.size,
        topicDistribution,
        recommendedMix: userPerformance ? {
          weakTopics: userPerformance.overallStats.weakTopics,
          strongTopics: userPerformance.overallStats.strongTopics,
          suggestedDifficulty: userPerformance.adaptiveSettings.currentDifficultyLevel
        } : null
      }
    });

  } catch (error) {
    console.error('Error getting question preview:', error);
    res.status(500).json({ success: false, message: 'Failed to get preview' });
  }
});

// Get adaptive quiz recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const { roadmapType } = req.query;

    const userPerformance = await UserPerformance.findOne({
      userId: req.user.id,
      roadmapType: roadmapType || 'frontend'
    });

    if (!userPerformance) {
      return res.json({
        success: true,
        data: {
          recommendedDifficulty: 'easy',
          weakTopics: [],
          strongTopics: [],
          suggestions: ['Start with easy questions to build confidence']
        }
      });
    }

    const suggestions = [];

    // Generate personalized suggestions
    if (userPerformance.overallStats.overallAccuracy >= 80) {
      suggestions.push('Great job! Consider trying harder questions to challenge yourself.');
    } else if (userPerformance.overallStats.overallAccuracy < 60) {
      suggestions.push('Focus on fundamentals. Practice more easy questions to build confidence.');
    }

    if (userPerformance.overallStats.weakTopics.length > 0) {
      suggestions.push(`Work on: ${userPerformance.overallStats.weakTopics.slice(0, 3).join(', ')}`);
    }

    if (userPerformance.overallStats.strongTopics.length > 0) {
      suggestions.push(`You excel in: ${userPerformance.overallStats.strongTopics.slice(0, 3).join(', ')}`);
    }

    res.json({
      success: true,
      data: {
        recommendedDifficulty: userPerformance.overallStats.recommendedDifficulty,
        currentLevel: userPerformance.adaptiveSettings.currentDifficultyLevel,
        weakTopics: userPerformance.overallStats.weakTopics,
        strongTopics: userPerformance.overallStats.strongTopics,
        overallAccuracy: userPerformance.overallStats.overallAccuracy,
        totalQuestions: userPerformance.overallStats.totalQuestions,
        suggestions,
        topicPerformance: userPerformance.topicPerformance,
        difficultyPerformance: userPerformance.difficultyPerformance
      }
    });

  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations'
    });
  }
});

// Get question statistics for a user
router.get('/stats/:roadmapType', async (req, res) => {
  try {
    const { roadmapType } = req.params;

    const questionHistory = await QuestionHistory.find({
      userId: req.user.id,
      roadmapType
    });

    const stats = {
      totalAttempted: questionHistory.length,
      correctAnswers: questionHistory.filter(q => q.isCorrect).length,
      byTopic: {},
      byDifficulty: {},
      recentPerformance: questionHistory
        .sort((a, b) => new Date(b.lastAttempted) - new Date(a.lastAttempted))
        .slice(0, 10)
    };

    // Calculate topic-wise stats
    questionHistory.forEach(q => {
      if (!stats.byTopic[q.topic]) {
        stats.byTopic[q.topic] = { total: 0, correct: 0, accuracy: 0 };
      }
      stats.byTopic[q.topic].total++;
      if (q.isCorrect) stats.byTopic[q.topic].correct++;
      stats.byTopic[q.topic].accuracy = Math.round(
        (stats.byTopic[q.topic].correct / stats.byTopic[q.topic].total) * 100
      );
    });

    // Calculate difficulty-wise stats
    questionHistory.forEach(q => {
      if (!stats.byDifficulty[q.difficulty]) {
        stats.byDifficulty[q.difficulty] = { total: 0, correct: 0, accuracy: 0 };
      }
      stats.byDifficulty[q.difficulty].total++;
      if (q.isCorrect) stats.byDifficulty[q.difficulty].correct++;
      stats.byDifficulty[q.difficulty].accuracy = Math.round(
        (stats.byDifficulty[q.difficulty].correct / stats.byDifficulty[q.difficulty].total) * 100
      );
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching question stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch question statistics'
    });
  }
});

// Get learning insights and streaks
router.get('/insights/:roadmapType', async (req, res) => {
  try {
    const { roadmapType } = req.params;

    const userPerformance = await UserPerformance.findOne({
      userId: req.user.id,
      roadmapType
    });

    if (!userPerformance) {
      return res.json({
        success: true,
        data: {
          streak: { current: 0, longest: 0 },
          dailyProgress: { completed: 0, goal: 10, percentage: 0 },
          learningVelocity: 'Getting Started',
          nextMilestone: 'Complete your first quiz!'
        }
      });
    }

    const { overallStats } = userPerformance;
    const dailyPercentage = Math.min((overallStats.questionsToday / overallStats.dailyGoal) * 100, 100);

    // Determine learning velocity
    let learningVelocity = 'Steady Learner';
    if (overallStats.questionsToday >= overallStats.dailyGoal) learningVelocity = 'Goal Crusher';
    else if (overallStats.questionsToday >= overallStats.dailyGoal * 0.7) learningVelocity = 'On Track';
    else if (overallStats.questionsToday < overallStats.dailyGoal * 0.3) learningVelocity = 'Needs Boost';

    // Next milestone
    let nextMilestone = 'Keep learning!';
    if (overallStats.currentStreak < 5) nextMilestone = `Get ${5 - overallStats.currentStreak} more correct for a 5-streak!`;
    else if (overallStats.currentStreak < 10) nextMilestone = `${10 - overallStats.currentStreak} more for a 10-streak!`;
    else if (overallStats.totalQuestions < 100) nextMilestone = `${100 - overallStats.totalQuestions} questions to reach 100!`;
    else nextMilestone = 'You\'re a learning champion!';

    res.json({
      success: true,
      data: {
        streak: {
          current: overallStats.currentStreak,
          longest: overallStats.longestStreak
        },
        dailyProgress: {
          completed: overallStats.questionsToday,
          goal: overallStats.dailyGoal,
          percentage: Math.round(dailyPercentage)
        },
        learningVelocity,
        nextMilestone,
        totalQuestions: overallStats.totalQuestions,
        accuracy: overallStats.overallAccuracy,
        adaptiveLevel: userPerformance.adaptiveSettings.currentDifficultyLevel
      }
    });

  } catch (error) {
    console.error('Error getting learning insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get learning insights'
    });
  }
});

// Get overall quiz statistics for dashboard
router.get('/stats', async (req, res) => {
  try {
    const quizzes = await Quiz.find({ userId: req.user.id });

    if (quizzes.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalQuizzes: 0,
          averageAccuracy: 0,
          totalPoints: 0,
          currentStreak: 0,
          totalQuestions: 0,
          totalCorrect: 0
        }
      });
    }

    const completedQuizzes = quizzes.filter(q => q.status === 'completed');
    const totalQuestions = completedQuizzes.reduce((sum, q) => sum + q.totalQuestions, 0);
    const totalCorrect = completedQuizzes.reduce((sum, q) => sum + q.correctAnswers, 0);
    const totalPoints = completedQuizzes.reduce((sum, q) => sum + q.points, 0);
    const averageAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // Calculate current streak (consecutive correct answers in recent quizzes)
    let currentStreak = 0;
    const recentQuizzes = completedQuizzes
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 10);

    for (const quiz of recentQuizzes) {
      if (quiz.accuracy >= 70) { // Consider 70%+ as a "good" quiz for streak
        currentStreak++;
      } else {
        break;
      }
    }

    res.json({
      success: true,
      stats: {
        totalQuizzes: completedQuizzes.length,
        averageAccuracy,
        totalPoints,
        currentStreak,
        totalQuestions,
        totalCorrect
      }
    });

  } catch (error) {
    console.error('Error getting quiz stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quiz statistics'
    });
  }
});

// Get recent quizzes for dashboard
router.get('/recent', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const recentQuizzes = await Quiz.find({
      userId: req.user.id,
      isCompleted: true
    })
      .sort({ completedAt: -1 })
      .limit(parseInt(limit))
      .select('category accuracy points completedAt timeSpent questionCount');

    res.json({
      success: true,
      data: recentQuizzes
    });
  } catch (error) {
    console.error('Error fetching recent quizzes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent quizzes'
    });
  }
});


// Debug endpoint to check quiz status
router.get('/:id/debug', asyncHandler(async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    const debugInfo = {
      quizId: quiz._id,
      title: quiz.title,
      status: quiz.status,
      totalQuestions: quiz.totalQuestions,
      actualQuestionCount: quiz.questions.length,
      currentQuestionIndex: quiz.currentQuestionIndex,
      accuracy: quiz.accuracy,
      correctAnswers: quiz.correctAnswers,
      timeLimit: quiz.timeLimit,
      startedAt: quiz.startedAt,
      completedAt: quiz.completedAt,
      isAdaptive: quiz.isAdaptive,
      roadmapType: quiz.roadmapType,
      difficulty: quiz.difficulty,
      questionsPreview: quiz.questions.slice(0, 3).map(q => ({
        questionId: q.questionId,
        question: q.question.substring(0, 100) + '...',
        optionsCount: q.options.length,
        hasCorrectAnswer: !!q.correctAnswer,
        status: q.status
      }))
    };

    res.json({
      success: true,
      data: debugInfo
    });

  } catch (error) {
    console.error('Error in quiz debug:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
}));


module.exports = router;