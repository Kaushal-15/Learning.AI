const express = require('express');
const router = express.Router();
const Performance = require('../models/Performance');
const Learner = require('../models/Learner');

// Create a new performance record
router.post('/', async (req, res) => {
  try {
    const {
      learnerId,
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
      learnerId,
      questionId: questionId || '507f1f77bcf86cd799439011', // Mock question ID
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
    if (learnerId) {
      const learner = await Learner.findById(learnerId);
      if (learner) {
        await learner.updateCategoryMastery(category[0], correct, timeSpent);
        await learner.updateOverallStats(correct, timeSpent);
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

// Get all performance records
router.get('/', async (req, res) => {
  try {
    const { learnerId, sessionId, category, limit = 50 } = req.query;
    
    let query = {};
    if (learnerId) query.learnerId = learnerId;
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

// Get performance by ID
router.get('/:id', async (req, res) => {
  try {
    const performance = await Performance.findById(req.params.id)
      .populate('learnerId', 'name email')
      .select('-__v');
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance record not found'
      });
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

// Get learner analytics
router.get('/analytics/learner/:learnerId', async (req, res) => {
  try {
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

// Get category trends
router.get('/analytics/trends/:learnerId/:category', async (req, res) => {
  try {
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

// Get difficulty progression
router.get('/analytics/difficulty/:learnerId/:category', async (req, res) => {
  try {
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