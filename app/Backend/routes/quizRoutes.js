const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const QuestionHistory = require('../models/QuestionHistory');
const UserPerformance = require('../models/UserPerformance');
const fs = require('fs').promises;
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');

// Create a new quiz session with intelligent question selection
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { roadmapType, difficulty, questionCount = 20, timeLimit = 30, adaptiveDifficulty = false } = req.body;
    
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
    
    // Map roadmap names to question files
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
    
    const questionFile = roadmapMapping[roadmapType] || 'frontend';
    const questionsPath = path.join(__dirname, '../Questions', `${questionFile}.json`);
    const questionsData = await fs.readFile(questionsPath, 'utf8');
    const { questions: allQuestions } = JSON.parse(questionsData);
    
    // Determine effective difficulty based on adaptive settings
    let effectiveDifficulty = difficulty;
    if (adaptiveDifficulty && userPerformance.overallStats.totalQuestions > 10) {
      effectiveDifficulty = userPerformance.adaptiveSettings.currentDifficultyLevel;
    }
    
    // Smart question filtering with time-based freshness
    const now = new Date();
    const daysSinceAttempt = (questionId) => {
      const history = questionHistory.find(h => h.questionId === questionId);
      if (!history) return Infinity;
      return (now - new Date(history.lastAttempted)) / (1000 * 60 * 60 * 24);
    };
    
    let availableQuestions = allQuestions.filter(q => {
      // Allow questions attempted more than 7 days ago
      const daysSince = daysSinceAttempt(q.questionId);
      if (attemptedQuestionIds.has(q.questionId) && daysSince < 7) return false;
      
      // Filter by difficulty
      if (effectiveDifficulty !== 'mixed') {
        return q.difficulty === effectiveDifficulty;
      }
      return true;
    });
    
    // If not enough fresh questions, include some previously attempted ones
    if (availableQuestions.length < questionCount) {
      const additionalQuestions = allQuestions.filter(q => {
        if (effectiveDifficulty !== 'mixed') {
          return q.difficulty === effectiveDifficulty && attemptedQuestionIds.has(q.questionId);
        }
        return attemptedQuestionIds.has(q.questionId);
      });
      
      availableQuestions = [...availableQuestions, ...additionalQuestions];
    }
    
    // Enhanced prioritization with spaced repetition
    const prioritizeQuestions = (questions) => {
      return questions.map(q => {
        let priority = 1;
        const history = questionHistory.find(h => h.questionId === q.questionId);
        
        // Higher priority for incorrect answers (spaced repetition)
        if (history && !history.isCorrect) {
          const daysSince = daysSinceAttempt(q.questionId);
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
      .map(q => ({
        questionId: q.questionId,
        question: q.question,
        options: [...q.options].sort(() => Math.random() - 0.5), // Shuffle options
        correctAnswer: q.answer,
        topic: q.topic,
        difficulty: q.difficulty,
        explanation: q.explanation,
        userAnswer: '',
        isCorrect: false,
        timeSpent: 0,
        status: 'unanswered'
      }));
    
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
    
    await quiz.save();
    
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
      message: 'Failed to create quiz'
    });
  }
});

// Get quiz by ID
router.get('/:id', authMiddleware, async (req, res) => {
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
});

// Update quiz answer with intelligent tracking and adaptive difficulty
router.put('/:id/answer', authMiddleware, async (req, res) => {
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
      question.isCorrect = answer === question.correctAnswer;
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
});

// Replace a question with adaptive difficulty question
router.put('/:id/replace-question', authMiddleware, async (req, res) => {
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
      quiz.questions[questionIndex] = {
        questionId: selectedQuestion.questionId,
        question: selectedQuestion.question,
        options: [...selectedQuestion.options].sort(() => Math.random() - 0.5),
        correctAnswer: selectedQuestion.answer,
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
router.get('/:id/next-question', authMiddleware, async (req, res) => {
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
      const adaptiveQuestion = {
        questionId: randomQuestion.questionId,
        question: randomQuestion.question,
        options: [...randomQuestion.options].sort(() => Math.random() - 0.5),
        correctAnswer: randomQuestion.answer,
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
    const adaptiveQuestion = {
      questionId: selectedQuestion.questionId,
      question: selectedQuestion.question,
      options: [...selectedQuestion.options].sort(() => Math.random() - 0.5),
      correctAnswer: selectedQuestion.answer,
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
router.put('/:id/skip', authMiddleware, async (req, res) => {
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
router.put('/:id/complete', authMiddleware, async (req, res) => {
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
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 10, status } = req.query;
    
    const query = { userId: req.user.id };
    if (status) {
      query.status = status;
    }
    
    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-questions.explanation'); // Exclude explanations for list view
    
    res.json({
      success: true,
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
router.get('/preview', authMiddleware, async (req, res) => {
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
router.get('/recommendations', authMiddleware, async (req, res) => {
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
router.get('/stats/:roadmapType', authMiddleware, async (req, res) => {
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
router.get('/insights/:roadmapType', authMiddleware, async (req, res) => {
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
router.get('/stats', authMiddleware, async (req, res) => {
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
router.get('/recent', authMiddleware, async (req, res) => {
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

module.exports = router;