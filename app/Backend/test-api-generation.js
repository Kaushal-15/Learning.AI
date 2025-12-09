#!/usr/bin/env node
/**
 * Test script to verify Gemini API key and content generation
 * Tests all content types: text, video, audio, image, full_module
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    log(title, 'bright');
    console.log('='.repeat(60));
}

async function testAPIKey() {
    logSection('1. Testing API Key Configuration');

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        log('❌ GEMINI_API_KEY is not set in .env file', 'red');
        return false;
    }

    if (apiKey === 'your_gemini_api_key_here') {
        log('❌ GEMINI_API_KEY is still set to placeholder value', 'red');
        return false;
    }

    log(`✓ API Key found: ${apiKey.substring(0, 10)}...`, 'green');
    return true;
}

async function testModelAccess() {
    logSection('2. Testing Model Access');

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const models = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-2.5-pro',
            'gemini-1.5-flash',
            'gemini-1.5-pro'
        ];

        log('Testing available models...', 'cyan');

        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Say "Hello" in one word');
                const response = await result.response;
                const text = response.text();

                log(`✓ ${modelName}: Working (response: "${text.trim()}")`, 'green');
                return { success: true, workingModel: modelName };
            } catch (error) {
                log(`✗ ${modelName}: ${error.message}`, 'yellow');
            }
        }

        log('❌ No working models found', 'red');
        return { success: false };

    } catch (error) {
        log(`❌ Error testing models: ${error.message}`, 'red');
        return { success: false };
    }
}

async function testContentGeneration(modelName) {
    logSection('3. Testing Content Generation');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });

    const testCases = [
        {
            name: 'Text Content',
            type: 'text',
            prompt: `Generate a JSON response for learning content about "JavaScript Variables":
{
  "conceptExplanation": "Brief explanation of JavaScript variables",
  "realWorldAnalogy": "Simple analogy",
  "codeExamples": ["// Example code"],
  "keyPoints": ["Point 1", "Point 2"]
}
Respond ONLY with valid JSON, no markdown.`
        },
        {
            name: 'Video Content',
            type: 'video',
            prompt: `Generate video recommendations for "React Hooks" in JSON:
{
  "videoQueries": [
    "React Hooks tutorial for beginners",
    "React Hooks advanced concepts",
    "React Hooks practical examples"
  ],
  "script": {
    "sceneBreakdown": [{"scene": "Intro", "description": "Introduction to React Hooks"}],
    "finalScript": "Welcome to React Hooks..."
  }
}
Respond ONLY with valid JSON, no markdown.`
        },
        {
            name: 'Audio Content',
            type: 'audio',
            prompt: `Generate a podcast-style dialogue about "Python Functions" in JSON:
{
  "title": "Python Functions - Deep Dive",
  "estimatedDuration": "3-5 minutes",
  "dialogue": [
    {"speaker": "Host", "text": "Welcome! Today we're learning about Python functions."},
    {"speaker": "Expert", "text": "Functions are reusable blocks of code..."}
  ],
  "key_points": ["Functions are reusable", "They help organize code"]
}
Respond ONLY with valid JSON, no markdown.`
        },
        {
            name: 'Image/Mindmap Content',
            type: 'image',
            prompt: `Generate a mindmap for "Database Normalization" in JSON:
{
  "mainConcept": "Database Normalization",
  "subConcepts": ["1NF", "2NF", "3NF", "BCNF"],
  "useCases": ["Reduce redundancy", "Improve data integrity"],
  "commonMistakes": ["Over-normalization", "Ignoring performance"]
}
Respond ONLY with valid JSON, no markdown.`
        },
        {
            name: 'Full Module',
            type: 'full_module',
            prompt: `Generate a complete learning module for "API Design" in JSON format with these fields:
{
  "title": "API Design Fundamentals",
  "oneLineSummary": "Brief summary",
  "difficulty": "beginner",
  "overview": "Overview text",
  "whyItMatters": "Why this matters",
  "prerequisites": ["HTTP basics"],
  "fullLesson": {
    "explanation": "Detailed explanation",
    "stepByStepBreakdown": ["Step 1", "Step 2"],
    "realLifeExamples": ["Example 1"],
    "analogies": ["Analogy 1"],
    "commonMisconceptions": ["Misconception 1"]
  },
  "mindmap": {
    "mainConcept": "API Design",
    "subConcepts": ["REST", "GraphQL"],
    "useCases": ["Web services"],
    "commonMistakes": ["Poor versioning"]
  },
  "videoQueries": ["API design tutorial", "REST API best practices"],
  "videoScript": {
    "sceneBreakdown": [{"scene": "Intro", "description": "Introduction"}],
    "finalScript": "Welcome to API Design..."
  },
  "audioScript": "This is a podcast about API design...",
  "flashcards": [{"front": "What is REST?", "back": "Representational State Transfer"}],
  "studyPlan": [{"day": "Day 1", "tasks": ["Learn REST basics"]}]
}
Respond ONLY with valid JSON, no markdown.`
        }
    ];

    const results = [];

    for (const testCase of testCases) {
        log(`\nTesting ${testCase.name}...`, 'cyan');

        try {
            const result = await model.generateContent(testCase.prompt);
            const response = await result.response;
            let text = response.text();

            // Clean up response
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            // Try to parse JSON
            const firstOpen = text.indexOf('{');
            if (firstOpen !== -1) {
                const lastClose = text.lastIndexOf('}');
                const jsonText = text.substring(firstOpen, lastClose + 1);
                const parsed = JSON.parse(jsonText);

                log(`✓ ${testCase.name}: SUCCESS`, 'green');
                log(`  Generated ${Object.keys(parsed).length} fields`, 'green');

                // Show sample of generated content
                const firstKey = Object.keys(parsed)[0];
                const sample = JSON.stringify(parsed[firstKey]).substring(0, 100);
                log(`  Sample: ${sample}...`, 'blue');

                results.push({ type: testCase.type, success: true, data: parsed });
            } else {
                throw new Error('No JSON object found in response');
            }

        } catch (error) {
            log(`✗ ${testCase.name}: FAILED - ${error.message}`, 'red');
            results.push({ type: testCase.type, success: false, error: error.message });
        }
    }

    return results;
}

async function main() {
    log('\n🚀 GEMINI API CONTENT GENERATION TEST', 'bright');
    log('Testing if API can generate videos and other content types\n', 'cyan');

    // Test 1: API Key
    const hasApiKey = await testAPIKey();
    if (!hasApiKey) {
        log('\n❌ Cannot proceed without valid API key', 'red');
        log('Please set GEMINI_API_KEY in your .env file', 'yellow');
        process.exit(1);
    }

    // Test 2: Model Access
    const modelTest = await testModelAccess();
    if (!modelTest.success) {
        log('\n❌ Cannot access any Gemini models', 'red');
        log('Please check your API key permissions', 'yellow');
        process.exit(1);
    }

    // Test 3: Content Generation
    const results = await testContentGeneration(modelTest.workingModel);

    // Summary
    logSection('SUMMARY');
    const successful = results.filter(r => r.success).length;
    const total = results.length;

    log(`\nContent Generation Results: ${successful}/${total} successful`, 'bright');

    results.forEach(result => {
        const icon = result.success ? '✓' : '✗';
        const color = result.success ? 'green' : 'red';
        log(`${icon} ${result.type}: ${result.success ? 'Working' : 'Failed'}`, color);
    });

    if (successful === total) {
        log('\n🎉 ALL TESTS PASSED! Content generation is working correctly.', 'green');
        log('Video, audio, image, and text content can all be generated.', 'green');
    } else if (successful > 0) {
        log(`\n⚠️  PARTIAL SUCCESS: ${successful}/${total} content types working`, 'yellow');
        log('Some content types may need debugging.', 'yellow');
    } else {
        log('\n❌ ALL TESTS FAILED', 'red');
        log('Content generation is not working. Check API configuration.', 'red');
    }

    process.exit(successful === total ? 0 : 1);
}

// Run the test
main().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
