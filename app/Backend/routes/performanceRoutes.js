const express = require('express');
const router = express.Router();
const Performance = require('../models/Performance');
const Learner = require('../models/Learner');
const User = require('../models/User');

// Helper to resolve caller's learner record and admin status
async function getAuthLearner(req) {
  const user = await User.findById(req.user.id || req.user._id);
  if (!user) return { user: null, learner: null, isAdmin: false };
  const isAdmin = user.role === 'admin';
  const learner = await Learner.findOne({ email: user.email });
  return { user, learner, isAdmin };
}

// Create a new performance record
router.post('/', async (req, res) => {
  try {
    const { learner, isAdmin } = await getAuthLearner(req);
    
    let targetLearnerId = req.body.learnerId;
    if (!isAdmin) {
      if (!learner) {
        return res.status(403).json({
          success: false,
          message: 'No learner profile found for this user'
        });
      }
      targetLearnerId = learner._id;
    }

    const {
      questionId,
      selectedAnswer,
      correct,
      timeSpent,
      hintsUsed,
      difficulty,
      category,
      sessionId,
      confidenceLevel,
      deviceType
    } = req.body;

    const performance = new Performance({
      learnerId: targetLearnerId,
      questionId: questionId || '507f1f77bcf86cd799439011',
      selectedAnswer,
      correct,
      timeSpent,
      hintsUsed: hintsUsed || 0,
      difficulty,
      category,
      sessionId,
      confidenceLevel,
      deviceType: deviceType || 'desktop'
    });

    await performance.save();

    // Update learner's category mastery and overall stats
    if (targetLearnerId) {
      const targetLearner = await Learner.findById(targetLearnerId);
      if (targetLearner) {
        await targetLearner.updateCategoryMastery(category[0], correct, timeSpent);
        await targetLearner.updateOverallStats(correct, timeSpent);
      }
    }

    res.status(201).json({
      success: true,
      data: performance,
      message: 'Performance record created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get all performance records (filtered by authenticated learner unless admin)
router.get('/', async (req, res) => {
  try {
    const { sessionId, category, limit = 50 } = req.query;
    const { learner, isAdmin } = await getAuthLearner(req);

    let query = {};
    if (isAdmin) {
      if (req.query.learnerId) query.learnerId = req.query.learnerId;
    } else {
      if (!learner) {
        return res.json({ success: true, data: [], count: 0 });
      }
      query.learnerId = learner._id;
    }

    if (sessionId) query.sessionId = sessionId;
    if (category) query.category = { $in: [category] };

    const performances = await Performance.find(query)
      .populate('learnerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-__v');

    res.json({
      success: true,
      data: performances,
      count: performances.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get performance by ID (caller must be admin or owner of the performance record)
router.get('/:id', async (req, res) => {
  try {
    const { learner, isAdmin } = await getAuthLearner(req);
    const performance = await Performance.findById(req.params.id)
      .populate('learnerId', 'name email')
      .select('-__v');
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance record not found'
      });
    }

    if (!isAdmin) {
      const perfLearnerId = performance.learnerId?._id || performance.learnerId;
      if (!learner || !perfLearnerId || perfLearnerId.toString() !== learner._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Cannot access other learners\' performance data'
        });
      }
    }

    res.json({
      success: true,
      data: {
        ...performance.toObject(),
        metrics: performance.getPerformanceMetrics()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get learner analytics (caller must be admin or accessing their own analytics)
router.get('/analytics/learner/:learnerId', async (req, res) => {
  try {
    const { learner, isAdmin } = await getAuthLearner(req);
    if (!isAdmin && (!learner || learner._id.toString() !== req.params.learnerId)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot access other learners\' analytics'
      });
    }

    const { timeRange = 30 } = req.query;
    const analytics = await Performance.getLearnerAnalytics(req.params.learnerId, parseInt(timeRange));

    res.json({
      success: true,
      data: analytics[0] || {
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        totalTimeSpent: 0,
        averageTimePerQuestion: 0,
        totalHintsUsed: 0,
        averageDifficulty: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get category trends (caller must be admin or owner)
router.get('/analytics/trends/:learnerId/:category', async (req, res) => {
  try {
    const { learner, isAdmin } = await getAuthLearner(req);
    if (!isAdmin && (!learner || learner._id.toString() !== req.params.learnerId)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot access other learners\' trends'
      });
    }

    const { days = 30 } = req.query;
    const trends = await Performance.getCategoryTrends(
      req.params.learnerId, 
      req.params.category, 
      parseInt(days)
    );

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get difficulty progression (caller must be admin or owner)
router.get('/analytics/difficulty/:learnerId/:category', async (req, res) => {
  try {
    const { learner, isAdmin } = await getAuthLearner(req);
    if (!isAdmin && (!learner || learner._id.toString() !== req.params.learnerId)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot access other learners\' progression'
      });
    }

    const progression = await Performance.getDifficultyProgression(
      req.params.learnerId, 
      req.params.category
    );

    res.json({
      success: true,
      data: progression
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get session performance
router.get('/analytics/session/:sessionId', async (req, res) => {
  try {
    const sessionPerformance = await Performance.getSessionPerformance(req.params.sessionId);

    res.json({
      success: true,
      data: sessionPerformance[0] || {
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        totalTimeSpent: 0,
        averageTimePerQuestion: 0,
        totalHintsUsed: 0,
        averageDifficulty: 0,
        categoriesCovered: [],
        sessionDuration: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;