#!/usr/bin/env node

/**
 * Fix Question Format
 * Remove letter prefixes from question options and answers
 */

const mongoose = require('mongoose');
const Question = require('./models/Question');

async function fixQuestionFormat() {
  console.log('🔧 Fixing Question Format...\n');

  try {
    await mongoose.connect('mongodb://localhost:27017/learning-ai');
    console.log('✅ Connected to MongoDB');

    // Find all questions with letter-prefixed options
    const questionsWithPrefixes = await Question.find({
      $or: [
        { 'options.0': { $regex: /^[A-D]\.\s/ } },
        { correctAnswer: { $regex: /^[A-D]\.\s/ } }
      ]
    });

    console.log(`📊 Found ${questionsWithPrefixes.length} questions with letter prefixes`);

    let fixedCount = 0;

    for (const question of questionsWithPrefixes) {
      console.log(`\n🔧 Fixing question: ${question.content.substring(0, 50)}...`);
      console.log(`   Original options: ${JSON.stringify(question.options)}`);
      console.log(`   Original correct answer: "${question.correctAnswer}"`);

      // Remove letter prefixes from options
      const cleanOptions = question.options.map(option => {
        if (typeof option === 'string' && /^[A-D]\.\s/.test(option)) {
          return option.replace(/^[A-D]\.\s/, '');
        }
        return option;
      });

      // Remove letter prefix from correct answer
      let cleanCorrectAnswer = question.correctAnswer;
      if (typeof cleanCorrectAnswer === 'string' && /^[A-D]\.\s/.test(cleanCorrectAnswer)) {
        cleanCorrectAnswer = cleanCorrectAnswer.replace(/^[A-D]\.\s/, '');
      }

      console.log(`   Clean options: ${JSON.stringify(cleanOptions)}`);
      console.log(`   Clean correct answer: "${cleanCorrectAnswer}"`);

      // Verify that the clean correct answer exists in clean options
      if (!cleanOptions.includes(cleanCorrectAnswer)) {
        console.log(`   ⚠️  Warning: Clean correct answer not found in clean options!`);
        console.log(`   Skipping this question to avoid data corruption.`);
        continue;
      }

      // Update the question
      question.options = cleanOptions;
      question.correctAnswer = cleanCorrectAnswer;

      try {
        await question.save();
        console.log(`   ✅ Fixed and saved`);
        fixedCount++;
      } catch (saveError) {
        console.log(`   ❌ Error saving: ${saveError.message}`);
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} questions`);

    // Verify the fix
    console.log('\n🔍 Verifying fixes...');
    const cssQuestion = await Question.findOne({ 
      content: { $regex: /width.*element/i }
    });
    
    if (cssQuestion) {
      console.log('CSS Width Question after fix:');
      console.log('  Options:', JSON.stringify(cssQuestion.options));
      console.log('  Correct Answer:', JSON.stringify(cssQuestion.correctAnswer));
    }

    // Check for any remaining prefixed questions
    const remainingPrefixed = await Question.countDocuments({
      $or: [
        { 'options.0': { $regex: /^[A-D]\.\s/ } },
        { correctAnswer: { $regex: /^[A-D]\.\s/ } }
      ]
    });

    console.log(`\n📊 Remaining questions with prefixes: ${remainingPrefixed}`);

    if (remainingPrefixed === 0) {
      console.log('🎉 All questions fixed successfully!');
    }

  } catch (error) {
    console.error('❌ Error fixing questions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixQuestionFormat();