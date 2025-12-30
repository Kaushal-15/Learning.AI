#!/usr/bin/env node

/**
 * Test Current Quiz Creation
 * Check what happens when we create a quiz right now
 */

const mongoose = require('mongoose');
const Quiz = require('./models/Quiz');
const Question = require('./models/Question');
const UserPerformance = require('./models/UserPerformance');
const { ObjectId } = require('mongoose').Types;

async function testCurrentQuizCreation() {
  console.log('🔍 Testing Current Quiz Creation...\n');

  try {
    await mongoose.connect('mongodb://localhost:27017/learning-ai');
    console.log('✅ Connected to MongoDB');

    // Create a test user
    const testUserId = new ObjectId();
    console.log(`👤 Test User ID: ${testUserId}`);

    // Create user performance record
    const userPerformance = new UserPerformance({
      userId: testUserId,
      roadmapType: 'frontend'
    });
    await userPerformance.save();

    // Simulate the exact quiz creation process from quizRoutes.js
    const roadmapType = 'frontend';
    const difficulty = 'medium';
    const questionCount = 3; // Just test with 3 questions
    const timeLimit = 15;
    const adaptiveDifficulty = false;
    const topic = null; // No topic filter

    console.log('\n🔄 Simulating Quiz Creation Process...');

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
    console.log(`🎯 Relevant categories: ${relevantCategories.join(', ')}`);

    // Fetch questions from database using categories
    let allQuestions = await Question.find({ 
      category: { $in: relevantCategories }
    }).lean();

    console.log(`📊 Found ${allQuestions.length} questions in database`);

    if (allQuestions.length === 0) {
      console.log('❌ No questions found!');
      return;
    }

    // Show first few questions from database
    console.log('\n📝 Sample Questions from Database:');
    allQuestions.slice(0, 2).forEach((q, index) => {
      console.log(`   ${index + 1}. "${q.content.substring(0, 50)}..."`);
      console.log(`      Options: ${JSON.stringify(q.options)}`);
      console.log(`      Correct Answer: "${q.correctAnswer}"`);
      
      // Check if this question still has letter prefixes
      const hasLetterPrefixes = q.options.some(opt => /^[A-D]\.\s/.test(opt));
      if (hasLetterPrefixes) {
        console.log(`      ⚠️  WARNING: Question still has letter prefixes!`);
      }
    });

    // Convert difficulty to numeric range
    const getDifficultyRange = (diff) => {
      if (diff === 'easy') return { min: 1, max: 5 };
      if (diff === 'medium') return { min: 3, max: 8 };
      if (diff === 'hard') return { min: 6, max: 10 };
      if (diff === 'mixed') return { min: 1, max: 10 };
      return { min: 1, max: 10 };
    };

    const difficultyRange = getDifficultyRange(difficulty);
    console.log(`\n🎚️ Difficulty range: ${difficulty} (${difficultyRange.min}-${difficultyRange.max})`);

    // Filter questions
    let availableQuestions = allQuestions.filter(q => {
      const qDifficulty = typeof q.difficulty === 'number' ? q.difficulty : 
                         (q.difficulty === 'easy' ? 3 : q.difficulty === 'medium' ? 6 : 9);
      
      return qDifficulty >= difficultyRange.min && qDifficulty <= difficultyRange.max;
    });

    console.log(`📊 Available questions after filtering: ${availableQuestions.length}`);

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

        console.log(`\n🔧 Processing Question: "${questionText.substring(0, 40)}..."`);
        console.log(`   Original options: ${JSON.stringify(q.options)}`);
        console.log(`   Original correct answer: "${correctAnswer}"`);
        console.log(`   Final correct answer: "${finalCorrectAnswer}"`);
        console.log(`   Is DB question: ${isDbQuestion}`);

        // Shuffle the options
        shuffledOptions = shuffledOptions.sort(() => Math.random() - 0.5);
        console.log(`   Shuffled options: ${JSON.stringify(shuffledOptions)}`);

        // Check if final correct answer is in shuffled options
        const correctInShuffled = shuffledOptions.includes(finalCorrectAnswer);
        console.log(`   Correct answer in shuffled options: ${correctInShuffled ? '✅' : '❌'}`);

        if (!correctInShuffled) {
          console.log(`   🚨 CRITICAL ISSUE: Correct answer not in options after shuffle!`);
        }

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

    console.log(`\n✅ Created ${shuffledQuestions.length} quiz questions`);

    // Test answer validation on the first question
    if (shuffledQuestions.length > 0) {
      const testQuestion = shuffledQuestions[0];
      console.log(`\n🧪 Testing Answer Validation on First Question:`);
      console.log(`   Question: "${testQuestion.question.substring(0, 50)}..."`);
      console.log(`   Options: ${JSON.stringify(testQuestion.options)}`);
      console.log(`   Correct Answer: "${testQuestion.correctAnswer}"`);

      // Simulate user selecting the correct answer
      const userAnswer = testQuestion.correctAnswer;
      console.log(`   User selects: "${userAnswer}"`);

      // Test the validation logic
      let isAnswerCorrect = false;
      
      if (userAnswer && testQuestion.correctAnswer) {
        // Try exact match first
        if (userAnswer === testQuestion.correctAnswer) {
          isAnswerCorrect = true;
          console.log('   ✅ Match: Exact string match');
        }
        // Try trimmed match
        else if (userAnswer.trim() === testQuestion.correctAnswer.trim()) {
          isAnswerCorrect = true;
          console.log('   ✅ Match: Trimmed string match');
        }
        // Try case-insensitive match
        else if (userAnswer.toLowerCase().trim() === testQuestion.correctAnswer.toLowerCase().trim()) {
          isAnswerCorrect = true;
          console.log('   ✅ Match: Case-insensitive match');
        }
        // Check if user answer is in the options and matches correct answer
        else if (testQuestion.options.includes(userAnswer) && testQuestion.options.includes(testQuestion.correctAnswer)) {
          const userIndex = testQuestion.options.indexOf(userAnswer);
          const correctIndex = testQuestion.options.indexOf(testQuestion.correctAnswer);
          if (userIndex === correctIndex) {
            isAnswerCorrect = true;
            console.log('   ✅ Match: Same option index');
          }
        }
      }
      
      console.log(`   Final validation result: ${isAnswerCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);

      if (!isAnswerCorrect) {
        console.log(`   🚨 VALIDATION FAILED! This explains why all answers show as wrong.`);
      }
    }

    // Clean up
    await UserPerformance.deleteOne({ _id: userPerformance._id });
    console.log('\n🧹 Cleaned up test data');

  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testCurrentQuizCreation();