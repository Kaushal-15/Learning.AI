const express = require('express');
const router = express.Router();
const xpController = require('../controllers/xp.controller');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * XP and League Routes
 * All routes require authentication
 */

// Get user's league dashboard
router.get('/league', authMiddleware, xpController.getLeagueDashboard);

// Get leaderboard (global or filtered by league)
router.get('/leaderboard', authMiddleware, xpController.getLeaderboard);

// Get user's leaderboard position with context
router.get('/position', authMiddleware, xpController.getLeaderboardPosition);

// Get league statistics
router.get('/league-stats', authMiddleware, xpController.getLeagueStats);

// Get top performers by category
router.get('/category/:category', authMiddleware, xpController.getTopPerformersByCategory);

// Reset weekly XP (admin only - TODO: add admin middleware)
router.post('/reset-weekly', authMiddleware, xpController.resetWeeklyXP);

module.exports = router;
