const contentGenerator = require('./services/contentGenerator');
require('dotenv').config();

async function testAllContentTypes() {
  console.log('Testing All Content Types with Groq API\n');
  console.log('='.repeat(60));

  const baseParams = {
    roadmap: 'full-stack-development',
    day: 1,
    topic: 'Introduction to Web Development',
    subtopic: 'HTML Basics'
  };

  const contentTypes = ['text', 'video', 'audio', 'image', 'flashcards', 'full_module'];

  for (const contentType of contentTypes) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${contentType.toUpperCase()}`);
    console.log('='.repeat(60));

    try {
      const params = { ...baseParams, content_type: contentType };
      const result = await contentGenerator.generate(params);
      
      console.log(`✅ ${contentType} generation SUCCESSFUL`);
      console.log(`Response keys: ${Object.keys(result).join(', ')}`);
      
      // Show a sample of the content
      if (contentType === 'text') {
        console.log(`Sample: ${result.conceptExplanation?.substring(0, 100)}...`);
      } else if (contentType === 'video') {
        console.log(`Video queries: ${result.videoQueries?.length || 0}`);
        console.log(`Video links: ${result.links?.length || 0}`);
      } else if (contentType === 'audio') {
        console.log(`Dialogue turns: ${result.dialogue?.length || 0}`);
      } else if (contentType === 'image') {
        console.log(`Sub-concepts: ${result.subConcepts?.length || 0}`);
      } else if (contentType === 'flashcards') {
        console.log(`Total cards: ${result.totalCards || result.flashcards?.length}`);
        console.log(`Categories: ${result.categories?.join(', ')}`);
        console.log(`Study time: ${result.estimatedStudyTime}`);
      } else if (contentType === 'full_module') {
        console.log(`Title: ${result.title}`);
        console.log(`Flashcards: ${result.flashcards?.length || 0}`);
      }
    } catch (error) {
      console.error(`❌ ${contentType} generation FAILED:`, error.message);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('All tests completed!');
  console.log('='.repeat(60));
}

testAllContentTypes();
