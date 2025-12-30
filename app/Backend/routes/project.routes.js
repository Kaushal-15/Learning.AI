const express = require('express');
const router = express.Router();
const Roadmap = require('../models/Roadmap');
const UserProgress = require('../models/UserProgress');
const authMiddleware = require('../middleware/authMiddleware');

// @desc    Get projects for a roadmap
// @route   GET /api/projects/:roadmapId
// @access  Private
router.get('/:roadmapId', authMiddleware, async (req, res) => {
    try {
        const { roadmapId } = req.params;
        const roadmap = await Roadmap.findOne({ roadmapId });

        if (!roadmap) {
            return res.status(404).json({ success: false, message: 'Roadmap not found' });
        }

        // Get user's progress to check submission status
        const progress = await UserProgress.findOne({ userId: req.user._id, roadmapId });

        const projectsWithStatus = roadmap.projects.map(project => {
            const submission = progress?.submittedProjects?.find(p => p.projectId === project.id);
            return {
                ...project.toObject(),
                isCompleted: !!submission,
                submissionUrl: submission?.submissionUrl,
                submittedAt: submission?.submittedAt
            };
        });

        res.json({
            success: true,
            data: projectsWithStatus
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @desc    Submit a project
// @route   POST /api/projects/:roadmapId/submit
// @access  Private
router.post('/:roadmapId/submit', authMiddleware, async (req, res) => {
    try {
        const { roadmapId } = req.params;
        const { projectId, submissionUrl } = req.body;

        if (!projectId || !submissionUrl) {
            return res.status(400).json({ success: false, message: 'Project ID and Submission URL are required' });
        }

        let progress = await UserProgress.findOne({ userId: req.user._id, roadmapId });

        if (!progress) {
            progress = new UserProgress({
                userId: req.user._id,
                roadmapId,
                completedTopics: [],
                completedPlans: [],
                completedQuestions: [],
                submittedProjects: []
            });
        }

        const isNewSubmission = progress.submitProject(projectId, submissionUrl);

        // Add XP for project submission (e.g., 500 XP)
        if (isNewSubmission) {
            progress.addXP(500);
        }

        await progress.save();

        res.json({
            success: true,
            message: 'Project submitted successfully',
            data: {
                projectId,
                submissionUrl,
                isNewSubmission,
                xpEarned: isNewSubmission ? 500 : 0
            }
        });
    } catch (error) {
        console.error('Error submitting project:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
