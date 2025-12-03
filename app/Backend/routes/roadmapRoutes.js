const express = require('express');
const router = express.Router();
const Roadmap = require('../models/Roadmap');
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

// Get all roadmaps (public)
router.get('/', async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({}, {
      roadmapId: 1,
      title: 1,
      description: 1,
      skills: 1,
      'levels.levelName': 1,
      'levels.overview': 1
    });

    res.json({
      success: true,
      data: roadmaps
    });
  } catch (error) {
    console.error('Error fetching roadmaps:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching roadmaps'
    });
  }
});

// Get specific roadmap by ID
router.get('/:roadmapId', async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const normalizedId = normalizeRoadmapId(roadmapId);
    const roadmap = await Roadmap.findOne({ roadmapId: normalizedId });

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: 'Roadmap not found'
      });
    }

    res.json({
      success: true,
      data: roadmap
    });
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching roadmap'
    });
  }
});

// Get specific lesson
router.get('/:roadmapId/lessons/:lessonId', async (req, res) => {
  try {
    const { roadmapId, lessonId } = req.params;
    const normalizedId = normalizeRoadmapId(roadmapId);

    const roadmap = await Roadmap.findOne({ roadmapId: normalizedId });
    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: 'Roadmap not found'
      });
    }

    let lesson = null;
    let levelName = null;

    // Find lesson across all levels
    for (const level of roadmap.levels) {
      const foundLesson = level.lessons.find(l => l.lessonId === lessonId);
      if (foundLesson) {
        lesson = foundLesson;
        levelName = level.levelName;
        break;
      }
    }

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    res.json({
      success: true,
      data: {
        roadmapTitle: roadmap.title,
        levelName,
        lesson
      }
    });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lesson'
    });
  }
});

// Get user's roadmap progress (protected)
router.get('/:roadmapId/progress', authMiddleware, async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const userId = req.user.id;

    // Get user's progress from learner data
    const Learner = require('../models/Learner');
    const User = require('../models/User');

    const user = await User.findById(userId);
    const learner = await Learner.findOne({ email: user.email });

    if (!learner) {
      return res.json({
        success: true,
        data: {
          completedLessons: [],
          currentLevel: 'Beginner',
          overallProgress: 0
        }
      });
    }

    // Calculate progress based on category mastery
    const normalizedId = normalizeRoadmapId(roadmapId);
    const roadmap = await Roadmap.findOne({ roadmapId: normalizedId });
    if (!roadmap) {
      return res.status(404).json({
        success: false,
        message: 'Roadmap not found'
      });
    }

    const completedLessons = [];
    let totalLessons = 0;
    let currentLevel = 'Beginner';

    // Count total lessons and determine current level
    roadmap.levels.forEach(level => {
      totalLessons += level.lessons.length;

      // Simple logic: if user has some mastery, they're at intermediate
      if (learner.categoryMastery && learner.categoryMastery.size > 0) {
        const avgMastery = Array.from(learner.categoryMastery.values())
          .reduce((sum, mastery) => sum + mastery.level, 0) / learner.categoryMastery.size;

        if (avgMastery >= 70) currentLevel = 'Advanced';
        else if (avgMastery >= 40) currentLevel = 'Intermediate';
      }
    });

    const overallProgress = Math.round((completedLessons.length / totalLessons) * 100);

    res.json({
      success: true,
      data: {
        completedLessons,
        currentLevel,
        overallProgress,
        totalLessons
      }
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching progress'
    });
  }
});

module.exports = router;