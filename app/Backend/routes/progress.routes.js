const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progress.controller');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Progress Routes
 * All routes require authentication
 */

// Update progress and award XP
router.post('/update', authMiddleware, progressController.updateProgress);

// Batch update progress
router.post('/batch-update', authMiddleware, progressController.batchUpdateProgress);

// Get progress for specific roadmap
router.get('/:roadmapId', authMiddleware, progressController.getProgress);

// Get all user progress
router.get('/', authMiddleware, progressController.getAllProgress);

module.exports = router;
