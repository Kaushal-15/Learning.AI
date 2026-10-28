const express = require('express');
const router = express.Router();
const Learner = require('../models/Learner');
const Performance = require('../models/Performance');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Helper to resolve caller's learner record and admin status
async function getAuthLearner(req) {
  const user = await User.findById(req.user.id || req.user._id);
  if (!user) return { user: null, learner: null, isAdmin: false };
  const isAdmin = user.role === 'admin';
  const learner = await Learner.findOne({ email: user.email });
  return { user, learner, isAdmin };
}

// Create a new learner (admin only)
router.post('/', adminMiddleware, async (req, res) => {
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

// Get current user's learner data
router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const learner = await Learner.findOne({ email: user.email }).select('-__v');
    
    if (!learner) {
      return res.status(404).json({
        success: false,
        message: 'Learner profile not found'
      });
    }

    // Get recent performance data
    const recentPerformance = await Performance.find({ 
      learnerId: learner._id 
    })
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({
      success: true,
      data: {
        ...learner.toObject(),
        weakAreas: learner.weakAreas,
        strongAreas: learner.strongAreas,
        categoryMastery: Object.fromEntries(learner.categoryMastery),
        recentPerformance,
        roadmap: user.selectedRoadmap,
        skillLevel: user.skillLevel,
        learningTimeline: user.learningTimeline
      }
    });
  } catch (error) {
    console.error('Error fetching learner data:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all learners (admin only)
router.get('/', adminMiddleware, async (req, res) => {
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

// Get learner by ID (caller must be admin or accessing their own profile)
router.get('/:id', async (req, res) => {
  try {
    const { learner, isAdmin } = await getAuthLearner(req);
    if (!isAdmin && (!learner || learner._id.toString() !== req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot access other learners\' data'
      });
    }

    const target = await Learner.findById(req.params.id).select('-__v');
    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found'
      });
    }

    res.json({
      success: true,
      data: target
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update learner profile (caller must be admin or updating their own profile)
router.put('/:id', async (req, res) => {
  try {
    const { learner, isAdmin } = await getAuthLearner(req);
    if (!isAdmin && (!learner || learner._id.toString() !== req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot update other learners\' profile'
      });
    }

    const { name, difficultyPreference, preferences } = req.body;
    
    const updated = await Learner.findByIdAndUpdate(
      req.params.id,
      { 
        ...(name && { name }),
        ...(difficultyPreference && { difficultyPreference }),
        ...(preferences && { preferences })
      },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found'
      });
    }

    res.json({
      success: true,
      data: updated,
      message: 'Learner updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Update category mastery (caller must be admin or answering as themselves)
router.post('/:id/answer', async (req, res) => {
  try {
    const { learner, isAdmin } = await getAuthLearner(req);
    if (!isAdmin && (!learner || learner._id.toString() !== req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot record answers for other learners'
      });
    }

    const { category, wasCorrect, timeSpent } = req.body;
    
    if (!category || wasCorrect === undefined || !timeSpent) {
      return res.status(400).json({
        success: false,
        message: 'Category, wasCorrect, and timeSpent are required'
      });
    }

    const targetLearner = await Learner.findById(req.params.id);
    if (!targetLearner) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found'
      });
    }

    // Update category mastery
    await targetLearner.updateCategoryMastery(category, wasCorrect, timeSpent);
    
    // Update overall stats
    await targetLearner.updateOverallStats(wasCorrect, timeSpent);

    res.json({
      success: true,
      data: targetLearner,
      message: 'Performance updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get learner analytics (caller must be admin or accessing their own analytics)
router.get('/:id/analytics', async (req, res) => {
  try {
    const { learner, isAdmin } = await getAuthLearner(req);
    if (!isAdmin && (!learner || learner._id.toString() !== req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot access other learners\' analytics'
      });
    }

    const targetLearner = await Learner.findById(req.params.id);
    if (!targetLearner) {
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
          name: targetLearner.name,
          email: targetLearner.email,
          weakAreas: targetLearner.weakAreas,
          strongAreas: targetLearner.strongAreas,
          overallAccuracy: targetLearner.overallAccuracy,
          currentStreak: targetLearner.currentStreak,
          longestStreak: targetLearner.longestStreak,
          categoryMastery: Object.fromEntries(targetLearner.categoryMastery)
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

// Get recommended difficulty for a category (caller must be admin or accessing their own)
router.get('/:id/difficulty/:category', async (req, res) => {
  try {
    const { learner, isAdmin } = await getAuthLearner(req);
    if (!isAdmin && (!learner || learner._id.toString() !== req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot access other learners\' difficulty recommendations'
      });
    }

    const targetLearner = await Learner.findById(req.params.id);
    if (!targetLearner) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found'
      });
    }

    const recommendedDifficulty = targetLearner.getRecommendedDifficulty(req.params.category);

    res.json({
      success: true,
      data: {
        category: req.params.category,
        recommendedDifficulty,
        currentMastery: targetLearner.categoryMastery.get(req.params.category) || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete learner (admin or self)
router.delete('/:id', async (req, res) => {
  try {
    const { learner, isAdmin } = await getAuthLearner(req);
    if (!isAdmin && (!learner || learner._id.toString() !== req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot delete other learners\' profiles'
      });
    }

    const targetLearner = await Learner.findByIdAndDelete(req.params.id);
    if (!targetLearner) {
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