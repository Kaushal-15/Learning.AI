#!/usr/bin/env node

/**
 * Test Backend Response
 * Create a quiz and test the actual API response
 */

const mongoose = require('mongoose');
const Quiz = require('./models/Quiz');
const Question = require('./models/Question');
const UserPerformance = require('./models/UserPerformance');
const { ObjectId } = require('mongoose').Types;

async function testBackendResponse() {
  console.log('🔍 Testing Backend API Response...\n');

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

    // Get a sample question
    const sampleQuestion = await Question.findOne({ 
      category: { $in: ['HTML'] }
    }).lean();

    if (!sampleQuestion) {
      console.log('❌ No sample question found');
      return;
    }

    // Create a simple quiz question
    const quizQuestion = {
      questionId: sampleQuestion._id.toString(),
      question: sampleQuestion.content,
      options: [...sampleQuestion.options], // Don't shuffle for testing
      correctAnswer: sampleQuestion.correctAnswer,
      originalAnswer: sampleQuestion.correctAnswer,
      topic: sampleQuestion.category[0],
      difficulty: sampleQuestion.difficulty,
      explanation: sampleQuestion.explanation,
      userAnswer: '',
      isCorrect: false,
      timeSpent: 0,
      status: 'unanswered'
    };

    console.log('\n📋 Test Question:');
    console.log(`   Question: ${quizQuestion.question}`);
    console.log(`   Options: ${JSON.stringify(quizQuestion.options)}`);
    console.log(`   Correct Answer: "${quizQuestion.correctAnswer}"`);

    // Create a test quiz
    const testQuiz = new Quiz({
      userId: testUserId,
      title: 'Backend Response Test Quiz',
      roadmapType: 'frontend',
      difficulty: 'medium',
      questions: [quizQuestion],
      totalQuestions: 1,
      timeLimit: 15,
      isAdaptive: false
    });

    await testQuiz.save();
    console.log(`\n✅ Test quiz created with ID: ${testQuiz._id}`);

    // Test the answer submission logic directly
    console.log('\n🎯 Testing Answer Submission Logic...');

    const questionIndex = 0;
    const userAnswer = quizQuestion.correctAnswer; // User selects correct answer
    const timeSpent = 5;

    console.log(`   Submitting answer: "${userAnswer}"`);

    // Simulate the exact backend logic from quizRoutes.js
    const quiz = await Quiz.findOne({
      _id: testQuiz._id,
      userId: testUserId
    });

    if (quiz && questionIndex >= 0 && questionIndex < quiz.questions.length) {
      const question = quiz.questions[questionIndex];
      question.userAnswer = userAnswer;

      console.log('\n=== BACKEND VALIDATION ===');
      console.log('User answer:', JSON.stringify(userAnswer));
      console.log('Stored correctAnswer:', JSON.stringify(question.correctAnswer));
      console.log('Strict equality (===):', userAnswer === question.correctAnswer);

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
      question.timeSpent = timeSpent;
      question.status = 'answered';

      console.log(`Question isCorrect set to: ${question.isCorrect}`);

      // Update quiz statistics
      quiz.updateStats();
      console.log(`Quiz stats after update:`);
      console.log(`   correctAnswers: ${quiz.correctAnswers}`);
      console.log(`   accuracy: ${quiz.accuracy}%`);
      console.log(`   points: ${quiz.points}`);

      // Save the quiz
      await quiz.save();
      console.log('✅ Quiz saved to database');

      // Fetch the quiz again to verify it was saved correctly
      const savedQuiz = await Quiz.findById(testQuiz._id);
      console.log('\n📊 Verification - Quiz from database:');
      console.log(`   correctAnswers: ${savedQuiz.correctAnswers}`);
      console.log(`   accuracy: ${savedQuiz.accuracy}%`);
      console.log(`   points: ${savedQuiz.points}`);
      console.log(`   Question 0 isCorrect: ${savedQuiz.questions[0].isCorrect}`);
      console.log(`   Question 0 status: ${savedQuiz.questions[0].status}`);
      console.log(`   Question 0 userAnswer: "${savedQuiz.questions[0].userAnswer}"`);

      // Test what the API would return
      console.log('\n📤 API Response would be:');
      const apiResponse = {
        success: true,
        data: savedQuiz
      };
      console.log(`   success: ${apiResponse.success}`);
      console.log(`   data.correctAnswers: ${apiResponse.data.correctAnswers}`);
      console.log(`   data.accuracy: ${apiResponse.data.accuracy}`);
      console.log(`   data.questions[0].isCorrect: ${apiResponse.data.questions[0].isCorrect}`);

      if (apiResponse.data.correctAnswers === 0 && apiResponse.data.questions[0].isCorrect === true) {
        console.log('\n🚨 INCONSISTENCY DETECTED!');
        console.log('   Question is marked correct but correctAnswers is 0');
        console.log('   This suggests an issue with updateStats() method');
      }

    }

    // Clean up
    await Quiz.deleteOne({ _id: testQuiz._id });
    await UserPerformance.deleteOne({ _id: userPerformance._id });
    console.log('\n🧹 Cleaned up test data');

  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testBackendResponse();