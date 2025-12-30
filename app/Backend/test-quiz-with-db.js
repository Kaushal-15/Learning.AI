#!/usr/bin/env node

/**
 * Test Quiz Creation with Database Questions
 * Verify that quiz creation now works with the populated database
 */

const mongoose = require('mongoose');
const Question = require('./models/Question');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/learning-ai';

async function testQuizCreation() {
  console.log('🧪 Testing Quiz Creation with Database Questions...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test different roadmap types
    const roadmapTypes = ['frontend', 'backend', 'ai-ml', 'devops'];
    
    for (const roadmapType of roadmapTypes) {
      console.log(`\n📋 Testing ${roadmapType} questions...`);
      
      // Map roadmap types to categories (same as in quizRoutes.js)
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
      
      // Test different difficulty levels
      const difficulties = ['easy', 'medium', 'hard'];
      
      for (const difficulty of difficulties) {
        const getDifficultyRange = (diff) => {
          if (diff === 'easy') return { min: 1, max: 4 };
          if (diff === 'medium') return { min: 4, max: 7 };
          if (diff === 'hard') return { min: 7, max: 10 };
          return { min: 1, max: 10 };
        };

        const difficultyRange = getDifficultyRange(difficulty);
        
        const questions = await Question.find({ 
          category: { $in: relevantCategories },
          difficulty: { $gte: difficultyRange.min, $lte: difficultyRange.max }
        }).limit(10);
        
        console.log(`   ${difficulty}: ${questions.length} questions available`);
        
        if (questions.length > 0) {
          // Show sample question
          const sample = questions[0];
          console.log(`      Sample: "${sample.content.substring(0, 50)}..."`);
          console.log(`      Options: ${sample.options.length} choices`);
          console.log(`      Categories: ${sample.category.join(', ')}`);
        }
      }
    }
    
    // Test overall statistics
    console.log('\n📊 Overall Database Statistics:');
    const totalQuestions = await Question.countDocuments();
    console.log(`   Total questions: ${totalQuestions}`);
    
    const categoryStats = await Question.aggregate([
      { $unwind: '$category' },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    console.log('\n   Top 10 categories:');
    categoryStats.forEach(stat => {
      console.log(`      ${stat._id}: ${stat.count} questions`);
    });
    
    console.log('\n✅ Quiz creation should now work with database questions!');
    console.log('🎯 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Try creating a quiz from the learning paths');
    console.log('   3. The quiz should now load questions from the database');
    
  } catch (error) {
    console.error('❌ Error testing quiz creation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testQuizCreation();