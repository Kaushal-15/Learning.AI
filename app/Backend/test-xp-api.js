#!/usr/bin/env node

/**
 * Manual API Test Script for XP and Progress Tracking System
 * Run this script to test all endpoints
 * 
 * Usage: node test-xp-api.js <auth-token>
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.argv[2];

if (!AUTH_TOKEN) {
    console.error('❌ Please provide an auth token as argument');
    console.log('Usage: node test-xp-api.js <your-auth-token>');
    process.exit(1);
}

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

// Test results tracker
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${name}`);
    if (details) console.log(`   ${details}`);

    results.tests.push({ name, passed, details });
    if (passed) results.passed++;
    else results.failed++;
}

async function runTests() {
    console.log('\n🚀 Starting XP & Progress Tracking API Tests\n');
    console.log('='.repeat(60));

    try {
        // Test 1: Update Progress (Award XP)
        console.log('\n📝 Test 1: Update Progress - Award XP for Topic Completion');
        const updateResult = await api.post('/api/progress-tracking/update', {
            roadmapId: 'backend-development',
            topicId: 'test-topic-001',
            difficulty: 'medium'
        });

        logTest(
            'Award XP for topic completion',
            updateResult.data.success && updateResult.data.data.xpAwarded === 20,
            `XP Awarded: ${updateResult.data.data.xpAwarded}, Total XP: ${updateResult.data.data.totalXP}`
        );

        // Test 2: Duplicate Prevention
        console.log('\n📝 Test 2: Duplicate Prevention - Same Topic');
        const duplicateResult = await api.post('/api/progress-tracking/update', {
            roadmapId: 'backend-development',
            topicId: 'test-topic-001',
            difficulty: 'medium'
        });

        logTest(
            'Prevent duplicate XP award',
            duplicateResult.data.data.isNewCompletion === false && duplicateResult.data.data.xpAwarded === 0,
            `Is New: ${duplicateResult.data.data.isNewCompletion}, XP Awarded: ${duplicateResult.data.data.xpAwarded}`
        );

        // Test 3: Different Difficulty Levels
        console.log('\n📝 Test 3: Different Difficulty Levels');

        const easyResult = await api.post('/api/progress-tracking/update', {
            roadmapId: 'dsa',
            topicId: 'test-topic-easy',
            difficulty: 'easy'
        });
        logTest('Easy difficulty (10 XP)', easyResult.data.data.xpAwarded === 10);

        const hardResult = await api.post('/api/progress-tracking/update', {
            roadmapId: 'dsa',
            topicId: 'test-topic-hard',
            difficulty: 'hard'
        });
        logTest('Hard difficulty (30 XP)', hardResult.data.data.xpAwarded === 30);

        const advancedResult = await api.post('/api/progress-tracking/update', {
            roadmapId: 'dsa',
            topicId: 'test-topic-advanced',
            difficulty: 'advanced'
        });
        logTest('Advanced difficulty (50 XP)', advancedResult.data.data.xpAwarded === 50);

        // Test 4: Get Progress for Roadmap
        console.log('\n📝 Test 4: Get Progress for Specific Roadmap');
        const progressResult = await api.get('/api/progress-tracking/backend-development');

        logTest(
            'Get roadmap progress',
            progressResult.data.success && progressResult.data.data.roadmapId === 'backend-development',
            `Completed Topics: ${progressResult.data.data.completedTopics}, XP Earned: ${progressResult.data.data.xpEarned}`
        );

        // Test 5: Get All Progress
        console.log('\n📝 Test 5: Get All User Progress');
        const allProgressResult = await api.get('/api/progress-tracking');

        logTest(
            'Get all progress',
            allProgressResult.data.success && Array.isArray(allProgressResult.data.data),
            `Total Roadmaps: ${allProgressResult.data.count}`
        );

        // Test 6: League Dashboard
        console.log('\n📝 Test 6: Get League Dashboard');
        const dashboardResult = await api.get('/api/xp/league');

        logTest(
            'Get league dashboard',
            dashboardResult.data.success && dashboardResult.data.data.league,
            `League: ${dashboardResult.data.data.league}, Total XP: ${dashboardResult.data.data.totalXP}, Rank: ${dashboardResult.data.data.leagueRank}`
        );

        // Test 7: Leaderboard
        console.log('\n📝 Test 7: Get Leaderboard');
        const leaderboardResult = await api.get('/api/xp/leaderboard?limit=10');

        logTest(
            'Get leaderboard',
            leaderboardResult.data.success && Array.isArray(leaderboardResult.data.data),
            `Leaderboard Entries: ${leaderboardResult.data.count}`
        );

        // Test 8: League-Specific Leaderboard
        console.log('\n📝 Test 8: Get League-Specific Leaderboard');
        const leagueLeaderboardResult = await api.get('/api/xp/leaderboard?league=Bronze&limit=5');

        logTest(
            'Get Bronze league leaderboard',
            leagueLeaderboardResult.data.success,
            `Bronze League Entries: ${leagueLeaderboardResult.data.count}`
        );

        // Test 9: User Position
        console.log('\n📝 Test 9: Get User Leaderboard Position');
        const positionResult = await api.get('/api/xp/position');

        logTest(
            'Get user position',
            positionResult.data.success && positionResult.data.data.user,
            `Rank: ${positionResult.data.data.user.rank}, XP: ${positionResult.data.data.user.totalXP}`
        );

        // Test 10: League Stats
        console.log('\n📝 Test 10: Get League Statistics');
        const statsResult = await api.get('/api/xp/league-stats');

        logTest(
            'Get league stats',
            statsResult.data.success && Array.isArray(statsResult.data.data),
            `Leagues: ${statsResult.data.data.length}`
        );

        // Test 11: Category Top Performers
        console.log('\n📝 Test 11: Get Top Performers by Category');
        const categoryResult = await api.get('/api/xp/category/backend?limit=5');

        logTest(
            'Get backend category top performers',
            categoryResult.data.success && categoryResult.data.category === 'backend',
            `Top Performers: ${categoryResult.data.data.length}`
        );

        // Test 12: Plan Completion (1.5x multiplier)
        console.log('\n📝 Test 12: Plan Completion with Multiplier');
        const planResult = await api.post('/api/progress-tracking/update', {
            roadmapId: 'frontend',
            planId: 'test-plan-001',
            difficulty: 'medium'
        });

        logTest(
            'Plan completion (1.5x multiplier)',
            planResult.data.data.xpAwarded === 30,
            `XP Awarded: ${planResult.data.data.xpAwarded} (20 * 1.5)`
        );

        // Test 13: Question Completion (0.5x multiplier)
        console.log('\n📝 Test 13: Question Completion with Multiplier');
        const questionResult = await api.post('/api/progress-tracking/update', {
            roadmapId: 'frontend',
            questionId: 'test-question-001',
            difficulty: 'medium'
        });

        logTest(
            'Question completion (0.5x multiplier)',
            questionResult.data.data.xpAwarded === 10,
            `XP Awarded: ${questionResult.data.data.xpAwarded} (20 * 0.5)`
        );

        // Test 14: Batch Update
        console.log('\n📝 Test 14: Batch Update Progress');
        const batchResult = await api.post('/api/progress-tracking/batch-update', {
            roadmapId: 'ai-machine-learning',
            activities: [
                { topicId: 'batch-topic-1', difficulty: 'easy' },
                { topicId: 'batch-topic-2', difficulty: 'medium' },
                { topicId: 'batch-topic-3', difficulty: 'hard' }
            ]
        });

        logTest(
            'Batch update',
            batchResult.data.success && batchResult.data.data.totalXPAwarded === 60,
            `Total XP: ${batchResult.data.data.totalXPAwarded}, Activities: ${batchResult.data.data.activitiesProcessed}`
        );

    } catch (error) {
        console.error('\n❌ Test Error:', error.response?.data || error.message);
        logTest('API Error', false, error.response?.data?.message || error.message);
    }

    // Print Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Test Summary');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    console.log('\n');

    process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
