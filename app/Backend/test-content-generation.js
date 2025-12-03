#!/usr/bin/env node

/**
 * Test Content Generation System
 */

require('dotenv').config();
const contentGenerator = require('./services/contentGenerator');

async function testContentGeneration() {
  console.log('🧪 Testing Content Generation System...\n');

  // Test parameters
  const testParams = {
    roadmap: 'frontend',
    day: 1,
    topic: 'HTML Basics',
    subtopic: 'HTML Elements',
    content_type: 'text'
  };

  console.log('Test Parameters:', testParams);
  console.log('GEMINI_API_KEY configured:', !!process.env.GEMINI_API_KEY);
  console.log('API Key preview:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'Not set');

  try {
    console.log('\n🔄 Generating text content...');
    const result = await contentGenerator.generate(testParams);
    
    console.log('\n✅ Content generation successful!');
    console.log('Generated content:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ Content generation failed:', error.message);
    console.error('Full error:', error);
  }

  // Test different content types
  const contentTypes = ['video', 'audio', 'image'];
  
  for (const contentType of contentTypes) {
    try {
      console.log(`\n🔄 Testing ${contentType} content generation...`);
      const result = await contentGenerator.generate({
        ...testParams,
        content_type: contentType
      });
      console.log(`✅ ${contentType} content generated successfully`);
      console.log(`${contentType} result:`, JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(`❌ ${contentType} content generation failed:`, error.message);
    }
  }
}

testContentGeneration().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});