const express = require('express');
const router = express.Router();
const ContentCache = require('../models/ContentCache');
const contentGenerator = require('../services/contentGenerator');

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

/**
 * Validate content generation request
 */
const validateRequest = (req, res, next) => {
    const { roadmap, day, topic, subtopic, content_type } = req.body;

    // Check required fields
    if (!roadmap || !day || !topic || !subtopic || !content_type) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: roadmap, day, topic, subtopic, content_type'
        });
    }

    // Validate content_type
    const validTypes = ['text', 'video', 'audio', 'image', 'flashcards', 'full_module'];
    if (!validTypes.includes(content_type)) {
        return res.status(400).json({
            success: false,
            message: `Invalid content_type. Must be one of: ${validTypes.join(', ')}`
        });
    }

    // Validate day is a positive number
    if (isNaN(day) || day < 1) {
        return res.status(400).json({
            success: false,
            message: 'Day must be a positive number'
        });
    }

    next();
};

/**
 * POST /api/content/generate
 * Generate learning content dynamically
 */
router.post('/generate', validateRequest, async (req, res) => {
    try {
        const { roadmap, day, topic, subtopic, content_type } = req.body;
        const normalizedRoadmap = normalizeRoadmapId(roadmap);

        console.log(`[Content Generation] Request: ${roadmap} - Day ${day} - ${subtopic} (${content_type})`);

        // 1. Check cache first
        const cached = await ContentCache.findCached({
            roadmap: normalizedRoadmap,
            day: parseInt(day),
            topic,
            subtopic,
            content_type
        });

        if (cached) {
            console.log(`[Content Generation] Cache HIT for ${subtopic} (${content_type})`);
            return res.json({
                success: true,
                cached: true,
                data: cached.generatedContent
            });
        }

        console.log(`[Content Generation] Cache MISS - Generating new content...`);

        // 2. Check if at least one API key is configured (Groq or Gemini)
        if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
            return res.status(503).json({
                success: false,
                message: 'Content generation service is not configured. Please add GROQ_API_KEY or GEMINI_API_KEY to your .env file.'
            });
        }

        // 3. Generate new content
        const generatedContent = await contentGenerator.generate({
            roadmap: normalizedRoadmap,
            day: parseInt(day),
            topic,
            subtopic,
            content_type
        });

        // 4. Cache the generated content
        await ContentCache.cacheContent(
            {
                roadmap: normalizedRoadmap,
                day: parseInt(day),
                topic,
                subtopic,
                content_type
            },
            generatedContent
        );

        console.log(`[Content Generation] Successfully generated and cached ${content_type} content for ${subtopic}`);

        // 5. Return the generated content
        res.json({
            success: true,
            cached: false,
            data: generatedContent
        });

    } catch (error) {
        console.error('[Content Generation] Error:', error);

        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate content. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
        });
    }
});

/**
 * GET /api/content/cache/stats
 * Get cache statistics (for debugging/monitoring)
 */
router.get('/cache/stats', async (req, res) => {
    try {
        const totalCached = await ContentCache.countDocuments();
        const byType = await ContentCache.aggregate([
            {
                $group: {
                    _id: '$content_type',
                    count: { $sum: 1 }
                }
            }
        ]);

        const byRoadmap = await ContentCache.aggregate([
            {
                $group: {
                    _id: '$roadmap',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            stats: {
                totalCached,
                byType: byType.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                byRoadmap: byRoadmap.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('[Cache Stats] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve cache statistics'
        });
    }
});

/**
 * DELETE /api/content/cache/clear
 * Clear all cached content (admin only)
 */
router.delete('/cache/clear', async (req, res) => {
    try {
        const result = await ContentCache.deleteMany({});

        res.json({
            success: true,
            message: `Cleared ${result.deletedCount} cached items`
        });
    } catch (error) {
        console.error('[Cache Clear] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear cache'
        });
    }
});

module.exports = router;
