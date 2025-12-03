#!/usr/bin/env node

/**
 * Simple Gemini API Test
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testSimpleGemini() {
  console.log('🧪 Testing Simple Gemini API...\n');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found');
    process.exit(1);
  }

  console.log('API Key:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try the most basic model name
    console.log('🔄 Testing with gemini-pro...');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = "Say hello in JSON format: {\"message\": \"your response\"}";
    console.log('Prompt:', prompt);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Success! Response:', text);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    
    // Try alternative approach
    console.log('\n🔄 Trying alternative model names...');
    
    const alternativeModels = [
      'text-bison-001',
      'gemini-1.0-pro',
      'gemini-1.5-pro-latest'
    ];
    
    for (const modelName of alternativeModels) {
      try {
        console.log(`Testing ${modelName}...`);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello');
        console.log(`✅ ${modelName} works!`);
        break;
      } catch (err) {
        console.log(`❌ ${modelName} failed: ${err.message.split('\n')[0]}`);
      }
    }
  }
}

testSimpleGemini().catch(console.error);