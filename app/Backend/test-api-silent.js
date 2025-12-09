#!/usr/bin/env node
/**
 * Silent API test - validates API key without exposing it
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bright: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAPI() {
    log('\n🔐 Testing Gemini API (Key Hidden)', 'bright');

    // Check if API key exists
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        log('❌ API key not configured properly', 'red');
        return false;
    }

    log('✓ API key found in .env', 'green');

    // Test models
    const genAI = new GoogleGenerativeAI(apiKey);
    const models = ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro'];

    log('\n🧪 Testing model access...', 'cyan');

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Respond with just the word "OK"');
            const response = await result.response;
            const text = response.text().trim();

            log(`✓ ${modelName}: Working`, 'green');

            // Test content generation
            log('\n🎨 Testing content generation...', 'cyan');

            const testPrompt = `Generate a simple JSON response about "JavaScript basics":
{
  "title": "JavaScript Basics",
  "summary": "Brief summary",
  "keyPoints": ["Point 1", "Point 2"]
}
Respond ONLY with valid JSON.`;

            const contentResult = await model.generateContent(testPrompt);
            const contentResponse = await contentResult.response;
            let contentText = contentResponse.text();

            // Clean and parse
            contentText = contentText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const firstOpen = contentText.indexOf('{');
            const lastClose = contentText.lastIndexOf('}');

            if (firstOpen !== -1 && lastClose !== -1) {
                const jsonText = contentText.substring(firstOpen, lastClose + 1);
                const parsed = JSON.parse(jsonText);

                log('✓ Content generation: Working', 'green');
                log(`  Generated ${Object.keys(parsed).length} fields successfully`, 'green');

                log('\n✅ ALL TESTS PASSED', 'bright');
                log('🎉 Content generation is fully operational!', 'green');
                log('\nYou can now generate:', 'cyan');
                log('  • Text lessons', 'cyan');
                log('  • Video recommendations', 'cyan');
                log('  • Audio/Podcast scripts', 'cyan');
                log('  • Mindmaps and diagrams', 'cyan');
                log('  • Complete learning modules', 'cyan');

                return true;
            } else {
                throw new Error('Invalid JSON response');
            }

        } catch (error) {
            if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
                log(`✗ ${modelName}: API key is invalid`, 'red');
                continue;
            } else if (error.message.includes('not found') || error.message.includes('404')) {
                log(`✗ ${modelName}: Model not available`, 'yellow');
                continue;
            } else {
                log(`✗ ${modelName}: ${error.message}`, 'red');
                continue;
            }
        }
    }

    log('\n❌ No working models found', 'red');
    log('Please check your API key configuration', 'yellow');
    return false;
}

testAPI()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
        log(`\n❌ Error: ${error.message}`, 'red');
        process.exit(1);
    });
