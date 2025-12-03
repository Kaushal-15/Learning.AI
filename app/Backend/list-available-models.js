#!/usr/bin/env node

/**
 * List available Gemini models using REST API
 */

require('dotenv').config();

async function listAvailableModels() {
  console.log('🔍 Listing available Gemini models...\n');

  const API_KEY = process.env.GEMINI_API_KEY;
  console.log('API Key:', API_KEY.substring(0, 10) + '...\n');

  try {
    // Try v1 API
    console.log('📋 Trying v1 API...');
    const v1Url = `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`;
    const v1Response = await fetch(v1Url);
    
    if (v1Response.ok) {
      const v1Data = await v1Response.json();
      console.log('✅ v1 API works!');
      console.log('Available models:');
      if (v1Data.models) {
        v1Data.models.forEach((model, index) => {
          console.log(`${index + 1}. ${model.name}`);
          if (model.supportedGenerationMethods) {
            console.log(`   Methods: ${model.supportedGenerationMethods.join(', ')}`);
          }
        });
      }
      return;
    } else {
      console.log('❌ v1 API failed:', v1Response.status, v1Response.statusText);
    }

    // Try v1beta API
    console.log('\n📋 Trying v1beta API...');
    const v1betaUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    const v1betaResponse = await fetch(v1betaUrl);
    
    if (v1betaResponse.ok) {
      const v1betaData = await v1betaResponse.json();
      console.log('✅ v1beta API works!');
      console.log('Available models:');
      if (v1betaData.models) {
        v1betaData.models.forEach((model, index) => {
          console.log(`${index + 1}. ${model.name}`);
          if (model.supportedGenerationMethods) {
            console.log(`   Methods: ${model.supportedGenerationMethods.join(', ')}`);
          }
        });
      }
    } else {
      const errorText = await v1betaResponse.text();
      console.log('❌ v1beta API failed:', v1betaResponse.status, v1betaResponse.statusText);
      console.log('Error:', errorText.substring(0, 200));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listAvailableModels().catch(console.error);