#!/usr/bin/env node
/**
 * Diagnostic test for API key issues
 */

require('dotenv').config();

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

log('\n🔍 API Key Diagnostics', 'bright');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    log('❌ GEMINI_API_KEY is not set', 'red');
    process.exit(1);
}

// Check key format
log('\n📋 Key Analysis:', 'cyan');
log(`  Length: ${apiKey.length} characters`, 'cyan');
log(`  Starts with: ${apiKey.substring(0, 8)}...`, 'cyan');
log(`  Ends with: ...${apiKey.substring(apiKey.length - 4)}`, 'cyan');

// Check for common issues
const issues = [];

if (apiKey.includes(' ')) {
    issues.push('Contains spaces');
}
if (apiKey.includes('\n')) {
    issues.push('Contains newlines');
}
if (apiKey.includes('\r')) {
    issues.push('Contains carriage returns');
}
if (apiKey.includes('\t')) {
    issues.push('Contains tabs');
}
if (apiKey !== apiKey.trim()) {
    issues.push('Has leading/trailing whitespace');
}
if (apiKey.includes('"') || apiKey.includes("'")) {
    issues.push('Contains quotes');
}

if (issues.length > 0) {
    log('\n⚠️  Potential Issues Found:', 'yellow');
    issues.forEach(issue => log(`  • ${issue}`, 'yellow'));
} else {
    log('\n✓ No formatting issues detected', 'green');
}

// Expected format check
if (!apiKey.startsWith('AIza')) {
    log('\n⚠️  Warning: Gemini API keys typically start with "AIza"', 'yellow');
    log('  Your key starts with: ' + apiKey.substring(0, 4), 'yellow');
}

if (apiKey.length < 30 || apiKey.length > 50) {
    log('\n⚠️  Warning: Unusual key length', 'yellow');
    log('  Gemini API keys are typically 39 characters', 'yellow');
}

log('\n💡 Recommendations:', 'cyan');
log('  1. Verify the key is copied correctly from Google AI Studio', 'cyan');
log('  2. Make sure there are no extra spaces or quotes', 'cyan');
log('  3. Check that the key has Generative AI API enabled', 'cyan');
log('  4. Verify billing is enabled in Google Cloud Console', 'cyan');

// Now test the actual API
log('\n🧪 Testing API Connection...', 'cyan');

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function quickTest() {
    try {
        const genAI = new GoogleGenerativeAI(apiKey.trim());
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent('Say OK');
        const response = await result.response;
        const text = response.text();

        log('\n✅ SUCCESS! API key is working!', 'green');
        log(`Response: ${text.trim()}`, 'green');
        return true;
    } catch (error) {
        log('\n❌ API Test Failed', 'red');

        if (error.message.includes('API key not valid')) {
            log('\nThe API key is being rejected by Google.', 'red');
            log('\nPossible reasons:', 'yellow');
            log('  1. Key was revoked or expired', 'yellow');
            log('  2. Key is from wrong project', 'yellow');
            log('  3. Generative AI API not enabled', 'yellow');
            log('  4. Billing not enabled', 'yellow');
            log('\n🔗 Get a new key: https://aistudio.google.com/app/apikey', 'cyan');
        } else if (error.message.includes('quota')) {
            log('\nQuota exceeded. Wait or upgrade your plan.', 'yellow');
        } else {
            log(`\nError: ${error.message}`, 'red');
        }

        return false;
    }
}

quickTest().then(success => {
    process.exit(success ? 0 : 1);
});
