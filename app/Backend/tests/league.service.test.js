/**
 * League Service Test Suite
 * Tests league assignment, ranking, and leaderboard functionality
 */

const mongoose = require('mongoose');
const { expect } = require('chai');
const leagueService = require('../services/league.service');
const UserXP = require('../models/UserXP');

describe('League Service Tests', () => {
    let testUserIds = [];

    before(async () => {
        // Connect to test database
        await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/learning_ai_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Create test users
        for (let i = 0; i < 5; i++) {
            testUserIds.push(new mongoose.Types.ObjectId());
        }
    });

    after(async () => {
        // Clean up test data
        await UserXP.deleteMany({ userId: { $in: testUserIds } });
        await mongoose.connection.close();
    });

    describe('League Assignment', () => {
        beforeEach(async () => {
            await UserXP.deleteMany({ userId: { $in: testUserIds } });
        });

        it('should assign Bronze league for 0-500 XP', async () => {
            const userXP = await UserXP.getOrCreate(testUserIds[0]);
            userXP.totalXP = 250;
            await userXP.save();

            expect(userXP.league).to.equal('Bronze');
        });

        it('should assign Silver league for 501-1500 XP', async () => {
            const userXP = await UserXP.getOrCreate(testUserIds[0]);
            userXP.totalXP = 1000;
            await userXP.save();

            expect(userXP.league).to.equal('Silver');
        });

        it('should assign Gold league for 1501-3000 XP', async () => {
            const userXP = await UserXP.getOrCreate(testUserIds[0]);
            userXP.totalXP = 2000;
            await userXP.save();

            expect(userXP.league).to.equal('Gold');
        });

        it('should assign Platinum league for 3001-6000 XP', async () => {
            const userXP = await UserXP.getOrCreate(testUserIds[0]);
            userXP.totalXP = 4500;
            await userXP.save();

            expect(userXP.league).to.equal('Platinum');
        });

        it('should assign Diamond league for 6000+ XP', async () => {
            const userXP = await UserXP.getOrCreate(testUserIds[0]);
            userXP.totalXP = 7000;
            await userXP.save();

            expect(userXP.league).to.equal('Diamond');
        });

        it('should auto-update league when XP crosses threshold', async () => {
            const userXP = await UserXP.getOrCreate(testUserIds[0]);
            userXP.totalXP = 400;
            await userXP.save();
            expect(userXP.league).to.equal('Bronze');

            // Add XP to cross threshold
            userXP.addXP(200);
            await userXP.save();
            expect(userXP.league).to.equal('Silver');
        });
    });

    describe('League Dashboard', () => {
        beforeEach(async () => {
            await UserXP.deleteMany({ userId: { $in: testUserIds } });
        });

        it('should return complete dashboard data', async () => {
            const userXP = await UserXP.getOrCreate(testUserIds[0]);
            userXP.totalXP = 1200;
            userXP.categoryXP.backend = 800;
            userXP.categoryXP.frontend = 400;
            userXP.streak.count = 5;
            await userXP.save();

            const dashboard = await leagueService.getLeagueDashboard(testUserIds[0]);

            expect(dashboard.totalXP).to.equal(1200);
            expect(dashboard.league).to.equal('Silver');
            expect(dashboard.nextLeague).to.equal('Gold');
            expect(dashboard.xpToNextLeague).to.equal(301); // 1501 - 1200
            expect(dashboard.categoryXP.backend).to.equal(800);
            expect(dashboard.streak.current).to.equal(5);
        });
    });

    describe('Leaderboard', () => {
        beforeEach(async () => {
            await UserXP.deleteMany({ userId: { $in: testUserIds } });

            // Create users with different XP
            const xpValues = [1000, 2500, 500, 4000, 1500];
            for (let i = 0; i < testUserIds.length; i++) {
                const userXP = await UserXP.getOrCreate(testUserIds[i]);
                userXP.totalXP = xpValues[i];
                await userXP.save();
            }
        });

        it('should return leaderboard sorted by XP', async () => {
            const leaderboard = await leagueService.getLeaderboard({ limit: 10 });

            expect(leaderboard.length).to.be.at.least(5);
            expect(leaderboard[0].totalXP).to.be.at.least(leaderboard[1].totalXP);
            expect(leaderboard[1].totalXP).to.be.at.least(leaderboard[2].totalXP);
        });

        it('should filter leaderboard by league', async () => {
            const leaderboard = await leagueService.getLeaderboard({
                league: 'Silver',
                limit: 10
            });

            leaderboard.forEach(entry => {
                expect(entry.league).to.equal('Silver');
            });
        });

        it('should respect limit parameter', async () => {
            const leaderboard = await leagueService.getLeaderboard({ limit: 3 });
            expect(leaderboard.length).to.be.at.most(3);
        });
    });

    describe('Ranking', () => {
        beforeEach(async () => {
            await UserXP.deleteMany({ userId: { $in: testUserIds } });

            // Create users in same league with different XP
            const xpValues = [1000, 1200, 1400, 1100, 1300];
            for (let i = 0; i < testUserIds.length; i++) {
                const userXP = await UserXP.getOrCreate(testUserIds[i]);
                userXP.totalXP = xpValues[i];
                await userXP.save();
            }
        });

        it('should calculate correct rank in league', async () => {
            const userXP = await UserXP.findOne({ userId: testUserIds[0] });
            const rank = await userXP.getRankInLeague();

            // User with 1000 XP should be ranked 5th (lowest)
            expect(rank).to.equal(5);
        });

        it('should calculate correct global rank', async () => {
            const userXP = await UserXP.findOne({ userId: testUserIds[2] });
            const rank = await userXP.getGlobalRank();

            // User with 1400 XP should be ranked 1st
            expect(rank).to.equal(1);
        });
    });

    describe('Streak Tracking', () => {
        beforeEach(async () => {
            await UserXP.deleteMany({ userId: testUserIds[0] });
        });

        it('should start streak on first activity', async () => {
            const userXP = await UserXP.getOrCreate(testUserIds[0]);
            const streakInfo = userXP.updateStreak();

            expect(streakInfo.streakContinued).to.be.true;
            expect(userXP.streak.count).to.equal(1);
        });

        it('should continue streak for next day activity', async () => {
            const userXP = await UserXP.getOrCreate(testUserIds[0]);
            userXP.streak.count = 3;
            userXP.streak.lastActive = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
            await userXP.save();

            const streakInfo = userXP.updateStreak();

            expect(streakInfo.streakContinued).to.be.true;
            expect(userXP.streak.count).to.equal(4);
        });

        it('should break streak after 48 hours', async () => {
            const userXP = await UserXP.getOrCreate(testUserIds[0]);
            userXP.streak.count = 5;
            userXP.streak.lastActive = new Date(Date.now() - 50 * 60 * 60 * 1000); // 50 hours ago
            await userXP.save();

            const streakInfo = userXP.updateStreak();

            expect(streakInfo.streakContinued).to.be.false;
            expect(userXP.streak.count).to.equal(1); // Reset to 1
        });

        it('should award bonus on 7-day streak', async () => {
            const userXP = await UserXP.getOrCreate(testUserIds[0]);
            userXP.streak.count = 6;
            userXP.streak.lastActive = new Date(Date.now() - 25 * 60 * 60 * 1000);
            await userXP.save();

            const streakInfo = userXP.updateStreak();

            expect(userXP.streak.count).to.equal(7);
            expect(streakInfo.bonusAwarded).to.be.true;
            expect(streakInfo.bonusXP).to.equal(100);
        });
    });
});

module.exports = describe;
