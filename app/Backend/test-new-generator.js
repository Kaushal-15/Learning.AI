#!/usr/bin/env node
/**
 * Test the new multi-tier content generation system
 */

require('dotenv').config();
const contentGenerator = require('./services/contentGenerator');

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

async function testContentGeneration() {
    log('\n🚀 Testing Multi-Tier Content Generation System', 'bright');
    log('='.repeat(60), 'cyan');

    const testParams = {
        roadmap: 'full-stack-development',
        day: 5,
        topic: 'JavaScript Fundamentals',
        subtopic: 'Variables and Data Types'
    };

    const contentTypes = ['text', 'video', 'audio', 'image', 'full_module'];
    const results = [];

    for (const contentType of contentTypes) {
        log(`\n📝 Testing ${contentType.toUpperCase()} generation...`, 'cyan');

        try {
            const params = { ...testParams, content_type: contentType };
            const startTime = Date.now();

            const content = await contentGenerator.generate(params);

            const duration = Date.now() - startTime;

            if (content && typeof content === 'object') {
                const fields = Object.keys(content);
                log(`✓ ${contentType}: SUCCESS (${duration}ms)`, 'green');
                log(`  Generated ${fields.length} fields: ${fields.slice(0, 3).join(', ')}...`, 'green');

                // Show sample content
                if (contentType === 'text' && content.conceptExplanation) {
                    const sample = content.conceptExplanation.substring(0, 100);
                    log(`  Sample: "${sample}..."`, 'blue');
                } else if (contentType === 'video' && content.links) {
                    log(`  Generated ${content.links.length} video links`, 'blue');
                } else if (contentType === 'audio' && content.dialogue) {
                    log(`  Generated ${content.dialogue.length} dialogue turns`, 'blue');
                } else if (contentType === 'full_module' && content.flashcards) {
                    log(`  Generated ${content.flashcards.length} flashcards`, 'blue');
                }

                results.push({ type: contentType, success: true, duration, fields: fields.length });
            } else {
                throw new Error('Invalid response format');
            }

        } catch (error) {
            log(`✗ ${contentType}: FAILED - ${error.message}`, 'red');
            results.push({ type: contentType, success: false, error: error.message });
        }
    }

    // Summary
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 SUMMARY', 'bright');
    log('='.repeat(60), 'cyan');

    const successful = results.filter(r => r.success).length;
    const total = results.length;

    log(`\nResults: ${successful}/${total} content types working`, 'bright');

    results.forEach(result => {
        const icon = result.success ? '✓' : '✗';
        const color = result.success ? 'green' : 'red';
        const details = result.success
            ? `${result.fields} fields, ${result.duration}ms`
            : result.error;
        log(`${icon} ${result.type.padEnd(15)} - ${details}`, color);
    });

    if (successful === total) {
        log('\n🎉 ALL TESTS PASSED!', 'green');
        log('Content generation is fully operational!', 'green');
        log('\n✨ The system is using:', 'cyan');
        if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
            log('  • Groq API (primary)', 'cyan');
        }
        if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
            log('  • Gemini API (fallback)', 'cyan');
        }
        log('  • Intelligent Templates (always available)', 'cyan');
    } else if (successful > 0) {
        log(`\n⚠️  PARTIAL SUCCESS: ${successful}/${total} working`, 'yellow');
    } else {
        log('\n❌ ALL TESTS FAILED', 'red');
    }

    log(''); // Empty line
    process.exit(successful > 0 ? 0 : 1);
}

// Run test
testContentGeneration().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
