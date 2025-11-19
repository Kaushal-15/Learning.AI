const express = require('express');
const router = express.Router();
const TestResult = require('../models/TestResult');
const TestCompletion = require('../models/TestCompletion');
const authMiddleware = require('../middleware/authMiddleware');

// Save test result
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      roadmapType,
      testCategory,
      difficulty,
      score,
      correctAnswers,
      totalQuestions,
      timeSpent,
      timeTaken,
      detailedResults
    } = req.body;

    console.log('Saving test result:', {
      userId: req.user.id,
      roadmapType,
      testCategory,
      difficulty,
      score,
      correctAnswers,
      totalQuestions
    });

    const testResult = new TestResult({
      userId: req.user.id,
      roadmapType,
      testCategory,
      difficulty,
      score,
      correctAnswers,
      totalQuestions,
      timeSpent,
      timeTaken,
      detailedResults
    });

    await testResult.save();
    console.log('Test result saved successfully:', testResult._id);

    // Update or create test completion record
    try {
      const existingCompletion = await TestCompletion.findOne({
        userId: req.user.id,
        roadmapType,
        testCategory,
        difficulty
      });

      if (existingCompletion) {
        // Update existing completion
        console.log('Updating existing completion:', existingCompletion._id);
        existingCompletion.bestScore = Math.max(existingCompletion.bestScore, score);
        existingCompletion.attemptCount += 1;
        existingCompletion.lastAttemptDate = new Date();
        await existingCompletion.save();
        console.log('Completion updated successfully');
      } else {
        // Create new completion record
        console.log('Creating new completion record');
        const newCompletion = new TestCompletion({
          userId: req.user.id,
          roadmapType,
          testCategory,
          difficulty,
          bestScore: score,
          attemptCount: 1
        });
        await newCompletion.save();
        console.log('New completion created:', newCompletion._id);
      }
    } catch (completionError) {
      console.error('Error updating test completion:', completionError);
      // Don't fail the main request if completion tracking fails
    }

    res.json({
      success: true,
      message: 'Test result saved successfully',
      data: testResult
    });

  } catch (error) {
    console.error('Error saving test result:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save test result'
    });
  }
});

// Get user's test results
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { roadmapType, limit = 10 } = req.query;

    const query = { userId: req.user.id };
    if (roadmapType) {
      query.roadmapType = roadmapType;
    }

    const testResults = await TestResult.find(query)
      .sort({ completedAt: -1 })
      .limit(parseInt(limit))
      .select('-detailedResults'); // Exclude detailed results for list view

    // Disable cache for debugging
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      success: true,
      data: testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test results'
    });
  }
});

// Get test statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { roadmapType } = req.query;

    const matchQuery = { userId: req.user.id };
    if (roadmapType) {
      matchQuery.roadmapType = roadmapType;
    }

    console.log('Fetching stats with query:', matchQuery);
    const stats = await TestResult.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalTests: { $sum: 1 },
          averageScore: { $avg: '$score' },
          bestScore: { $max: '$score' },
          totalTimeSpent: { $sum: '$timeSpent' },
          recentTests: { $push: { score: '$score', completedAt: '$completedAt', testCategory: '$testCategory' } }
        }
      },
      {
        $project: {
          totalTests: 1,
          averageScore: { $round: ['$averageScore', 1] },
          bestScore: 1,
          totalTimeSpent: 1,
          recentTests: { $slice: ['$recentTests', -5] }
        }
      }
    ]);

    const result = stats[0] || {
      totalTests: 0,
      averageScore: 0,
      bestScore: 0,
      totalTimeSpent: 0,
      recentTests: []
    };

    console.log('Stats result:', result);

    // Disable cache for debugging
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching test statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test statistics'
    });
  }
});

// Get test completions (must be before /:id route)
router.get('/completions', authMiddleware, async (req, res) => {
  try {
    const { roadmapType } = req.query;

    const query = { userId: req.user.id };
    if (roadmapType) {
      query.roadmapType = roadmapType;
    }

    console.log('Fetching completions with query:', query);
    const completions = await TestCompletion.find(query)
      .sort({ lastAttemptDate: -1 });

    console.log('Found completions:', completions.length);

    // Disable cache for debugging
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      success: true,
      data: completions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching test completions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test completions'
    });
  }
});

// Get weak areas analysis (must be before /:id route)
router.get('/analysis/weak-areas', authMiddleware, async (req, res) => {
  try {
    const { roadmapType } = req.query;

    const matchQuery = { userId: req.user.id };
    if (roadmapType) {
      matchQuery.roadmapType = roadmapType;
    }

    // Get recent test results and analyze weak areas
    const recentResults = await TestResult.find(matchQuery)
      .sort({ completedAt: -1 })
      .limit(10);

    const topicScores = {};
    const difficultyScores = {};

    recentResults.forEach(result => {
      result.detailedResults.forEach(detail => {
        // Track topic performance
        if (!topicScores[detail.topic]) {
          topicScores[detail.topic] = { correct: 0, total: 0 };
        }
        topicScores[detail.topic].total++;
        if (detail.isCorrect) {
          topicScores[detail.topic].correct++;
        }

        // Track difficulty performance
        if (!difficultyScores[detail.difficulty]) {
          difficultyScores[detail.difficulty] = { correct: 0, total: 0 };
        }
        difficultyScores[detail.difficulty].total++;
        if (detail.isCorrect) {
          difficultyScores[detail.difficulty].correct++;
        }
      });
    });

    // Calculate weak areas (topics with < 70% accuracy)
    const weakTopics = Object.entries(topicScores)
      .map(([topic, scores]) => ({
        topic,
        accuracy: (scores.correct / scores.total) * 100,
        totalQuestions: scores.total
      }))
      .filter(item => item.accuracy < 70 && item.totalQuestions >= 3)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    // Calculate strong areas (topics with > 80% accuracy)
    const strongTopics = Object.entries(topicScores)
      .map(([topic, scores]) => ({
        topic,
        accuracy: (scores.correct / scores.total) * 100,
        totalQuestions: scores.total
      }))
      .filter(item => item.accuracy > 80 && item.totalQuestions >= 3)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        weakAreas: weakTopics,
        strongAreas: strongTopics,
        difficultyAnalysis: Object.entries(difficultyScores).map(([difficulty, scores]) => ({
          difficulty,
          accuracy: (scores.correct / scores.total) * 100,
          totalQuestions: scores.total
        }))
      }
    });

  } catch (error) {
    console.error('Error analyzing weak areas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze weak areas'
    });
  }
});

// Debug route to check all test results for a user
router.get('/debug/all', authMiddleware, async (req, res) => {
  try {
    const testResults = await TestResult.find({ userId: req.user.id });
    const completions = await TestCompletion.find({ userId: req.user.id });

    res.json({
      success: true,
      data: {
        testResults: testResults.length,
        completions: completions.length,
        results: testResults,
        completionRecords: completions
      }
    });
  } catch (error) {
    console.error('Error in debug route:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed'
    });
  }
});

// Get detailed test result
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const testResult = await TestResult.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!testResult) {
      return res.status(404).json({
        success: false,
        message: 'Test result not found'
      });
    }

    res.json({
      success: true,
      data: testResult
    });

  } catch (error) {
    console.error('Error fetching test result:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test result'
    });
  }
});

module.exports = router;