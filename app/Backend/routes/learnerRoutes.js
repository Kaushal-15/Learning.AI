const express = require('express');
const router = express.Router();
const Learner = require('../models/Learner');
const Performance = require('../models/Performance');

// Create a new learner
router.post('/', async (req, res) => {
  try {
    const { email, name, difficultyPreference } = req.body;
    
    // Check if learner already exists
    const existingLearner = await Learner.findOne({ email });
    if (existingLearner) {
      return res.status(400).json({
        success: false,
        message: 'Learner with this email already exists'
      });
    }

    const learner = new Learner({
      email,
      name,
      difficultyPreference: difficultyPreference || 5
    });

    await learner.save();

    res.status(201).json({
      success: true,
      data: learner,
      message: 'Learner created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get all learners
router.get('/', async (req, res) => {
  try {
    const learners = await Learner.find().select('-__v');
    res.json({
      success: true,
      data: learners,
      count: learners.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get learner by ID
router.get('/:id', async (req, res) => {
  try {
    const learner = await Learner.findById(req.params.id).select('-__v');
    
    if (!learner) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found'
      });
    }

    res.json({
      success: true,
      data: learner
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update learner profile
router.put('/:id', async (req, res) => {
  try {
    const { name, difficultyPreference, preferences } = req.body;
    
    const learner = await Learner.findByIdAndUpdate(
      req.params.id,
      { 
        ...(name && { name }),
        ...(difficultyPreference && { difficultyPreference }),
        ...(preferences && { preferences })
      },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!learner) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found'
      });
    }

    res.json({
      success: true,
      data: learner,
      message: 'Learner updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Update category mastery (simulate answering a question)
router.post('/:id/answer', async (req, res) => {
  try {
    const { category, wasCorrect, timeSpent } = req.body;
    
    if (!category || wasCorrect === undefined || !timeSpent) {
      return res.status(400).json({
        success: false,
        message: 'Category, wasCorrect, and timeSpent are required'
      });
    }

    const learner = await Learner.findById(req.params.id);
    
    if (!learner) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found'
      });
    }

    // Update category mastery
    await learner.updateCategoryMastery(category, wasCorrect, timeSpent);
    
    // Update overall stats
    await learner.updateOverallStats(wasCorrect, timeSpent);

    res.json({
      success: true,
      data: learner,
      message: 'Performance updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get learner analytics
router.get('/:id/analytics', async (req, res) => {
  try {
    const learner = await Learner.findById(req.params.id);
    
    if (!learner) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found'
      });
    }

    const analytics = await Learner.getAnalytics(req.params.id);

    res.json({
      success: true,
      data: {
        learner: {
          name: learner.name,
          email: learner.email,
          weakAreas: learner.weakAreas,
          strongAreas: learner.strongAreas,
          overallAccuracy: learner.overallAccuracy,
          currentStreak: learner.currentStreak,
          longestStreak: learner.longestStreak,
          categoryMastery: Object.fromEntries(learner.categoryMastery)
        },
        analytics: analytics[0] || {}
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get recommended difficulty for a category
router.get('/:id/difficulty/:category', async (req, res) => {
  try {
    const learner = await Learner.findById(req.params.id);
    
    if (!learner) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found'
      });
    }

    const recommendedDifficulty = learner.getRecommendedDifficulty(req.params.category);

    res.json({
      success: true,
      data: {
        category: req.params.category,
        recommendedDifficulty,
        currentMastery: learner.categoryMastery.get(req.params.category) || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete learner
router.delete('/:id', async (req, res) => {
  try {
    const learner = await Learner.findByIdAndDelete(req.params.id);
    
    if (!learner) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found'
      });
    }

    res.json({
      success: true,
      message: 'Learner deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;