#!/usr/bin/env node

/**
 * Debug Server Issues
 * This script helps identify specific server errors
 */

const express = require('express');
require('dotenv').config();

console.log('🔍 Debugging server startup...\n');

// Test 1: Basic Express Setup
console.log('1. Testing Express setup...');
try {
  const app = express();
  console.log('   ✅ Express app created successfully');
} catch (error) {
  console.log('   ❌ Express setup failed:', error.message);
  process.exit(1);
}

// Test 2: Environment Variables
console.log('\n2. Testing environment variables...');
const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
let envErrors = [];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    envErrors.push(varName);
    console.log(`   ❌ Missing: ${varName}`);
  } else {
    console.log(`   ✅ Found: ${varName}`);
  }
});

// Test 3: Database Connection
console.log('\n3. Testing database connection...');
try {
  const mongoose = require('mongoose');
  
  mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false
  }).then(() => {
    console.log('   ✅ MongoDB connection successful');
    
    // Test 4: Model Loading
    console.log('\n4. Testing model loading...');
    const models = ['User', 'Quiz', 'TestResult', 'TestCompletion'];
    
    models.forEach(modelName => {
      try {
        require(`./models/${modelName}`);
        console.log(`   ✅ ${modelName} model loaded`);
      } catch (error) {
        console.log(`   ❌ ${modelName} model failed:`, error.message);
      }
    });
    
    // Test 5: Route Loading
    console.log('\n5. Testing route loading...');
    const routes = ['auth', 'quizRoutes', 'testResultRoutes', 'questionRoutes'];
    
    routes.forEach(routeName => {
      try {
        require(`./routes/${routeName}`);
        console.log(`   ✅ ${routeName} route loaded`);
      } catch (error) {
        console.log(`   ❌ ${routeName} route failed:`, error.message);
      }
    });
    
    // Test 6: Middleware Loading
    console.log('\n6. Testing middleware loading...');
    const middlewares = ['authMiddleware', 'errorHandler', 'logger', 'requestLogger'];
    
    middlewares.forEach(middlewareName => {
      try {
        require(`./middleware/${middlewareName}`);
        console.log(`   ✅ ${middlewareName} loaded`);
      } catch (error) {
        console.log(`   ❌ ${middlewareName} failed:`, error.message);
      }
    });
    
    // Test 7: Services Loading
    console.log('\n7. Testing services loading...');
    const services = ['contentGenerator'];
    
    services.forEach(serviceName => {
      try {
        require(`./services/${serviceName}`);
        console.log(`   ✅ ${serviceName} service loaded`);
      } catch (error) {
        console.log(`   ❌ ${serviceName} service failed:`, error.message);
      }
    });
    
    console.log('\n🎯 Debug Summary:');
    if (envErrors.length > 0) {
      console.log(`   ⚠️  Missing environment variables: ${envErrors.join(', ')}`);
    } else {
      console.log('   ✅ All environment variables present');
    }
    
    console.log('\n🚀 Starting minimal server test...');
    
    // Test 8: Minimal Server Start
    const app = express();
    
    app.get('/test', (req, res) => {
      res.json({ status: 'OK', message: 'Server is working' });
    });
    
    const server = app.listen(3001, () => {
      console.log('   ✅ Test server started on port 3001');
      console.log('   🔗 Test URL: http://localhost:3001/test');
      
      // Close after 2 seconds
      setTimeout(() => {
        server.close(() => {
          console.log('   📴 Test server closed');
          mongoose.connection.close();
          process.exit(0);
        });
      }, 2000);
    });
    
  }).catch(error => {
    console.log('   ❌ MongoDB connection failed:', error.message);
    process.exit(1);
  });
  
} catch (error) {
  console.log('   ❌ Database test failed:', error.message);
  process.exit(1);
}