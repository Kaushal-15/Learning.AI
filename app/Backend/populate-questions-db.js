#!/usr/bin/env node

/**
 * Populate Questions Database
 * Load questions from JSON files into MongoDB Question collection
 * This ensures the quiz system uses the same source as PersonalizedQuestionSetService
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// Import the Question model
const Question = require('./models/Question');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/learning-ai';

async function populateQuestionsDatabase() {
  console.log('🔄 Populating Questions Database...\n');

  try {
    // Connect to MongoDB
    console.log('1. Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('   ✅ Connected to MongoDB');

    // Clear existing questions (optional - comment out if you want to keep existing)
    console.log('\n2. Clearing existing questions...');
    const deletedCount = await Question.deleteMany({});
    console.log(`   🗑️  Deleted ${deletedCount.deletedCount} existing questions`);

    // Load questions from JSON files
    console.log('\n3. Loading questions from JSON files...');
    
    const questionsDir = './Questions';
    const files = await fs.readdir(questionsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    let totalQuestionsAdded = 0;
    
    for (const file of jsonFiles) {
      const filePath = path.join(questionsDir, file);
      console.log(`\n   📄 Processing ${file}...`);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        
        if (!data.questions || !Array.isArray(data.questions)) {
          console.log(`   ⚠️  No questions array found in ${file}`);
          continue;
        }
        
        const roadmapType = file.replace('.json', '');
        const categoryMapping = {
          'frontend': ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'Angular', 'Frontend'],
          'backend': ['Node.js', 'Express', 'API', 'Database', 'Server', 'Backend'],
          'full-stack': ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Database', 'Full-Stack'],
          'mobile-app': ['React Native', 'Flutter', 'iOS', 'Android', 'Mobile'],
          'ai-machine-learning': ['Machine Learning', 'AI', 'Python', 'Data Science', 'Neural Networks'],
          'devops-cloud': ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'DevOps', 'Cloud'],
          'database-data-science': ['SQL', 'MongoDB', 'Database', 'Data Science', 'Analytics'],
          'cybersecurity': ['Security', 'Encryption', 'Network Security', 'Cybersecurity']
        };
        
        const defaultCategories = categoryMapping[roadmapType] || [roadmapType];
        
        // Transform and insert questions
        const questionsToInsert = [];
        
        for (const q of data.questions) {
          try {
            // Convert difficulty to numeric
            let numericDifficulty;
            if (typeof q.difficulty === 'string') {
              switch (q.difficulty.toLowerCase()) {
                case 'easy': numericDifficulty = 3; break;
                case 'medium': numericDifficulty = 6; break;
                case 'hard': numericDifficulty = 9; break;
                default: numericDifficulty = 5; break;
              }
            } else {
              numericDifficulty = q.difficulty || 5;
            }
            
            // Handle answer format
            let correctAnswer = q.answer;
            if (/^[A-D]$/.test(q.answer)) {
              // Convert letter-based answer to actual option text
              const letterIndex = q.answer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
              if (letterIndex >= 0 && letterIndex < q.options.length) {
                correctAnswer = q.options[letterIndex];
              }
            }
            
            // Validate that correctAnswer exists in options
            if (!q.options.includes(correctAnswer)) {
              console.log(`   ⚠️  Skipping question ${q.questionId}: Answer "${correctAnswer}" not found in options`);
              continue;
            }
            
            // Validate question content length
            if (!q.question || q.question.length < 10) {
              console.log(`   ⚠️  Skipping question ${q.questionId}: Question too short`);
              continue;
            }
            
            // Determine categories
            let questionCategories = defaultCategories;
            if (q.topic) {
              questionCategories = [q.topic, ...defaultCategories.slice(0, 2)];
            }
            
            const questionDoc = {
              content: q.question,
              options: q.options,
              correctAnswer: correctAnswer,
              explanation: q.explanation || 'No explanation provided',
              category: questionCategories,
              difficulty: numericDifficulty,
              tags: [roadmapType, q.topic].filter(Boolean).map(tag => tag.substring(0, 30)), // Limit tag length
              generatedBy: 'Human', // Required field
              validationScore: 0.9, // High score for curated questions
              timesUsed: 0,
              averageTimeSpent: 0,
              successRate: 0,
              hints: [], // Optional but good to include
              // Keep original data for reference in tags
              originalQuestionId: q.questionId
            };
            
            questionsToInsert.push(questionDoc);
            
          } catch (qError) {
            console.log(`   ⚠️  Error processing question ${q.questionId}: ${qError.message}`);
          }
        }
        
        if (questionsToInsert.length > 0) {
          await Question.insertMany(questionsToInsert);
          console.log(`   ✅ Added ${questionsToInsert.length} questions from ${file}`);
          totalQuestionsAdded += questionsToInsert.length;
        } else {
          console.log(`   ⚠️  No valid questions found in ${file}`);
        }
        
      } catch (fileError) {
        console.log(`   ❌ Error processing ${file}: ${fileError.message}`);
      }
    }
    
    console.log(`\n✅ Database Population Complete!`);
    console.log(`📊 Total questions added: ${totalQuestionsAdded}`);
    
    // Verify the data
    console.log('\n4. Verifying database content...');
    const totalInDb = await Question.countDocuments();
    console.log(`   📊 Total questions in database: ${totalInDb}`);
    
    // Show category distribution
    const categoryStats = await Question.aggregate([
      { $unwind: '$category' },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n   📈 Category distribution:');
    categoryStats.forEach(stat => {
      console.log(`      ${stat._id}: ${stat.count} questions`);
    });
    
    // Show difficulty distribution
    const difficultyStats = await Question.aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n   📊 Difficulty distribution:');
    difficultyStats.forEach(stat => {
      const level = stat._id <= 3 ? 'Easy' : stat._id <= 6 ? 'Medium' : 'Hard';
      console.log(`      Level ${stat._id} (${level}): ${stat.count} questions`);
    });
    
    console.log('\n🎉 Questions database is now ready!');
    console.log('   The quiz system will now use the same question source as PersonalizedQuestionSetService');
    
  } catch (error) {
    console.error('❌ Error populating database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the population script
if (require.main === module) {
  populateQuestionsDatabase();
}

module.exports = { populateQuestionsDatabase };