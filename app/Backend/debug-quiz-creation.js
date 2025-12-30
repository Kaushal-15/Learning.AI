#!/usr/bin/env node

/**
 * Debug Quiz Creation
 * Test the exact quiz creation flow to identify the issue
 */

const mongoose = require('mongoose');
const Question = require('./models/Question');

async function debugQuizCreation() {
  console.log('🔍 Debugging Quiz Creation Flow...\n');

  try {
    await mongoose.connect('mongodb://localhost:27017/learning-ai');
    console.log('✅ Connected to MongoDB');

    // Test the exact same logic as in quizRoutes.js
    const roadmapType = 'frontend';
    
    console.log(`\n1. Testing roadmapType: ${roadmapType}`);
    
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
    console.log(`2. Relevant categories: ${relevantCategories.join(', ')}`);

    // Fetch questions from database using categories
    console.log(`\n3. Fetching questions for categories: ${relevantCategories.join(', ')}`);
    
    let allQuestions = await Question.find({ 
      category: { $in: relevantCategories }
    }).lean();

    console.log(`4. Found ${allQuestions.length} questions in database for ${roadmapType}`);
    
    if (allQuestions.length > 0) {
      console.log('\n5. Sample questions:');
      allQuestions.slice(0, 3).forEach((q, i) => {
        console.log(`   ${i+1}. "${q.content.substring(0, 50)}..."`);
        console.log(`      Categories: ${q.category.join(', ')}`);
        console.log(`      Difficulty: ${q.difficulty}`);
        console.log(`      Options: ${q.options.length}`);
      });
    }

    // Test difficulty filtering
    const difficulty = 'medium';
    const getDifficultyRange = (diff) => {
      if (diff === 'easy') return { min: 1, max: 4 };
      if (diff === 'medium') return { min: 4, max: 7 };
      if (diff === 'hard') return { min: 7, max: 10 };
      if (diff === 'mixed') return { min: 1, max: 10 };
      return { min: 1, max: 10 };
    };

    const difficultyRange = getDifficultyRange(difficulty);
    console.log(`\n6. Testing difficulty filtering: ${difficulty} (${difficultyRange.min}-${difficultyRange.max})`);

    let availableQuestions = allQuestions.filter(q => {
      const qDifficulty = typeof q.difficulty === 'number' ? q.difficulty : 
                         (q.difficulty === 'easy' ? 3 : q.difficulty === 'medium' ? 6 : 9);
      
      return qDifficulty >= difficultyRange.min && qDifficulty <= difficultyRange.max;
    });

    console.log(`7. Available questions after difficulty filter: ${availableQuestions.length}`);

    // Test question count limit
    const questionCount = 10;
    const shuffledQuestions = availableQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, questionCount);

    console.log(`8. Final shuffled questions for quiz: ${shuffledQuestions.length}`);

    if (shuffledQuestions.length === 0) {
      console.log('\n❌ ISSUE FOUND: No questions available after filtering!');
      console.log('   Debugging info:');
      console.log(`   - Total questions in DB: ${allQuestions.length}`);
      console.log(`   - Questions matching categories: ${allQuestions.length}`);
      console.log(`   - Questions matching difficulty: ${availableQuestions.length}`);
      
      // Show difficulty distribution
      const difficultyDist = {};
      allQuestions.forEach(q => {
        const diff = q.difficulty;
        difficultyDist[diff] = (difficultyDist[diff] || 0) + 1;
      });
      console.log('   - Difficulty distribution:', difficultyDist);
      
    } else {
      console.log('\n✅ Quiz creation should work!');
      console.log(`   Final quiz will have ${shuffledQuestions.length} questions`);
    }

    // Test all roadmap types
    console.log('\n9. Testing all roadmap types:');
    for (const [roadmap, categories] of Object.entries(categoryMapping)) {
      const questions = await Question.find({ 
        category: { $in: categories }
      }).countDocuments();
      console.log(`   ${roadmap}: ${questions} questions`);
    }

  } catch (error) {
    console.error('❌ Error in debug:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugQuizCreation();