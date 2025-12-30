/**
 * XP Service Test Suite
 * Tests XP calculation, category pooling, and duplicate prevention
 */

const mongoose = require('mongoose');
const { expect } = require('chai');
const xpService = require('../services/xp.service');
const UserProgress = require('../models/UserProgress');
const UserXP = require('../models/UserXP');
const Roadmap = require('../models/Roadmap');

describe('XP Service Tests', () => {
    let testUserId;

    before(async () => {
        // Connect to test database
        await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/learning_ai_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Create test user ID
        testUserId = new mongoose.Types.ObjectId();
    });

    after(async () => {
        // Clean up test data
        await UserProgress.deleteMany({ userId: testUserId });
        await UserXP.deleteMany({ userId: testUserId });
        await mongoose.connection.close();
    });

    describe('XP Calculation', () => {
        it('should award 10 XP for easy difficulty', () => {
            const xp = xpService.calculateXP('easy', 'topic');
            expect(xp).to.equal(10);
        });

        it('should award 20 XP for medium difficulty', () => {
            const xp = xpService.calculateXP('medium', 'topic');
            expect(xp).to.equal(20);
        });

        it('should award 30 XP for hard difficulty', () => {
            const xp = xpService.calculateXP('hard', 'topic');
            expect(xp).to.equal(30);
        });

        it('should award 50 XP for advanced difficulty', () => {
            const xp = xpService.calculateXP('advanced', 'topic');
            expect(xp).to.equal(50);
        });

        it('should apply activity multiplier for plans (1.5x)', () => {
            const xp = xpService.calculateXP('medium', 'plan');
            expect(xp).to.equal(30); // 20 * 1.5
        });

        it('should apply activity multiplier for questions (0.5x)', () => {
            const xp = xpService.calculateXP('medium', 'question');
            expect(xp).to.equal(10); // 20 * 0.5
        });
    });

    describe('Category Mapping', () => {
        it('should map DSA roadmap to dsa category', () => {
            const category = xpService.getRoadmapCategory('dsa');
            expect(category).to.equal('dsa');
        });

        it('should map backend roadmap to backend category', () => {
            const category = xpService.getRoadmapCategory('backend-development');
            expect(category).to.equal('backend');
        });

        it('should map full-stack to backend category', () => {
            const category = xpService.getRoadmapCategory('full-stack-development');
            expect(category).to.equal('backend');
        });

        it('should return null for unknown roadmap', () => {
            const category = xpService.getRoadmapCategory('unknown-roadmap');
            expect(category).to.be.null;
        });
    });

    describe('Award XP', () => {
        beforeEach(async () => {
            // Clean up before each test
            await UserProgress.deleteMany({ userId: testUserId });
            await UserXP.deleteMany({ userId: testUserId });
        });

        it('should award XP for first topic completion', async () => {
            const result = await xpService.awardXP(
                testUserId,
                'backend-development',
                {
                    type: 'topic',
                    id: 'topic-1',
                    difficulty: 'medium'
                }
            );

            expect(result.isNewCompletion).to.be.true;
            expect(result.xpAwarded).to.equal(20);
            expect(result.totalXP).to.equal(20);
            expect(result.league).to.equal('Bronze');
        });

        it('should not award duplicate XP for same topic', async () => {
            // First completion
            await xpService.awardXP(testUserId, 'backend-development', {
                type: 'topic',
                id: 'topic-1',
                difficulty: 'medium'
            });

            // Attempt duplicate
            const result = await xpService.awardXP(testUserId, 'backend-development', {
                type: 'topic',
                id: 'topic-1',
                difficulty: 'medium'
            });

            expect(result.isNewCompletion).to.be.false;
            expect(result.xpAwarded).to.equal(0);
            expect(result.totalXP).to.equal(20); // Still only 20 from first completion
        });

        it('should pool XP to category', async () => {
            const result = await xpService.awardXP(testUserId, 'backend-development', {
                type: 'topic',
                id: 'topic-1',
                difficulty: 'hard'
            });

            expect(result.categoryXP).to.equal(30);

            const userXP = await UserXP.findOne({ userId: testUserId });
            expect(userXP.categoryXP.backend).to.equal(30);
        });

        it('should award streak bonus after 7 days', async () => {
            const userXP = await UserXP.getOrCreate(testUserId);
            userXP.streak.count = 6;
            userXP.streak.lastActive = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
            await userXP.save();

            const result = await xpService.awardXP(testUserId, 'dsa', {
                type: 'topic',
                id: 'topic-streak',
                difficulty: 'easy'
            });

            expect(result.streakInfo.bonusAwarded).to.be.true;
            expect(result.streakInfo.bonusXP).to.equal(100);
            expect(result.totalXP).to.equal(110); // 10 + 100 bonus
        });
    });

    describe('Progress Tracking', () => {
        beforeEach(async () => {
            await UserProgress.deleteMany({ userId: testUserId });
            await UserXP.deleteMany({ userId: testUserId });
        });

        it('should track completed topics count', async () => {
            await xpService.awardXP(testUserId, 'dsa', {
                type: 'topic',
                id: 'topic-1',
                difficulty: 'easy'
            });

            await xpService.awardXP(testUserId, 'dsa', {
                type: 'topic',
                id: 'topic-2',
                difficulty: 'easy'
            });

            const progress = await xpService.getUserProgress(testUserId, 'dsa');
            expect(progress.completedTopics).to.equal(2);
        });

        it('should track completed plans count', async () => {
            await xpService.awardXP(testUserId, 'frontend', {
                type: 'plan',
                id: 'plan-1',
                difficulty: 'medium'
            });

            const progress = await xpService.getUserProgress(testUserId, 'frontend');
            expect(progress.completedPlans).to.equal(1);
        });
    });
});

module.exports = describe;
