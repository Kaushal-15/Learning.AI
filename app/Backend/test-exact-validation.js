#!/usr/bin/env node

/**
 * Test Exact Answer Validation
 * Simulate the exact backend validation process
 */

const mongoose = require('mongoose');
const Quiz = require('./models/Quiz');
const Question = require('./models/Question');

async function testExactValidation() {
  console.log('🔍 Testing Exact Answer Validation...\n');

  try {
    await mongoose.connect('mongodb://localhost:27017/learning-ai');
    console.log('✅ Connected to MongoDB');

    // Find a recent quiz to test with
    const recentQuiz = await Quiz.findOne().sort({ createdAt: -1 });
    
    if (!recentQuiz) {
      console.log('❌ No quiz found in database');
      return;
    }

    console.log(`📋 Testing with Quiz ID: ${recentQuiz._id}`);
    console.log(`   Title: ${recentQuiz.title}`);
    console.log(`   Questions: ${recentQuiz.questions.length}`);

    if (recentQuiz.questions.length === 0) {
      console.log('❌ Quiz has no questions');
      return;
    }

    // Test the first question
    const question = recentQuiz.questions[0];
    console.log('\n📝 First Question:');
    console.log(`   Question: ${question.question}`);
    console.log(`   Options: ${JSON.stringify(question.options)}`);
    console.log(`   Correct Answer: "${question.correctAnswer}"`);
    console.log(`   Original Answer: "${question.originalAnswer}"`);

    // Test different answer scenarios
    console.log('\n🧪 Testing Answer Scenarios:');

    // Scenario 1: User selects the exact correct answer
    const exactAnswer = question.correctAnswer;
    const isExactCorrect = exactAnswer === question.correctAnswer;
    console.log(`   1. Exact match: "${exactAnswer}" === "${question.correctAnswer}" = ${isExactCorrect ? '✅' : '❌'}`);

    // Scenario 2: User selects first option
    if (question.options.length > 0) {
      const firstOption = question.options[0];
      const isFirstCorrect = firstOption === question.correctAnswer;
      console.log(`   2. First option: "${firstOption}" === "${question.correctAnswer}" = ${isFirstCorrect ? '✅' : '❌'}`);
    }

    // Scenario 3: Check if correct answer exists in options
    const correctAnswerInOptions = question.options.includes(question.correctAnswer);
    console.log(`   3. Correct answer in options: ${correctAnswerInOptions ? '✅' : '❌'}`);

    if (!correctAnswerInOptions) {
      console.log('   ⚠️  ISSUE: Correct answer not found in options!');
      console.log('   This means the quiz creation logic has a bug.');
    }

    // Scenario 4: Test with trimmed/cleaned answers
    const trimmedCorrect = question.correctAnswer.trim();
    const trimmedOptions = question.options.map(opt => opt.trim());
    const trimmedMatch = trimmedOptions.includes(trimmedCorrect);
    console.log(`   4. Trimmed match: ${trimmedMatch ? '✅' : '❌'}`);

    // Scenario 5: Case-insensitive match
    const lowerCorrect = question.correctAnswer.toLowerCase();
    const lowerOptions = question.options.map(opt => opt.toLowerCase());
    const caseInsensitiveMatch = lowerOptions.includes(lowerCorrect);
    console.log(`   5. Case-insensitive match: ${caseInsensitiveMatch ? '✅' : '❌'}`);

    // Show character codes for debugging
    console.log('\n🔍 Character Analysis:');
    console.log(`   Correct answer length: ${question.correctAnswer.length}`);
    console.log(`   Correct answer char codes: ${Array.from(question.correctAnswer).map(c => c.charCodeAt(0))}`);
    
    if (question.options.length > 0) {
      const firstOpt = question.options[0];
      console.log(`   First option length: ${firstOpt.length}`);
      console.log(`   First option char codes: ${Array.from(firstOpt).map(c => c.charCodeAt(0))}`);
    }

    // Test the actual validation logic from the backend
    console.log('\n🎯 Backend Validation Simulation:');
    
    // Simulate the exact logic from quizRoutes.js
    const userAnswer = question.correctAnswer; // User selects what should be correct
    question.userAnswer = userAnswer;
    
    console.log('=== ANSWER COMPARISON DEBUG ===');
    console.log('User answer:', userAnswer);
    console.log('Stored correctAnswer:', question.correctAnswer);
    console.log('Original answer:', question.originalAnswer);
    console.log('Question options:', question.options);
    
    const validationResult = userAnswer === question.correctAnswer;
    question.isCorrect = validationResult;
    
    console.log(`Final validation result: ${validationResult ? '✅ CORRECT' : '❌ INCORRECT'}`);

    if (!validationResult && userAnswer === question.correctAnswer) {
      console.log('🚨 CRITICAL BUG: Identical strings not matching!');
      console.log('This suggests a JavaScript comparison issue.');
    }

  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testExactValidation();