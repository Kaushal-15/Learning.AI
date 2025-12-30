#!/usr/bin/env node

/**
 * Debug Real Quiz Issue
 * Check what's actually happening with the current quiz
 */

const mongoose = require('mongoose');
const Quiz = require('./models/Quiz');

async function debugRealQuiz() {
  console.log('🔍 Debugging Real Quiz Issue...\n');

  try {
    await mongoose.connect('mongodb://localhost:27017/learning-ai');
    console.log('✅ Connected to MongoDB');

    // Find the most recent quiz
    const recentQuiz = await Quiz.findOne().sort({ createdAt: -1 });
    
    if (!recentQuiz) {
      console.log('❌ No quiz found in database');
      return;
    }

    console.log(`📋 Most Recent Quiz:`);
    console.log(`   ID: ${recentQuiz._id}`);
    console.log(`   Title: ${recentQuiz.title}`);
    console.log(`   Created: ${recentQuiz.createdAt}`);
    console.log(`   Status: ${recentQuiz.status}`);
    console.log(`   Questions: ${recentQuiz.questions.length}`);
    console.log(`   Correct Answers: ${recentQuiz.correctAnswers}`);
    console.log(`   Accuracy: ${recentQuiz.accuracy}%`);

    if (recentQuiz.questions.length > 0) {
      console.log('\n📝 First Few Questions:');
      
      recentQuiz.questions.slice(0, 3).forEach((q, index) => {
        console.log(`\n   Question ${index + 1}:`);
        console.log(`     Text: ${q.question.substring(0, 60)}...`);
        console.log(`     Options: ${JSON.stringify(q.options)}`);
        console.log(`     Correct Answer: "${q.correctAnswer}"`);
        console.log(`     User Answer: "${q.userAnswer}"`);
        console.log(`     Is Correct: ${q.isCorrect}`);
        console.log(`     Status: ${q.status}`);
        
        // Check if this question has the old format
        const hasLetterPrefixes = q.options.some(opt => /^[A-D]\.\s/.test(opt));
        if (hasLetterPrefixes) {
          console.log(`     ⚠️  WARNING: This question still has letter prefixes!`);
        }
        
        // Check if correct answer is in options
        const correctInOptions = q.options.includes(q.correctAnswer);
        if (!correctInOptions) {
          console.log(`     🚨 CRITICAL: Correct answer not found in options!`);
        }
        
        // If user answered, check the comparison
        if (q.userAnswer) {
          console.log(`     🔍 Answer Comparison:`);
          console.log(`       User: "${q.userAnswer}" (length: ${q.userAnswer.length})`);
          console.log(`       Correct: "${q.correctAnswer}" (length: ${q.correctAnswer.length})`);
          console.log(`       Exact match: ${q.userAnswer === q.correctAnswer}`);
          console.log(`       Trimmed match: ${q.userAnswer.trim() === q.correctAnswer.trim()}`);
          console.log(`       Case insensitive: ${q.userAnswer.toLowerCase() === q.correctAnswer.toLowerCase()}`);
          
          // Character by character comparison
          if (q.userAnswer !== q.correctAnswer) {
            console.log(`       Character codes:`);
            console.log(`         User: [${Array.from(q.userAnswer).map(c => c.charCodeAt(0)).join(', ')}]`);
            console.log(`         Correct: [${Array.from(q.correctAnswer).map(c => c.charCodeAt(0)).join(', ')}]`);
          }
        }
      });
    }

    // Check if there are any answered questions
    const answeredQuestions = recentQuiz.questions.filter(q => q.status === 'answered');
    console.log(`\n📊 Answered Questions: ${answeredQuestions.length}`);
    
    if (answeredQuestions.length > 0) {
      const correctAnswers = answeredQuestions.filter(q => q.isCorrect);
      console.log(`   Correct: ${correctAnswers.length}`);
      console.log(`   Incorrect: ${answeredQuestions.length - correctAnswers.length}`);
      
      // Show a few incorrect answers for analysis
      const incorrectAnswers = answeredQuestions.filter(q => !q.isCorrect);
      if (incorrectAnswers.length > 0) {
        console.log(`\n❌ Sample Incorrect Answers:`);
        incorrectAnswers.slice(0, 2).forEach((q, index) => {
          console.log(`   ${index + 1}. "${q.question.substring(0, 40)}..."`);
          console.log(`      User answered: "${q.userAnswer}"`);
          console.log(`      Correct answer: "${q.correctAnswer}"`);
          console.log(`      Options: ${JSON.stringify(q.options)}`);
          console.log(`      User answer in options: ${q.options.includes(q.userAnswer)}`);
          console.log(`      Correct answer in options: ${q.options.includes(q.correctAnswer)}`);
        });
      }
    }

    // Check if this quiz was created before or after our fix
    const fixTime = new Date('2024-12-19T15:00:00Z'); // Approximate time of our fix
    const wasCreatedAfterFix = recentQuiz.createdAt > fixTime;
    console.log(`\n🕐 Quiz created after fix: ${wasCreatedAfterFix}`);
    
    if (!wasCreatedAfterFix) {
      console.log(`   ⚠️  This quiz was created BEFORE the fix!`);
      console.log(`   The questions in this quiz still have the old format.`);
      console.log(`   You need to create a NEW quiz to see the fix.`);
    }

  } catch (error) {
    console.error('❌ Error in debug:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugRealQuiz();