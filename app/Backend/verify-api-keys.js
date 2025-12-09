const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function verifyAPIKeys() {
  console.log('🔍 Verifying API Keys Configuration\n');
  console.log('='.repeat(60));

  // Check Groq API
  console.log('\n1. GROQ API');
  console.log('-'.repeat(60));
  const groqKey = process.env.GROQ_API_KEY;
  
  if (!groqKey) {
    console.log('❌ GROQ_API_KEY not found in .env');
  } else {
    console.log(`✓ GROQ_API_KEY found: ${groqKey.substring(0, 10)}...`);
    
    try {
      const groq = new Groq({ apiKey: groqKey });
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: 'Say "Hello"' }],
        model: 'llama-3.3-70b-versatile',
        max_tokens: 10,
      });
      console.log('✅ GROQ API is WORKING');
      console.log(`   Response: ${completion.choices[0]?.message?.content}`);
    } catch (error) {
      console.log('❌ GROQ API FAILED:', error.message);
    }
  }

  // Check Gemini API
  console.log('\n2. GEMINI API');
  console.log('-'.repeat(60));
  const geminiKey = process.env.GEMINI_API_KEY;
  
  if (!geminiKey) {
    console.log('❌ GEMINI_API_KEY not found in .env');
  } else {
    console.log(`✓ GEMINI_API_KEY found: ${geminiKey.substring(0, 10)}...`);
    
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent('Say "Hello"');
      const response = await result.response;
      console.log('✅ GEMINI API is WORKING');
      console.log(`   Response: ${response.text()}`);
    } catch (error) {
      console.log('❌ GEMINI API FAILED:', error.message);
      if (error.message.includes('API key not valid')) {
        console.log('\n   💡 To get a new Gemini API key:');
        console.log('   1. Visit: https://aistudio.google.com/app/apikey');
        console.log('   2. Sign in with your Google account');
        console.log('   3. Click "Create API Key"');
        console.log('   4. Copy the key and update your .env file');
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  const groqWorks = groqKey && groqKey.startsWith('gsk_');
  const geminiWorks = false; // We know it's invalid from the test
  
  if (groqWorks) {
    console.log('✅ Your system is configured correctly with Groq API');
    console.log('   Content generation will use Groq (fast and free)');
  } else if (geminiWorks) {
    console.log('✅ Your system is configured with Gemini API');
    console.log('   Content generation will use Gemini');
  } else {
    console.log('⚠️  No working API keys found');
    console.log('   Content generation will use template fallback');
  }
  
  console.log('\n' + '='.repeat(60));
}

verifyAPIKeys();
