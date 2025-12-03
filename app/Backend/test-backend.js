#!/usr/bin/env node

/**
 * Backend Health Check and Error Diagnosis Script
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testBackend() {
  console.log('🔍 Testing Backend Components...\n');

  // 1. Test Environment Variables
  console.log('1. Environment Variables:');
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'GEMINI_API_KEY'
  ];

  let envIssues = [];
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (!value || value === 'your_' + envVar.toLowerCase() + '_here') {
      envIssues.push(envVar);
      console.log(`   ❌ ${envVar}: Not configured`);
    } else {
      console.log(`   ✅ ${envVar}: Configured`);
    }
  });

  if (envIssues.length > 0) {
    console.log(`\n⚠️  Environment Issues Found: ${envIssues.join(', ')}`);
  }

  // 2. Test Database Connection
  console.log('\n2. Database Connection:');
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    });
    console.log('   ✅ MongoDB: Connected successfully');
    
    // Test basic operations
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`   ✅ Collections: Found ${collections.length} collections`);
    
  } catch (error) {
    console.log(`   ❌ MongoDB: Connection failed - ${error.message}`);
  }

  // 3. Test Models
  console.log('\n3. Model Loading:');
  const models = [
    'User', 'Quiz', 'TestResult', 'TestCompletion', 
    'UserPerformance', 'QuestionHistory', 'ContentCache'
  ];

  models.forEach(modelName => {
    try {
      require(`./models/${modelName}`);
      console.log(`   ✅ ${modelName}: Loaded successfully`);
    } catch (error) {
      console.log(`   ❌ ${modelName}: Failed to load - ${error.message}`);
    }
  });

  // 4. Test Services
  console.log('\n4. Service Loading:');
  const services = [
    'contentGenerator', 'quizService'
  ];

  services.forEach(serviceName => {
    try {
      require(`./services/${serviceName}`);
      console.log(`   ✅ ${serviceName}: Loaded successfully`);
    } catch (error) {
      console.log(`   ❌ ${serviceName}: Failed to load - ${error.message}`);
    }
  });

  // 5. Test AI Service
  console.log('\n5. AI Service:');
  try {
    const contentGenerator = require('./services/contentGenerator');
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
      console.log('   ✅ Content Generator: Initialized with API key');
    } else {
      console.log('   ⚠️  Content Generator: No valid API key (will use fallback content)');
    }
  } catch (error) {
    console.log(`   ❌ Content Generator: Failed - ${error.message}`);
  }

  // 6. Test Routes
  console.log('\n6. Route Loading:');
  const routes = [
    'auth', 'quizRoutes', 'testResultRoutes', 'contentRoutes'
  ];

  routes.forEach(routeName => {
    try {
      require(`./routes/${routeName}`);
      console.log(`   ✅ ${routeName}: Loaded successfully`);
    } catch (error) {
      console.log(`   ❌ ${routeName}: Failed to load - ${error.message}`);
    }
  });

  // Close database connection
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('\n📴 Database connection closed');
  }

  console.log('\n🏁 Backend test completed!');
  
  if (envIssues.length > 0) {
    console.log('\n📝 Recommendations:');
    console.log('   1. Configure missing environment variables in .env file');
    console.log('   2. Ensure MongoDB is running and accessible');
    console.log('   3. Get a valid GEMINI_API_KEY from Google AI Studio');
    console.log('   4. Restart the server after fixing configuration');
  }
}

// Run the test
testBackend().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});