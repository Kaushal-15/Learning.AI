const express = require('express');
const router = express.Router();
const DailyLearningPlan = require('../models/DailyLearningPlan');

// Map frontend roadmapId to database roadmapId format
const normalizeRoadmapId = (roadmapId) => {
    const roadmapMapping = {
        'full-stack': 'full-stack-development',
        'frontend': 'frontend-development',
        'backend': 'backend-development',
        'mobile': 'mobile-app-development',
        'database': 'database-data-science',
        'cybersecurity': 'cybersecurity',
        'devops': 'devops-cloud',
        'ai-ml': 'ai-machine-learning'
    };

    return roadmapMapping[roadmapId] || roadmapId;
};

// Get all content for a specific roadmap
router.get('/:roadmapId', async (req, res) => {
    try {
        const { roadmapId } = req.params;
        const normalizedId = normalizeRoadmapId(roadmapId);
        const content = await DailyLearningPlan.getByRoadmap(normalizedId);

        res.json({
            success: true,
            count: content.length,
            data: content
        });
    } catch (error) {
        console.error('Error fetching roadmap content:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching learning content'
        });
    }
});

// Get specific day's content
router.get('/:roadmapId/day/:day', async (req, res) => {
    try {
        const { roadmapId, day } = req.params;
        const normalizedId = normalizeRoadmapId(roadmapId);
        const content = await DailyLearningPlan.getDay(normalizedId, parseInt(day));

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found for this day'
            });
        }

        res.json({
            success: true,
            data: content
        });
    } catch (error) {
        console.error('Error fetching day content:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching day content'
        });
    }
});

// Get week's content
router.get('/:roadmapId/week/:week', async (req, res) => {
    try {
        const { roadmapId, week } = req.params;
        const normalizedId = normalizeRoadmapId(roadmapId);
        const content = await DailyLearningPlan.getWeek(normalizedId, parseInt(week));

        res.json({
            success: true,
            count: content.length,
            data: content
        });
    } catch (error) {
        console.error('Error fetching week content:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching week content'
        });
    }
});

// Get specific learning mode for a day
router.get('/:roadmapId/day/:day/mode/:mode', async (req, res) => {
    try {
        const { roadmapId, day, mode } = req.params;
        const normalizedId = normalizeRoadmapId(roadmapId);
        const content = await DailyLearningPlan.getDay(normalizedId, parseInt(day));

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found for this day'
            });
        }

        // Validate mode
        const validModes = ['text', 'video', 'audio', 'images'];
        if (!validModes.includes(mode)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid learning mode. Must be one of: text, video, audio, images'
            });
        }

        res.json({
            success: true,
            data: {
                roadmapId: content.roadmapId,
                day: content.day,
                topic: content.topic,
                mode: mode,
                content: content.learningOptions[mode]
            }
        });
    } catch (error) {
        console.error('Error fetching mode content:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching learning mode content'
        });
    }
});

// Get content by difficulty level
router.get('/:roadmapId/difficulty/:level', async (req, res) => {
    try {
        const { roadmapId, level } = req.params;
        const normalizedId = normalizeRoadmapId(roadmapId);

        // Validate difficulty level
        const validLevels = ['Beginner', 'Intermediate', 'Advanced'];
        if (!validLevels.includes(level)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid difficulty level. Must be one of: Beginner, Intermediate, Advanced'
            });
        }

        const content = await DailyLearningPlan.getByDifficulty(normalizedId, level);

        res.json({
            success: true,
            count: content.length,
            data: content
        });
    } catch (error) {
        console.error('Error fetching difficulty content:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching content by difficulty'
        });
    }
});

// Get roadmap statistics
router.get('/:roadmapId/stats', async (req, res) => {
    try {
        const { roadmapId } = req.params;
        const normalizedId = normalizeRoadmapId(roadmapId);
        const allContent = await DailyLearningPlan.getByRoadmap(normalizedId);

        const stats = {
            totalDays: allContent.length,
            totalWeeks: Math.ceil(allContent.length / 7),
            difficultyBreakdown: {
                Beginner: allContent.filter(c => c.difficultyLevel === 'Beginner').length,
                Intermediate: allContent.filter(c => c.difficultyLevel === 'Intermediate').length,
                Advanced: allContent.filter(c => c.difficultyLevel === 'Advanced').length
            },
            topics: [...new Set(allContent.map(c => c.topic))]
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching roadmap stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching roadmap statistics'
        });
    }
});

module.exports = router;
