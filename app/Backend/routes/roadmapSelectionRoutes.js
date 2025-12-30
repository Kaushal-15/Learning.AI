const express = require('express');
const router = express.Router();
const Learner = require('../models/Learner');
const User = require('../models/User');
const Progress = require('../models/Progress');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/roadmap-selection/select - Initial roadmap selection (after signup)
router.post('/select', authMiddleware, async (req, res) => {
    try {
        const { selectedRoadmap, skillLevel, learningTimeline } = req.body;
        const userEmail = req.user.email;

        console.log('Roadmap selection request:', {
            userEmail,
            selectedRoadmap,
            skillLevel,
            learningTimeline
        });

        if (!selectedRoadmap) {
            return res.status(400).json({ message: 'Roadmap selection is required' });
        }

        // Find learner by email
        const learner = await Learner.findOne({ email: userEmail });
        if (!learner) {
            return res.status(404).json({ message: 'Learner profile not found' });
        }

        // Update learner with roadmap selection
        learner.currentRoadmapId = selectedRoadmap;
        learner.roadmapHistory.push({
            roadmapId: selectedRoadmap,
            status: 'active',
            startedAt: new Date()
        });

        // Store skill level and timeline in preferences if needed
        if (skillLevel) {
            learner.preferences.skillLevel = skillLevel;
        }
        if (learningTimeline) {
            learner.preferences.learningTimeline = learningTimeline;
        }

        await learner.save();

        // Sync with User model for Dashboard compatibility
        await User.findByIdAndUpdate(req.user.id, {
            selectedRoadmap: selectedRoadmap,
            skillLevel: skillLevel,
            learningTimeline: learningTimeline,
            hasCompletedOnboarding: true
        });

        // Create initial progress record for this roadmap
        const existingProgress = await Progress.findOne({
            userId: req.user.id,
            roadmapId: selectedRoadmap
        });

        if (!existingProgress) {
            const newProgress = new Progress({
                userId: req.user.id,
                roadmapId: selectedRoadmap,
                currentLevel: skillLevel === 'beginner' ? 'Beginner' :
                    skillLevel === 'intermediate' ? 'Intermediate' : 'Advanced',
                overallProgress: 0
            });
            await newProgress.save();
        }

        res.status(200).json({
            message: 'Roadmap selected successfully',
            roadmapId: selectedRoadmap,
            learner: {
                currentRoadmapId: learner.currentRoadmapId,
                roadmapHistory: learner.roadmapHistory
            }
        });

    } catch (error) {
        console.error('Roadmap selection error:', error);
        res.status(500).json({ message: 'Failed to save roadmap selection' });
    }
});

// POST /api/roadmap-selection/change - Change roadmap (pause current, activate new)
router.post('/change', authMiddleware, async (req, res) => {
    try {
        const { newRoadmapId, skillLevel, learningTimeline } = req.body;
        const userEmail = req.user.email;

        if (!newRoadmapId) {
            return res.status(400).json({ message: 'New roadmap ID is required' });
        }

        // Find learner by email
        const learner = await Learner.findOne({ email: userEmail });
        if (!learner) {
            return res.status(404).json({ message: 'Learner profile not found' });
        }

        const currentRoadmapId = learner.currentRoadmapId;

        // Check if user is already on this roadmap
        if (currentRoadmapId === newRoadmapId) {
            return res.status(400).json({ message: 'You are already on this roadmap' });
        }

        // Pause current roadmap if exists
        if (currentRoadmapId) {
            const currentRoadmapEntry = learner.roadmapHistory.find(
                entry => entry.roadmapId === currentRoadmapId && entry.status === 'active'
            );

            if (currentRoadmapEntry) {
                currentRoadmapEntry.status = 'paused';
                currentRoadmapEntry.pausedAt = new Date();
            }
        }

        // Check if user has previously started this roadmap
        const existingRoadmapEntry = learner.roadmapHistory.find(
            entry => entry.roadmapId === newRoadmapId
        );

        if (existingRoadmapEntry) {
            // Resume existing roadmap
            existingRoadmapEntry.status = 'active';
            existingRoadmapEntry.pausedAt = null;
        } else {
            // Add new roadmap to history
            learner.roadmapHistory.push({
                roadmapId: newRoadmapId,
                status: 'active',
                startedAt: new Date()
            });
        }

        // Update current roadmap
        learner.currentRoadmapId = newRoadmapId;

        // Update preferences if provided
        if (skillLevel) {
            learner.preferences.skillLevel = skillLevel;
        }
        if (learningTimeline) {
            learner.preferences.learningTimeline = learningTimeline;
        }

        await learner.save();

        // Sync with User model for Dashboard compatibility
        await User.findByIdAndUpdate(req.user.id, {
            selectedRoadmap: newRoadmapId,
            skillLevel: skillLevel || undefined,
            learningTimeline: learningTimeline || undefined
        });

        // Create or update progress record for new roadmap
        const existingProgress = await Progress.findOne({
            userId: req.user.id,
            roadmapId: newRoadmapId
        });

        if (!existingProgress) {
            const newProgress = new Progress({
                userId: req.user.id,
                roadmapId: newRoadmapId,
                currentLevel: skillLevel === 'beginner' ? 'Beginner' :
                    skillLevel === 'intermediate' ? 'Intermediate' : 'Advanced',
                overallProgress: 0
            });
            await newProgress.save();
        }

        res.status(200).json({
            message: 'Roadmap changed successfully',
            previousRoadmapId: currentRoadmapId,
            newRoadmapId: newRoadmapId,
            learner: {
                currentRoadmapId: learner.currentRoadmapId,
                roadmapHistory: learner.roadmapHistory
            }
        });

    } catch (error) {
        console.error('Roadmap change error:', error);
        res.status(500).json({ message: 'Failed to change roadmap' });
    }
});

// GET /api/roadmap-selection/history - Get user's roadmap history
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;

        const learner = await Learner.findOne({ email: userEmail });
        if (!learner) {
            return res.status(404).json({ message: 'Learner profile not found' });
        }

        res.status(200).json({
            currentRoadmapId: learner.currentRoadmapId,
            roadmapHistory: learner.roadmapHistory
        });

    } catch (error) {
        console.error('Roadmap history error:', error);
        res.status(500).json({ message: 'Failed to fetch roadmap history' });
    }
});

// GET /api/roadmap-selection/current - Get current roadmap details
router.get('/current', authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;

        const learner = await Learner.findOne({ email: userEmail });
        if (!learner) {
            return res.status(404).json({ message: 'Learner profile not found' });
        }

        if (!learner.currentRoadmapId) {
            return res.status(200).json({
                hasRoadmap: false,
                message: 'No roadmap selected yet'
            });
        }

        // Get progress for current roadmap
        const progress = await Progress.findOne({
            userId: req.user.id,
            roadmapId: learner.currentRoadmapId
        });

        res.status(200).json({
            hasRoadmap: true,
            currentRoadmapId: learner.currentRoadmapId,
            progress: progress || null
        });

    } catch (error) {
        console.error('Current roadmap error:', error);
        res.status(500).json({ message: 'Failed to fetch current roadmap' });
    }
});

module.exports = router;
