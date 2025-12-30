const xpService = require('../services/xp.service');
const mongoose = require('mongoose');

/**
 * Progress Controller
 * Handles progress tracking and XP award endpoints
 */

/**
 * Update user progress and award XP
 * POST /api/progress/update
 */
async function updateProgress(req, res) {
    try {
        const userId = req.user.id;
        const { roadmapId, topicId, planId, questionId, difficulty } = req.body;

        // Validate required fields
        if (!roadmapId) {
            return res.status(400).json({
                success: false,
                message: 'Roadmap ID is required'
            });
        }

        if (!difficulty) {
            return res.status(400).json({
                success: false,
                message: 'Difficulty level is required'
            });
        }

        // Validate difficulty
        const validDifficulties = ['easy', 'medium', 'hard', 'advanced'];
        if (!validDifficulties.includes(difficulty.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}`
            });
        }

        // Determine activity type and ID
        let activityType, activityId;

        if (topicId) {
            activityType = 'topic';
            activityId = topicId;
        } else if (planId) {
            activityType = 'plan';
            activityId = planId;
        } else if (questionId) {
            activityType = 'question';
            activityId = questionId;
        } else {
            return res.status(400).json({
                success: false,
                message: 'At least one of topicId, planId, or questionId is required'
            });
        }

        // Award XP
        const result = await xpService.awardXP(
            userId,
            roadmapId,
            {
                type: activityType,
                id: activityId,
                difficulty: difficulty.toLowerCase()
            }
        );

        res.json({
            success: true,
            data: result,
            message: result.isNewCompletion
                ? `Progress updated! +${result.xpAwarded} XP awarded`
                : 'Activity already completed'
        });

    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating progress',
            error: error.message
        });
    }
}

/**
 * Get user progress for a specific roadmap
 * GET /api/progress/:roadmapId
 */
async function getProgress(req, res) {
    try {
        const userId = req.user.id;
        const { roadmapId } = req.params;

        if (!roadmapId) {
            return res.status(400).json({
                success: false,
                message: 'Roadmap ID is required'
            });
        }

        const progress = await xpService.getUserProgress(userId, roadmapId);

        res.json({
            success: true,
            data: progress
        });

    } catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching progress',
            error: error.message
        });
    }
}

/**
 * Get all user progress across all roadmaps
 * GET /api/progress
 */
async function getAllProgress(req, res) {
    try {
        const userId = req.user.id;

        const allProgress = await xpService.getAllUserProgress(userId);

        res.json({
            success: true,
            data: allProgress,
            count: allProgress.length
        });

    } catch (error) {
        console.error('Error fetching all progress:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching progress',
            error: error.message
        });
    }
}

/**
 * Batch update progress (for multiple activities at once)
 * POST /api/progress/batch-update
 */
async function batchUpdateProgress(req, res) {
    try {
        const userId = req.user.id;
        const { roadmapId, activities } = req.body;

        if (!roadmapId || !activities || !Array.isArray(activities)) {
            return res.status(400).json({
                success: false,
                message: 'Roadmap ID and activities array are required'
            });
        }

        const results = [];
        let totalXPAwarded = 0;

        // Process each activity
        for (const activity of activities) {
            const { topicId, planId, questionId, difficulty } = activity;

            let activityType, activityId;

            if (topicId) {
                activityType = 'topic';
                activityId = topicId;
            } else if (planId) {
                activityType = 'plan';
                activityId = planId;
            } else if (questionId) {
                activityType = 'question';
                activityId = questionId;
            } else {
                continue; // Skip invalid activities
            }

            const result = await xpService.awardXP(
                userId,
                roadmapId,
                {
                    type: activityType,
                    id: activityId,
                    difficulty: difficulty.toLowerCase()
                }
            );

            totalXPAwarded += result.xpAwarded;
            results.push(result);
        }

        res.json({
            success: true,
            data: {
                totalXPAwarded,
                activitiesProcessed: results.length,
                results
            },
            message: `Batch update complete! +${totalXPAwarded} XP awarded`
        });

    } catch (error) {
        console.error('Error in batch update:', error);
        res.status(500).json({
            success: false,
            message: 'Error in batch update',
            error: error.message
        });
    }
}

module.exports = {
    updateProgress,
    getProgress,
    getAllProgress,
    batchUpdateProgress
};
