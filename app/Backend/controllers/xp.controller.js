const leagueService = require('../services/league.service');

/**
 * XP Controller
 * Handles XP and league-related endpoints
 */

/**
 * Get user's league dashboard
 * GET /api/xp/league
 */
async function getLeagueDashboard(req, res) {
    try {
        const userId = req.user.id;

        const dashboard = await leagueService.getLeagueDashboard(userId);

        res.json({
            success: true,
            data: dashboard
        });

    } catch (error) {
        console.error('Error fetching league dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching league dashboard',
            error: error.message
        });
    }
}

/**
 * Get leaderboard
 * GET /api/xp/leaderboard
 * Query params: league, limit, skip, sortBy
 */
async function getLeaderboard(req, res) {
    try {
        const { league, limit, skip, sortBy } = req.query;

        const options = {
            league: league || null,
            limit: parseInt(limit) || 50,
            skip: parseInt(skip) || 0,
            sortBy: sortBy || 'totalXP'
        };

        const leaderboard = await leagueService.getLeaderboard(options);

        res.json({
            success: true,
            data: leaderboard,
            count: leaderboard.length,
            filters: {
                league: options.league,
                sortBy: options.sortBy
            }
        });

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leaderboard',
            error: error.message
        });
    }
}

/**
 * Get user's leaderboard position with context
 * GET /api/xp/position
 */
async function getLeaderboardPosition(req, res) {
    try {
        const userId = req.user.id;
        const { league } = req.query;

        const position = await leagueService.getUserLeaderboardPosition(userId, league);

        res.json({
            success: true,
            data: position
        });

    } catch (error) {
        console.error('Error fetching leaderboard position:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leaderboard position',
            error: error.message
        });
    }
}

/**
 * Get league statistics
 * GET /api/xp/league-stats
 */
async function getLeagueStats(req, res) {
    try {
        const stats = await leagueService.getLeagueStats();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error fetching league stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching league stats',
            error: error.message
        });
    }
}

/**
 * Get top performers by category
 * GET /api/xp/category/:category
 */
async function getTopPerformersByCategory(req, res) {
    try {
        const { category } = req.params;
        const { limit } = req.query;

        const validCategories = ['dsa', 'backend', 'frontend', 'mobile', 'database', 'ai', 'devops', 'cybersecurity'];

        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
            });
        }

        const topPerformers = await leagueService.getTopPerformersByCategory(
            category,
            parseInt(limit) || 10
        );

        res.json({
            success: true,
            data: topPerformers,
            category
        });

    } catch (error) {
        console.error('Error fetching top performers:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching top performers',
            error: error.message
        });
    }
}

/**
 * Reset weekly XP (admin only)
 * POST /api/xp/reset-weekly
 */
async function resetWeeklyXP(req, res) {
    try {
        // TODO: Add admin authentication check
        // For now, anyone can trigger this - should be restricted in production

        const result = await leagueService.resetWeeklyXP();

        res.json({
            success: true,
            data: result,
            message: 'Weekly XP reset successfully'
        });

    } catch (error) {
        console.error('Error resetting weekly XP:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting weekly XP',
            error: error.message
        });
    }
}

module.exports = {
    getLeagueDashboard,
    getLeaderboard,
    getLeaderboardPosition,
    getLeagueStats,
    getTopPerformersByCategory,
    resetWeeklyXP
};
