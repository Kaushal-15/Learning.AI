#!/usr/bin/env node

/**
 * Test Answer Validation Issue
 * Reproduce the answer validation problem
 */

const mongoose = require('mongoose');
const Question = require('./models/Question');

async function testAnswerValidation() {
  console.log('🔍 Testing Answer Validation Issue...\n');

  try {
    await mongoose.connect('mongodb://localhost:27017/learning-ai');
    console.log('✅ Connected to MongoDB');

    // Get a sample question from database
    const sampleQuestion = await Question.findOne({ 
      category: { $in: ['HTML'] }
    }).lean();

    if (!sampleQuestion) {
      console.log('❌ No sample question found');
      return;
    }

    console.log('📋 Original Question:');
    console.log(`   Question: ${sampleQuestion.content}`);
    console.log(`   Options: ${JSON.stringify(sampleQuestion.options)}`);
    console.log(`   Correct Answer: ${sampleQuestion.correctAnswer}`);

    // Simulate the quiz creation logic
    console.log('\n🔄 Simulating Quiz Creation Logic:');
    
    const isDbQuestion = sampleQuestion.content && sampleQuestion.correctAnswer;
    const questionText = isDbQuestion ? sampleQuestion.content : sampleQuestion.question;
    const correctAnswer = isDbQuestion ? sampleQuestion.correctAnswer : sampleQuestion.answer;
    
    console.log(`   Is DB Question: ${isDbQuestion}`);
    console.log(`   Extracted Correct Answer: ${correctAnswer}`);
    
    // Handle different answer formats for JSON questions
    let finalCorrectAnswer = correctAnswer;
    let shuffledOptions = [...sampleQuestion.options];

    if (!isDbQuestion && /^[A-D]$/.test(correctAnswer)) {
      console.log('   Processing letter-based answer...');
      const matchingOption = sampleQuestion.options.find(option =>
        option.startsWith(correctAnswer + '.')
      );
      if (matchingOption) {
        finalCorrectAnswer = matchingOption;
        console.log(`   Found matching option: ${matchingOption}`);
      } else {
        const letterIndex = correctAnswer.charCodeAt(0) - 65;
        if (letterIndex >= 0 && letterIndex < sampleQuestion.options.length) {
          finalCorrectAnswer = sampleQuestion.options[letterIndex];
          console.log(`   Using index-based option: ${finalCorrectAnswer}`);
        }
      }
    }

    console.log(`   Final Correct Answer BEFORE shuffle: ${finalCorrectAnswer}`);
    console.log(`   Options BEFORE shuffle: ${JSON.stringify(shuffledOptions)}`);

    // ⚠️ THIS IS THE PROBLEM: Shuffle the options AFTER setting correct answer
    shuffledOptions = shuffledOptions.sort(() => Math.random() - 0.5);

    console.log(`   Options AFTER shuffle: ${JSON.stringify(shuffledOptions)}`);
    console.log(`   Final Correct Answer AFTER shuffle: ${finalCorrectAnswer}`);

    // Check if correct answer is still in shuffled options
    const isCorrectAnswerInOptions = shuffledOptions.includes(finalCorrectAnswer);
    console.log(`   Is correct answer still in shuffled options? ${isCorrectAnswerInOptions}`);

    if (!isCorrectAnswerInOptions) {
      console.log('   ❌ PROBLEM: Correct answer not found in shuffled options!');
    }

    // Simulate user selecting the correct answer
    console.log('\n🎯 Simulating Answer Validation:');
    const userAnswer = finalCorrectAnswer; // User selects what should be correct
    const isAnswerCorrect = userAnswer === finalCorrectAnswer;
    
    console.log(`   User Answer: ${userAnswer}`);
    console.log(`   Stored Correct Answer: ${finalCorrectAnswer}`);
    console.log(`   Validation Result: ${isAnswerCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);

    // Test with shuffled option
    if (shuffledOptions.length > 0) {
      const userAnswerShuffled = shuffledOptions[0]; // User clicks first option
      const isShuffledCorrect = userAnswerShuffled === finalCorrectAnswer;
      
      console.log(`\n   If user clicks first shuffled option: ${userAnswerShuffled}`);
      console.log(`   Would it be correct? ${isShuffledCorrect ? '✅ YES' : '❌ NO'}`);
    }

  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testAnswerValidation();