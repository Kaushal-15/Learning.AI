const contentGenerator = require('./services/contentGenerator');
require('dotenv').config();

async function testFlashcardGeneration() {
  console.log('🃏 Testing Flashcard Generation with Groq API\n');
  console.log('='.repeat(60));

  const params = {
    roadmap: 'full-stack-development',
    day: 1,
    topic: 'Introduction to Web Development',
    subtopic: 'HTML Basics',
    content_type: 'flashcards'
  };

  console.log('Parameters:', params);
  console.log('\nGenerating flashcards...\n');

  try {
    const result = await contentGenerator.generate(params);
    console.log('✅ SUCCESS! Generated flashcards:');
    console.log('='.repeat(60));
    console.log(`Total Cards: ${result.totalCards || result.flashcards?.length}`);
    console.log(`Categories: ${result.categories?.join(', ')}`);
    console.log(`Study Time: ${result.estimatedStudyTime}`);
    console.log('\n' + '='.repeat(60));
    console.log('FLASHCARDS:');
    console.log('='.repeat(60));
    
    if (result.flashcards && result.flashcards.length > 0) {
      result.flashcards.forEach((card, index) => {
        console.log(`\n📇 Card ${index + 1} [${card.category || 'general'}] - ${card.difficulty || 'intermediate'}`);
        console.log('─'.repeat(60));
        console.log(`❓ FRONT: ${card.front}`);
        console.log(`✓ BACK:  ${card.back}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Full JSON Response:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

testFlashcardGeneration();
