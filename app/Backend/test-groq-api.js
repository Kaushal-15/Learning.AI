const Groq = require('groq-sdk');
require('dotenv').config();

async function testGroqAPI() {
  console.log('Testing Groq API...');
  console.log('API Key:', process.env.GROQ_API_KEY ? `${process.env.GROQ_API_KEY.substring(0, 10)}...` : 'NOT FOUND');

  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY not found in environment');
    return;
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Respond with valid JSON only.'
        },
        {
          role: 'user',
          content: 'Generate a simple JSON object with a "message" field saying "Hello from Groq"'
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 100,
    });

    const response = completion.choices[0]?.message?.content || '';
    console.log('✅ Groq API Response:', response);
    
    // Try to parse JSON
    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const json = JSON.parse(cleaned);
      console.log('✅ Parsed JSON:', json);
    } catch (e) {
      console.log('⚠️  Response is not valid JSON, but API call succeeded');
    }

  } catch (error) {
    console.error('❌ Groq API Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (error.error) {
      console.error('Error details:', error.error);
    }
  }
}

testGroqAPI();
