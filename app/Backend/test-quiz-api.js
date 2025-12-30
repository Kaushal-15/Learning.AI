#!/usr/bin/env node

/**
 * Test Quiz API Directly
 * Make a direct API call to test quiz creation
 */

const fetch = require('node-fetch').default || require('node-fetch');

async function testQuizAPI() {
  console.log('🧪 Testing Quiz API Directly...\n');

  const API_BASE = 'http://localhost:3000/api';
  
  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connectivity...');
    try {
      const healthResponse = await fetch(`${API_BASE}/health`);
      console.log(`   Server status: ${healthResponse.status}`);
    } catch (err) {
      console.log('   ❌ Server not responding. Is the backend running?');
      console.log('   💡 Start backend with: cd app/Backend && npm start');
      return;
    }

    // Test 2: Try to create a quiz (this will fail without auth, but we can see the error)
    console.log('\n2. Testing quiz creation endpoint...');
    try {
      const quizResponse = await fetch(`${API_BASE}/quiz/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roadmapType: 'frontend',
          difficulty: 'medium',
          questionCount: 10,
          timeLimit: 15,
          adaptiveDifficulty: false
        })
      });

      const quizData = await quizResponse.json();
      console.log(`   Response status: ${quizResponse.status}`);
      console.log(`   Response:`, JSON.stringify(quizData, null, 2));

      if (quizResponse.status === 401) {
        console.log('   ✅ Expected: Authentication required (this is normal)');
        console.log('   💡 The endpoint exists and is responding');
      } else if (quizResponse.status === 500) {
        console.log('   ❌ Server error - check backend logs');
      }

    } catch (err) {
      console.log(`   ❌ Error calling quiz API: ${err.message}`);
    }

    // Test 3: Check what's actually being sent from frontend
    console.log('\n3. Expected frontend request format:');
    console.log(`   URL: ${API_BASE}/quiz/create`);
    console.log('   Method: POST');
    console.log('   Headers: Content-Type: application/json, credentials: include');
    console.log('   Body: {');
    console.log('     roadmapType: "frontend",');
    console.log('     difficulty: "medium",');
    console.log('     questionCount: 10,');
    console.log('     timeLimit: 15,');
    console.log('     topic: "HTML Basics",');
    console.log('     adaptiveDifficulty: true');
    console.log('   }');

    console.log('\n4. Debugging steps:');
    console.log('   1. Check backend console logs when clicking "Take Quiz"');
    console.log('   2. Check browser Network tab for the actual request');
    console.log('   3. Verify user is logged in (check cookies)');
    console.log('   4. Check if authMiddleware is working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if node-fetch is available
try {
  require('node-fetch');
  testQuizAPI();
} catch (err) {
  console.log('📦 Installing node-fetch...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install node-fetch@2', { stdio: 'inherit' });
    console.log('✅ node-fetch installed, running test...\n');
    testQuizAPI();
  } catch (installErr) {
    console.log('❌ Could not install node-fetch. Please run manually:');
    console.log('   npm install node-fetch@2');
    console.log('   node test-quiz-api.js');
  }
}