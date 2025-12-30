#!/usr/bin/env node

/**
 * Simulate Frontend Quiz Request
 * This simulates the exact request that the frontend makes
 */

const mongoose = require('mongoose');
const Quiz = require('./models/Quiz');
const Question = require('./models/Question');
const QuestionHistory = require('./models/QuestionHistory');
const UserPerformance = require('./models/UserPerformance');
const { ObjectId } = require('mongoose').Types;

async function simulateFrontendRequest() {
  console.log('🎭 Simulating Frontend Quiz Request...\n');

  try {
    await mongoose.connect('mongodb://localhost:27017/learning-ai');
    console.log('✅ Connected to MongoDB');

    // Simulate the exact request data from frontend
    const requestData = {
      roadmapType: 'frontend',
      difficulty: 'medium',
      questionCount: 10,
      timeLimit: 15,
      topic: 'HTML Basics', // This might be the issue!
      adaptiveDifficulty: true
    };

    // Simulate user (create a fake user ID)
    const fakeUserId = new ObjectId();
    console.log(`👤 Simulating user: ${fakeUserId}`);

    console.log('📋 Request data:', JSON.stringify(requestData, null, 2));

    // Execute the exact same logic as in quizRoutes.js
    const { roadmapType, difficulty, questionCount = 20, timeLimit = 30, adaptiveDifficulty = false, topic } = requestData;

    // Get user performance data for adaptive selection
    let userPerformance = await UserPerformance.findOne({
      userId: fakeUserId,
      roadmapType
    });

    if (!userPerformance) {
      userPerformance = new UserPerformance({
        userId: fakeUserId,
        roadmapType
      });
      await userPerformance.save();
      console.log('📊 Created new user performance record');
    }

    // Get question history to avoid repetition
    const questionHistory = await QuestionHistory.find({
      userId: fakeUserId,
      roadmapType
    }).select('questionId');

    const attemptedQuestionIds = new Set(questionHistory.map(h => h.questionId));
    console.log(`📚 User has attempted ${attemptedQuestionIds.size} questions before`);

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
    console.log(`🔍 Fetching questions for categories: ${relevantCategories.join(', ')}`);
    
    let allQuestions = await Question.find({ 
      category: { $in: relevantCategories }
    }).lean();

    console.log(`📊 Found ${allQuestions.length} questions in database for ${roadmapType}`);

    // Debug: Log first few questions
    if (allQuestions.length > 0) {
      console.log('📝 Sample questions from DB:');
      allQuestions.slice(0, 3).forEach((q, i) => {
        console.log(`   ${i+1}. "${q.content?.substring(0, 50)}..."`);
        console.log(`      Categories: ${q.category.join(', ')}`);
        console.log(`      Difficulty: ${q.difficulty}`);
      });
    }

    // Determine effective difficulty based on adaptive settings
    let effectiveDifficulty = difficulty;
    if (adaptiveDifficulty && userPerformance.overallStats.totalQuestions > 10) {
      effectiveDifficulty = userPerformance.adaptiveSettings.currentDifficultyLevel;
    }

    // Convert difficulty to numeric range
    const getDifficultyRange = (diff) => {
      if (diff === 'easy') return { min: 1, max: 5 };
      if (diff === 'medium') return { min: 3, max: 8 };
      if (diff === 'hard') return { min: 6, max: 10 };
      if (diff === 'mixed') return { min: 1, max: 10 };
      return { min: 1, max: 10 };
    };

    const difficultyRange = getDifficultyRange(effectiveDifficulty);
    console.log(`🎚️ Difficulty range: ${effectiveDifficulty} (${difficultyRange.min}-${difficultyRange.max})`);
    console.log(`🏷️ Topic filter: ${topic || 'none'}`);

    // Smart question filtering with time-based freshness
    const now = new Date();
    const daysSinceAttempt = (questionId) => {
      const history = questionHistory.find(h => h.questionId === questionId);
      if (!history) return Infinity;
      return (now - new Date(history.lastAttempted)) / (1000 * 60 * 60 * 24);
    };

    let availableQuestions = allQuestions.filter(q => {
      // Use questionId for JSON questions, _id for database questions
      const qId = q._id ? q._id.toString() : q.questionId;

      // Filter by topic if provided (check both topic field and category array)
      if (topic) {
        const hasMatchingTopic = q.topic === topic || 
                               (q.category && q.category.includes(topic)) ||
                               (q.category && q.category.some(cat => cat.toLowerCase().includes(topic.toLowerCase())));
        if (!hasMatchingTopic) {
          console.log(`❌ Filtered out question ${qId} - topic mismatch (looking for "${topic}", found categories: ${q.category.join(', ')})`);
          return false;
        }
      }

      // Allow questions attempted more than 7 days ago
      const daysSince = daysSinceAttempt(qId);
      if (attemptedQuestionIds.has(qId) && daysSince < 7) {
        console.log(`❌ Filtered out question ${qId} - attempted recently`);
        return false;
      }

      // Filter by difficulty range
      const qDifficulty = typeof q.difficulty === 'number' ? q.difficulty : 
                         (q.difficulty === 'easy' ? 3 : q.difficulty === 'medium' ? 6 : 9);
      
      const passesFilter = qDifficulty >= difficultyRange.min && qDifficulty <= difficultyRange.max;
      if (!passesFilter) {
        console.log(`❌ Filtered out question ${qId} - difficulty ${qDifficulty} not in range ${difficultyRange.min}-${difficultyRange.max}`);
      }
      
      return passesFilter;
    });

    console.log(`\n📊 Filtering results:`);
    console.log(`   - Total questions: ${allQuestions.length}`);
    console.log(`   - After topic filter: ${availableQuestions.length}`);

    if (availableQuestions.length === 0) {
      console.log('\n❌ ISSUE IDENTIFIED: No questions pass the filters!');
      
      // Let's check what happens without topic filter
      console.log('\n🔍 Testing without topic filter...');
      let questionsWithoutTopic = allQuestions.filter(q => {
        const qDifficulty = typeof q.difficulty === 'number' ? q.difficulty : 
                           (q.difficulty === 'easy' ? 3 : q.difficulty === 'medium' ? 6 : 9);
        return qDifficulty >= difficultyRange.min && qDifficulty <= difficultyRange.max;
      });
      
      console.log(`   - Questions without topic filter: ${questionsWithoutTopic.length}`);
      
      if (questionsWithoutTopic.length > 0) {
        console.log('\n💡 SOLUTION: The topic filter is too restrictive!');
        console.log(`   The frontend is sending topic: "${topic}"`);
        console.log('   But database questions have different category names');
        console.log('\n   Available categories in database:');
        const uniqueCategories = [...new Set(allQuestions.flatMap(q => q.category))];
        uniqueCategories.slice(0, 10).forEach(cat => console.log(`     - ${cat}`));
      }
    } else {
      console.log('\n✅ Questions available for quiz creation!');
    }

  } catch (error) {
    console.error('❌ Error in simulation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

simulateFrontendRequest();