#!/usr/bin/env node

/**
 * Debug Live Quiz Issue
 * Create a test quiz and simulate the exact answer submission process
 */

const mongoose = require('mongoose');
const Quiz = require('./models/Quiz');
const Question = require('./models/Question');
const UserPerformance = require('./models/UserPerformance');
const { ObjectId } = require('mongoose').Types;

async function debugLiveQuiz() {
  console.log('🔍 Debugging Live Quiz Issue...\n');

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

    // Get a sample question from database
    const sampleQuestion = await Question.findOne({ 
      category: { $in: ['HTML'] }
    }).lean();

    if (!sampleQuestion) {
      console.log('❌ No sample question found');
      return;
    }

    console.log('\n📋 Sample Question from DB:');
    console.log(`   Question: ${sampleQuestion.content}`);
    console.log(`   Options: ${JSON.stringify(sampleQuestion.options)}`);
    console.log(`   Correct Answer: "${sampleQuestion.correctAnswer}"`);

    // Simulate the quiz creation process
    console.log('\n🔄 Simulating Quiz Creation...');
    
    // Handle both database and JSON question formats
    const isDbQuestion = sampleQuestion.content && sampleQuestion.correctAnswer;
    const questionText = isDbQuestion ? sampleQuestion.content : sampleQuestion.question;
    const correctAnswer = isDbQuestion ? sampleQuestion.correctAnswer : sampleQuestion.answer;
    const questionId = isDbQuestion ? sampleQuestion._id.toString() : sampleQuestion.questionId;
    const questionTopic = isDbQuestion ? (sampleQuestion.category[0] || 'frontend') : (sampleQuestion.topic || 'frontend');
    const questionDifficulty = isDbQuestion ? sampleQuestion.difficulty : sampleQuestion.difficulty;
    const questionExplanation = sampleQuestion.explanation || 'No explanation available';

    // Handle different answer formats for JSON questions
    let finalCorrectAnswer = correctAnswer;
    let shuffledOptions = [...sampleQuestion.options];

    if (!isDbQuestion && /^[A-D]$/.test(correctAnswer)) {
      // Handle letter-based answers (A, B, C, D) for JSON questions
      const matchingOption = sampleQuestion.options.find(option =>
        option.startsWith(correctAnswer + '.')
      );
      if (matchingOption) {
        finalCorrectAnswer = matchingOption;
      } else {
        // Fallback: Convert letter to index if no letter prefix found
        const letterIndex = correctAnswer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
        if (letterIndex >= 0 && letterIndex < sampleQuestion.options.length) {
          finalCorrectAnswer = sampleQuestion.options[letterIndex];
        }
      }
    }

    console.log(`   Final Correct Answer BEFORE shuffle: "${finalCorrectAnswer}"`);
    console.log(`   Options BEFORE shuffle: ${JSON.stringify(shuffledOptions)}`);

    // Shuffle the options (THIS MIGHT BE THE ISSUE!)
    shuffledOptions = shuffledOptions.sort(() => Math.random() - 0.5);

    console.log(`   Options AFTER shuffle: ${JSON.stringify(shuffledOptions)}`);
    console.log(`   Final Correct Answer AFTER shuffle: "${finalCorrectAnswer}"`);

    // Check if correct answer is still in shuffled options
    const correctAnswerInShuffled = shuffledOptions.includes(finalCorrectAnswer);
    console.log(`   Is correct answer in shuffled options? ${correctAnswerInShuffled ? '✅' : '❌'}`);

    if (!correctAnswerInShuffled) {
      console.log('   🚨 CRITICAL ISSUE: Correct answer not in shuffled options!');
      console.log('   This is the root cause of the problem.');
      return;
    }

    // Create the quiz question object (as it would be stored in the quiz)
    const quizQuestion = {
      questionId: questionId,
      question: questionText,
      options: shuffledOptions,
      correctAnswer: finalCorrectAnswer,
      originalAnswer: correctAnswer,
      topic: questionTopic,
      difficulty: questionDifficulty,
      explanation: questionExplanation,
      userAnswer: '',
      isCorrect: false,
      timeSpent: 0,
      status: 'unanswered'
    };

    // Create a test quiz
    const testQuiz = new Quiz({
      userId: testUserId,
      title: 'Debug Test Quiz',
      roadmapType: 'frontend',
      difficulty: 'medium',
      questions: [quizQuestion],
      totalQuestions: 1,
      timeLimit: 15,
      isAdaptive: false
    });

    await testQuiz.save();
    console.log(`\n✅ Test quiz created with ID: ${testQuiz._id}`);

    // Now simulate the answer submission process
    console.log('\n🎯 Simulating Answer Submission...');

    // Test Case 1: User selects the correct answer
    const userAnswer = finalCorrectAnswer;
    console.log(`   User selects: "${userAnswer}"`);

    // Simulate the exact backend validation logic
    const question = testQuiz.questions[0];
    question.userAnswer = userAnswer;

    console.log('\n=== ANSWER COMPARISON DEBUG ===');
    console.log('User answer:', JSON.stringify(userAnswer));
    console.log('User answer type:', typeof userAnswer);
    console.log('User answer length:', userAnswer ? userAnswer.length : 'null');
    console.log('Stored correctAnswer:', JSON.stringify(question.correctAnswer));
    console.log('Stored correctAnswer type:', typeof question.correctAnswer);
    console.log('Stored correctAnswer length:', question.correctAnswer ? question.correctAnswer.length : 'null');
    console.log('Original answer:', JSON.stringify(question.originalAnswer));
    console.log('Question options:', JSON.stringify(question.options));
    console.log('Strict equality (===):', userAnswer === question.correctAnswer);
    console.log('Loose equality (==):', userAnswer == question.correctAnswer);
    console.log('Trimmed comparison:', userAnswer?.trim() === question.correctAnswer?.trim());

    // Enhanced answer validation with multiple checks
    let isAnswerCorrect = false;
    
    if (userAnswer && question.correctAnswer) {
      // Try exact match first
      if (userAnswer === question.correctAnswer) {
        isAnswerCorrect = true;
        console.log('✅ Match: Exact string match');
      }
      // Try trimmed match
      else if (userAnswer.trim() === question.correctAnswer.trim()) {
        isAnswerCorrect = true;
        console.log('✅ Match: Trimmed string match');
      }
      // Try case-insensitive match
      else if (userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()) {
        isAnswerCorrect = true;
        console.log('✅ Match: Case-insensitive match');
      }
      // Check if user answer is in the options and matches correct answer
      else if (question.options.includes(userAnswer) && question.options.includes(question.correctAnswer)) {
        const userIndex = question.options.indexOf(userAnswer);
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

    // Test with all options
    console.log('\n🧪 Testing All Options:');
    question.options.forEach((option, index) => {
      const testResult = option === question.correctAnswer;
      console.log(`   Option ${index + 1}: "${option}" = ${testResult ? '✅ CORRECT' : '❌ INCORRECT'}`);
    });

    // Clean up
    await Quiz.deleteOne({ _id: testQuiz._id });
    await UserPerformance.deleteOne({ _id: userPerformance._id });
    console.log('\n🧹 Cleaned up test data');

  } catch (error) {
    console.error('❌ Error in debug:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugLiveQuiz();