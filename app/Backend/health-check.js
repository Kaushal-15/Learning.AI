#!/usr/bin/env node

/**
 * Startup Health Check
 * Runs before server start to ensure all components are ready
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function healthCheck() {
  console.log('🏥 Running startup health check...\n');
  
  let issues = [];
  
  // Check environment variables
  const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      issues.push(`Missing environment variable: ${varName}`);
    }
  });
  
  // Check MongoDB connection
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB: Connection successful');
    await mongoose.connection.close();
  } catch (error) {
    issues.push(`MongoDB connection failed: ${error.message}`);
  }
  
  // Check AI service
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
    console.log('⚠️  Gemini API: Not configured (will use fallback content)');
  } else {
    console.log('✅ Gemini API: Configured');
  }
  
  if (issues.length > 0) {
    console.log('\n❌ Health check failed:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    process.exit(1);
  } else {
    console.log('\n✅ All systems ready!');
  }
}

healthCheck().catch(error => {
  console.error('❌ Health check error:', error.message);
  process.exit(1);
});
