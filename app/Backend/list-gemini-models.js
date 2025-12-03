#!/usr/bin/env node

/**
 * List Available Gemini Models
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  console.log('🔍 Listing available Gemini models...\n');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    process.exit(1);
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // List all available models
    const models = await genAI.listModels();
    
    console.log('📋 Available models:');
    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name}`);
      console.log(`   Display Name: ${model.displayName}`);
      console.log(`   Description: ${model.description}`);
      console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      console.log('');
    });

    // Test a few common model names
    const testModels = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'models/gemini-pro',
      'models/gemini-1.5-pro',
      'models/gemini-1.5-flash'
    ];

    console.log('🧪 Testing model accessibility:');
    for (const modelName of testModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello, test message');
        console.log(`✅ ${modelName} - Working`);
      } catch (error) {
        console.log(`❌ ${modelName} - ${error.message.split('\n')[0]}`);
      }
    }

  } catch (error) {
    console.error('❌ Error listing models:', error.message);
  }
}

listModels().catch(console.error);