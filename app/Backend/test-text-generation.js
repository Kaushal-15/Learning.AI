const contentGenerator = require('./services/contentGenerator');
require('dotenv').config();

async function testTextGeneration() {
  console.log('Testing Text Content Generation...\n');

  const params = {
    roadmap: 'full-stack-development',
    day: 1,
    topic: 'Introduction to Web Development',
    subtopic: 'HTML Basics',
    content_type: 'text'
  };

  console.log('Parameters:', params);
  console.log('\nGenerating content...\n');

  try {
    const result = await contentGenerator.generate(params);
    console.log('✅ SUCCESS! Generated content:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

testTextGeneration();
