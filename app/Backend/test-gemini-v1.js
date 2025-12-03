#!/usr/bin/env node

/**
 * Test Gemini with v1 API
 */

require('dotenv').config();

async function testGeminiV1() {
    console.log('🧪 Testing Gemini API with direct fetch...\n');

    const API_KEY = process.env.GEMINI_API_KEY;
    console.log('API Key:', API_KEY.substring(0, 10) + '...');

    // Test different model names with v1 API
    const models = [
        'gemini-2.0-flash-exp',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro'
    ];

    for (const model of models) {
        try {
            console.log(`\n🔄 Testing ${model}...`);

            const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${API_KEY}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'Say hello in JSON format: {"message": "your response"}'
                        }]
                    }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ ${model} WORKS!`);
                console.log('Response:', JSON.stringify(data, null, 2).substring(0, 200) + '...');

                // If this model works, update the content generator
                console.log(`\n🎯 Found working model: ${model}`);
                break;
            } else {
                const error = await response.text();
                console.log(`❌ ${model} failed: ${response.status} ${response.statusText}`);
                console.log('Error:', error.substring(0, 150));
            }
        } catch (error) {
            console.log(`❌ ${model} error:`, error.message);
        }
    }
}

testGeminiV1().catch(console.error);
