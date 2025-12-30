#!/usr/bin/env node

/**
 * Test Quiz Functionality
 * Run this script to test if quiz creation and completion works
 */

const API_BASE = 'http://localhost:3000/api';

async function testQuizFunctionality() {
  console.log('🧪 Testing Quiz Functionality...\n');
  
  try {
    // Test 1: Create a quiz
    console.log('1. Testing quiz creation...');
    const createResponse = await fetch(`${API_BASE}/quiz/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: You'll need to add authentication headers in a real test
      },
      body: JSON.stringify({
        roadmapType: 'frontend',
        difficulty: 'easy',
        questionCount: 5,
        timeLimit: 10,
        adaptiveDifficulty: false
      })
    });
    
    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('   ✅ Quiz created:', createData.data._id);
      console.log('   📊 Questions:', createData.data.questions.length);
      
      // Test 2: Fetch the quiz
      console.log('\n2. Testing quiz fetch...');
      const fetchResponse = await fetch(`${API_BASE}/quiz/${createData.data._id}`);
      
      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json();
        console.log('   ✅ Quiz fetched successfully');
        console.log('   📋 Title:', fetchData.data.title);
        console.log('   ❓ First question:', fetchData.data.questions[0]?.question?.substring(0, 50) + '...');
      } else {
        console.log('   ❌ Failed to fetch quiz');
      }
      
    } else {
      console.log('   ❌ Failed to create quiz');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testQuizFunctionality();
}

module.exports = { testQuizFunctionality };
