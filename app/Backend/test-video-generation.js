const contentGenerator = require('./services/contentGenerator');
require('dotenv').config();

async function testVideoGeneration() {
  console.log('Testing Video Content Generation...\n');

  const params = {
    roadmap: 'full-stack-development',
    day: 1,
    topic: 'Introduction to Web Development',
    subtopic: 'HTML Basics',
    content_type: 'video'
  };

  console.log('Parameters:', params);
  console.log('\nGenerating video content...\n');

  try {
    const result = await contentGenerator.generate(params);
    console.log('✅ SUCCESS! Generated video content:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n📺 Video URLs:');
    if (result.videos) {
      result.videos.forEach((video, i) => {
        console.log(`\n${i + 1}. ${video.title}`);
        console.log(`   Search: ${video.searchUrl}`);
        console.log(`   Embed: ${video.embedUrl}`);
      });
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

testVideoGeneration();
