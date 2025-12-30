const UserXP = require('../models/UserXP');
const { LEAGUE_THRESHOLDS } = require('../models/UserXP');

/**
 * League Service
 * Handles league management, rankings, and leaderboards
 */

/**
 * Get user's league dashboard
 * @param {ObjectId} userId - User's MongoDB ObjectId
 * @returns {Object} - League dashboard data
 */
async function getLeagueDashboard(userId) {
    const userXP = await UserXP.getOrCreate(userId);

    // Get user's rank in their league
    const leagueRank = await userXP.getRankInLeague();

    // Get user's global rank
    const globalRank = await userXP.getGlobalRank();

    // Get total users in league
    const totalInLeague = await UserXP.countDocuments({ league: userXP.league });

    // Get next league threshold
    const nextLeague = getNextLeague(userXP.league);
    const nextThreshold = nextLeague ? LEAGUE_THRESHOLDS[nextLeague.toUpperCase()] : null;
    const xpToNextLeague = nextThreshold ? Math.max(0, nextThreshold - userXP.totalXP) : 0;

    return {
        totalXP: userXP.totalXP,
        weeklyXP: userXP.weeklyXP,
        league: userXP.league,
        leagueRank,
        globalRank,
        totalInLeague,
        nextLeague,
        xpToNextLeague,
        categoryXP: userXP.categoryXP,
        streak: {
            current: userXP.streak.count,
            longest: userXP.streak.longestStreak,
            lastActive: userXP.streak.lastActive
        }
    };
}

/**
 * Get next league tier
 * @param {String} currentLeague - Current league name
 * @returns {String|null} - Next league name or null if at max
 */
function getNextLeague(currentLeague) {
    const leagues = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    const currentIndex = leagues.indexOf(currentLeague);

    if (currentIndex === -1 || currentIndex === leagues.length - 1) {
        return null;
    }

    return leagues[currentIndex + 1];
}

/**
 * Get leaderboard
 * @param {Object} options - Leaderboard options
 * @param {String} options.league - Filter by league (optional)
 * @param {Number} options.limit - Number of results (default: 50)
 * @param {Number} options.skip - Number to skip for pagination (default: 0)
 * @param {String} options.sortBy - Sort field (totalXP or weeklyXP, default: totalXP)
 * @returns {Array} - Leaderboard entries
 */
async function getLeaderboard(options = {}) {
    const {
        league = null,
        limit = 50,
        skip = 0,
        sortBy = 'totalXP'
    } = options;

    const query = league ? { league } : {};
    const sortField = sortBy === 'weeklyXP' ? { weeklyXP: -1 } : { totalXP: -1 };

    const leaderboard = await UserXP.find(query)
        .sort(sortField)
        .limit(Math.min(limit, 100)) // Cap at 100
        .skip(skip)
        .populate('userId', 'name email')
        .lean();

    // Add rank to each entry
    return leaderboard.map((entry, index) => ({
        rank: skip + index + 1,
        userId: entry.userId?._id,
        name: entry.userId?.name || 'Anonymous',
        email: entry.userId?.email,
        totalXP: entry.totalXP,
        weeklyXP: entry.weeklyXP,
        league: entry.league,
        streak: entry.streak.count
    }));
}

/**
 * Get user's position in leaderboard
 * @param {ObjectId} userId - User's MongoDB ObjectId
 * @param {String} league - League to check (optional, defaults to user's league)
 * @returns {Object} - User's leaderboard position with context
 */
async function getUserLeaderboardPosition(userId, league = null) {
    const userXP = await UserXP.getOrCreate(userId);
    const targetLeague = league || userXP.league;

    // Get users above this user in the leaderboard
    const usersAbove = await UserXP.find({
        league: targetLeague,
        totalXP: { $gt: userXP.totalXP }
    })
        .sort({ totalXP: -1 })
        .limit(3)
        .populate('userId', 'name')
        .lean();

    // Get users below this user in the leaderboard
    const usersBelow = await UserXP.find({
        league: targetLeague,
        totalXP: { $lt: userXP.totalXP }
    })
        .sort({ totalXP: -1 })
        .limit(3)
        .populate('userId', 'name')
        .lean();

    const rank = await userXP.getRankInLeague();

    return {
        user: {
            rank,
            totalXP: userXP.totalXP,
            league: userXP.league
        },
        usersAbove: usersAbove.map((u, i) => ({
            rank: rank - usersAbove.length + i,
            name: u.userId?.name || 'Anonymous',
            totalXP: u.totalXP,
            xpDifference: u.totalXP - userXP.totalXP
        })),
        usersBelow: usersBelow.map((u, i) => ({
            rank: rank + i + 1,
            name: u.userId?.name || 'Anonymous',
            totalXP: u.totalXP,
            xpDifference: userXP.totalXP - u.totalXP
        }))
    };
}

/**
 * Get league statistics
 * @returns {Object} - Statistics for all leagues
 */
async function getLeagueStats() {
    const stats = await UserXP.aggregate([
        {
            $group: {
                _id: '$league',
                count: { $sum: 1 },
                avgXP: { $avg: '$totalXP' },
                minXP: { $min: '$totalXP' },
                maxXP: { $max: '$totalXP' }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);

    return stats.map(stat => ({
        league: stat._id,
        userCount: stat.count,
        averageXP: Math.round(stat.avgXP),
        minXP: stat.minXP,
        maxXP: stat.maxXP,
        threshold: LEAGUE_THRESHOLDS[stat._id.toUpperCase()]
    }));
}

/**
 * Reset weekly XP for all users
 * Used for weekly leaderboard competitions
 * @returns {Object} - Reset statistics
 */
async function resetWeeklyXP() {
    const result = await UserXP.updateMany(
        {},
        {
            $set: {
                weeklyXP: 0,
                lastWeeklyReset: new Date()
            }
        }
    );

    return {
        usersReset: result.modifiedCount,
        resetAt: new Date()
    };
}

/**
 * Get top performers by category
 * @param {String} category - Category name (dsa, backend, etc.)
 * @param {Number} limit - Number of results (default: 10)
 * @returns {Array} - Top performers in category
 */
async function getTopPerformersByCategory(category, limit = 10) {
    const categoryField = `categoryXP.${category}`;

    const topPerformers = await UserXP.find({
        [categoryField]: { $gt: 0 }
    })
        .sort({ [categoryField]: -1 })
        .limit(limit)
        .populate('userId', 'name')
        .lean();

    return topPerformers.map((entry, index) => ({
        rank: index + 1,
        name: entry.userId?.name || 'Anonymous',
        categoryXP: entry.categoryXP[category],
        totalXP: entry.totalXP,
        league: entry.league
    }));
}

module.exports = {
    getLeagueDashboard,
    getLeaderboard,
    getUserLeaderboardPosition,
    getLeagueStats,
    resetWeeklyXP,
    getTopPerformersByCategory,
    getNextLeague
};
