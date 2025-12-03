const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');
const authMiddleware = require('../middleware/authMiddleware');

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

// Get user's progress for a specific roadmap
router.get('/:roadmapId', authMiddleware, async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const normalizedId = normalizeRoadmapId(roadmapId);
    const userId = req.user.id;

    let progress = await Progress.findOne({ userId, roadmapId: normalizedId });

    if (!progress) {
      // Create new progress record
      progress = new Progress({
        userId,
        roadmapId: normalizedId,
        completedLessons: [],
        currentLevel: 'Beginner',
        overallProgress: 0
      });
      await progress.save();
    }

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching progress'
    });
  }
});

// Mark lesson as completed
router.post('/complete-lesson', authMiddleware, async (req, res) => {
  try {
    const { roadmapId, lessonId, quizScore = 0, timeSpent = 0 } = req.body;
    const normalizedId = normalizeRoadmapId(roadmapId);
    const userId = req.user.id;

    let progress = await Progress.findOne({ userId, roadmapId: normalizedId });

    if (!progress) {
      progress = new Progress({
        userId,
        roadmapId: normalizedId,
        completedLessons: [],
        currentLevel: 'Beginner',
        overallProgress: 0
      });
    }

    await progress.completeLesson(lessonId, timeSpent, quizScore);
    await progress.calculateProgress();

    res.json({
      success: true,
      data: progress,
      message: 'Lesson marked as completed'
    });
  } catch (error) {
    console.error('Error completing lesson:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing lesson'
    });
  }
});

// Get all user progress
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const allProgress = await Progress.find({ userId });

    res.json({
      success: true,
      data: allProgress
    });
  } catch (error) {
    console.error('Error fetching all progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching progress'
    });
  }
});

module.exports = router;