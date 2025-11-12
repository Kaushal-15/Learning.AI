// const express = require('express');
// const Joi = require('joi');
// const Learner = require('../models/Learner');
// const Performance = require('../models/Performance');
// const router = express.Router();

// // Validation schemas
// const updateProfileSchema = Joi.object({
//   name: Joi.string().min(1).max(100).trim().optional()
//     .messages({
//       'string.min': 'Name must be at least 1 character long',
//       'string.max': 'Name cannot exceed 100 characters'
//     }),
//   difficultyPreference: Joi.number().integer().min(1).max(10).optional()
//     .messages({
//       'number.integer': 'Difficulty preference must be an integer',
//       'number.min': 'Difficulty preference must be at least 1',
//       'number.max': 'Difficulty preference cannot exceed 10'
//     }),
//   learningVelocity: Joi.number().min(0.1).max(5.0).optional()
//     .messages({
//       'number.min': 'Learning velocity must be at least 0.1',
//       'number.max': 'Learning velocity cannot exceed 5.0'
//     }),
//   retentionRate: Joi.number().min(0).max(1).optional()
//     .messages({
//       'number.min': 'Retention rate cannot be negative',
//       'number.max': 'Retention rate cannot exceed 1'
//     }),
//   preferences: Joi.object({
//     hintsEnabled: Joi.boolean().optional(),
//     explanationsEnabled: Joi.boolean().optional(),
//     timerEnabled: Joi.boolean().optional(),
//     soundEnabled: Joi.boolean().optional()
//   }).optional()
// });

// const learnerIdSchema = Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
//   .messages({
//     'string.pattern.base': 'Learner ID must be a valid MongoDB ObjectId'
//   });

// // GET /api/profile/{learnerId} - Get learner profile
// router.get('/:learnerId', async (req, res) => {
//   try {
//     // Validate learner ID
//     const { error: idError } = learnerIdSchema.validate(req.params.learnerId);
//     if (idError) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid learner ID format',
//         details: idError.details[0].message
//       });
//     }

//     const learner = await Learner.findById(req.params.learnerId).select('-__v');
    
//     if (!learner) {
//       return res.status(404).json({
//         success: false,
//         message: 'Learner profile not found',
//         details: `No learner found with ID: ${req.params.learnerId}`
//       });
//     }

//     // Transform categoryMastery Map to object for JSON response
//     const profileData = {
//       learnerId: learner._id,
//       email: learner.email,
//       name: learner.name,
//       knowledgeMap: Object.fromEntries(learner.categoryMastery),
//       weakAreas: learner.weakAreas,
//       strongAreas: learner.strongAreas,
//       difficultyPreference: learner.difficultyPreference,
//       learningVelocity: learner.learningVelocity,
//       retentionRate: learner.retentionRate,
//       totalQuestionsAnswered: learner.totalQuestionsAnswered,
//       totalTimeSpent: learner.totalTimeSpent,
//       overallAccuracy: learner.overallAccuracy,
//       currentStreak: learner.currentStreak,
//       longestStreak: learner.longestStreak,
//       averageSessionTime: learner.averageSessionTime,
//       lastActive: learner.lastActive,
//       preferences: learner.preferences,
//       createdAt: learner.createdAt,
//       updatedAt: learner.updatedAt
//     };

//     res.json({
//       success: true,
//       data: profileData,
//       message: 'Profile retrieved successfully'
//     });

//   } catch (error) {
//     console.error('Error retrieving learner profile:', error);
    
//     res.status(500).json({
//       success: false,
//       message: 'Failed to retrieve learner profile',
//       error: error.message
//     });
//   }
// });

// // PUT /api/profile/{learnerId} - Update learner profile
// router.put('/:learnerId', async (req, res) => {
//   try {
//     // Validate learner ID
//     const { error: idError } = learnerIdSchema.validate(req.params.learnerId);
//     if (idError) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid learner ID format',
//         details: idError.details[0].message
//       });
//     }

//     // Validate request body
//     const { error: bodyError, value } = updateProfileSchema.validate(req.body);
//     if (bodyError) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation error',
//         details: bodyError.details.map(detail => ({
//           field: detail.path.join('.'),
//           message: detail.message,
//           value: detail.context.value
//         }))
//       });
//     }

//     // Check if learner exists
//     const existingLearner = await Learner.findById(req.params.learnerId);
//     if (!existingLearner) {
//       return res.status(404).json({
//         success: false,
//         message: 'Learner profile not found',
//         details: `No learner found with ID: ${req.params.learnerId}`
//       });
//     }

//     // Update learner profile
//     const updatedLearner = await Learner.findByIdAndUpdate(
//       req.params.learnerId,
//       { 
//         ...value,
//         lastActive: new Date() // Update last active timestamp
//       },
//       { 
//         new: true, 
//         runValidators: true,
//         select: '-__v'
//       }
//     );

//     // Transform response data
//     const profileData = {
//       learnerId: updatedLearner._id,
//       email: updatedLearner.email,
//       name: updatedLearner.name,
//       knowledgeMap: Object.fromEntries(updatedLearner.categoryMastery),
//       weakAreas: updatedLearner.weakAreas,
//       strongAreas: updatedLearner.strongAreas,
//       difficultyPreference: updatedLearner.difficultyPreference,
//       learningVelocity: updatedLearner.learningVelocity,
//       retentionRate: updatedLearner.retentionRate,
//       totalQuestionsAnswered: updatedLearner.totalQuestionsAnswered,
//       totalTimeSpent: updatedLearner.totalTimeSpent,
//       overallAccuracy: updatedLearner.overallAccuracy,
//       currentStreak: updatedLearner.currentStreak,
//       longestStreak: updatedLearner.longestStreak,
//       averageSessionTime: updatedLearner.averageSessionTime,
//       lastActive: updatedLearner.lastActive,
//       preferences: updatedLearner.preferences,
//       createdAt: updatedLearner.createdAt,
//       updatedAt: updatedLearner.updatedAt
//     };

//     res.json({
//       success: true,
//       data: profileData,
//       message: 'Profile updated successfully',
//       updatedFields: Object.keys(value)
//     });

//   } catch (error) {
//     console.error('Error updating learner profile:', error);
    
//     // Handle validation errors
//     if (error.name === 'ValidationError') {
//       return res.status(400).json({
//         success: false,
//         message: 'Profile validation failed',
//         details: Object.values(error.errors).map(err => ({
//           field: err.path,
//           message: err.message,
//           value: err.value
//         }))
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: 'Failed to update learner profile',
//       error: error.message
//     });
//   }
// });

// // GET /api/profile/{learnerId}/analytics - Get comprehensive progress analytics
// router.get('/:learnerId/analytics', async (req, res) => {
//   try {
//     // Validate learner ID
//     const { error: idError } = learnerIdSchema.validate(req.params.learnerId);
//     if (idError) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid learner ID format',
//         details: idError.details[0].message
//       });
//     }

//     // Parse query parameters
//     const timeRange = parseInt(req.query.timeRange) || 30; // days
//     const includeCategories = req.query.categories ? req.query.categories.split(',') : null;

//     // Check if learner exists
//     const learner = await Learner.findById(req.params.learnerId);
//     if (!learner) {
//       return res.status(404).json({
//         success: false,
//         message: 'Learner profile not found',
//         details: `No learner found with ID: ${req.params.learnerId}`
//       });
//     }

//     // Get performance analytics
//     const performanceAnalytics = await Performance.getLearnerAnalytics(req.params.learnerId, timeRange);
    
//     // Get category trends for each category
//     const categoryTrends = {};
//     const categories = includeCategories || Array.from(learner.categoryMastery.keys());
    
//     for (const category of categories.slice(0, 10)) { // Limit to 10 categories for performance
//       try {
//         const trends = await Performance.getCategoryTrends(req.params.learnerId, category, timeRange);
//         categoryTrends[category] = trends;
//       } catch (error) {
//         console.warn(`Failed to get trends for category ${category}:`, error.message);
//         categoryTrends[category] = [];
//       }
//     }

//     // Calculate progress metrics
//     const currentDate = new Date();
//     const startDate = new Date(currentDate.getTime() - (timeRange * 24 * 60 * 60 * 1000));
    
//     // Get recent performance data
//     const recentPerformance = await Performance.find({
//       learnerId: req.params.learnerId,
//       createdAt: { $gte: startDate }
//     }).sort({ createdAt: -1 }).limit(100);

//     // Calculate improvement trends
//     const improvementTrends = calculateImprovementTrends(recentPerformance);
    
//     // Calculate mastery progression
//     const masteryProgression = calculateMasteryProgression(learner.categoryMastery);

//     // Prepare analytics response
//     const analyticsData = {
//       learnerProfile: {
//         learnerId: learner._id,
//         name: learner.name,
//         email: learner.email,
//         overallAccuracy: learner.overallAccuracy,
//         totalQuestionsAnswered: learner.totalQuestionsAnswered,
//         totalTimeSpent: learner.totalTimeSpent,
//         currentStreak: learner.currentStreak,
//         longestStreak: learner.longestStreak,
//         averageSessionTime: learner.averageSessionTime,
//         lastActive: learner.lastActive
//       },
//       timeRange: {
//         days: timeRange,
//         startDate: startDate,
//         endDate: currentDate
//       },
//       performanceMetrics: performanceAnalytics[0] || {
//         totalQuestions: 0,
//         correctAnswers: 0,
//         accuracy: 0,
//         totalTimeSpent: 0,
//         averageTimePerQuestion: 0,
//         totalHintsUsed: 0,
//         averageDifficulty: 0
//       },
//       categoryAnalysis: {
//         totalCategories: learner.categoryMastery.size,
//         weakAreas: learner.weakAreas,
//         strongAreas: learner.strongAreas,
//         masteryDistribution: masteryProgression,
//         categoryTrends: categoryTrends
//       },
//       progressTrends: {
//         accuracyTrend: improvementTrends.accuracy,
//         speedTrend: improvementTrends.speed,
//         difficultyTrend: improvementTrends.difficulty,
//         consistencyTrend: improvementTrends.consistency
//       },
//       recommendations: generateRecommendations(learner, recentPerformance),
//       metadata: {
//         generatedAt: new Date(),
//         dataPoints: recentPerformance.length,
//         categoriesAnalyzed: Object.keys(categoryTrends).length
//       }
//     };

//     res.json({
//       success: true,
//       data: analyticsData,
//       message: 'Analytics retrieved successfully'
//     });

//   } catch (error) {
//     console.error('Error retrieving learner analytics:', error);
    
//     res.status(500).json({
//       success: false,
//       message: 'Failed to retrieve learner analytics',
//       error: error.message
//     });
//   }
// });

// // Helper function to calculate improvement trends
// function calculateImprovementTrends(performanceData) {
//   if (performanceData.length < 2) {
//     return {
//       accuracy: { trend: 'stable', change: 0 },
//       speed: { trend: 'stable', change: 0 },
//       difficulty: { trend: 'stable', change: 0 },
//       consistency: { trend: 'stable', change: 0 }
//     };
//   }

//   const halfPoint = Math.floor(performanceData.length / 2);
//   const firstHalf = performanceData.slice(halfPoint);
//   const secondHalf = performanceData.slice(0, halfPoint);

//   // Calculate accuracy trend
//   const firstHalfAccuracy = firstHalf.reduce((sum, p) => sum + (p.correct ? 1 : 0), 0) / firstHalf.length;
//   const secondHalfAccuracy = secondHalf.reduce((sum, p) => sum + (p.correct ? 1 : 0), 0) / secondHalf.length;
//   const accuracyChange = secondHalfAccuracy - firstHalfAccuracy;

//   // Calculate speed trend (lower time is better)
//   const firstHalfSpeed = firstHalf.reduce((sum, p) => sum + p.timeSpent, 0) / firstHalf.length;
//   const secondHalfSpeed = secondHalf.reduce((sum, p) => sum + p.timeSpent, 0) / secondHalf.length;
//   const speedChange = firstHalfSpeed - secondHalfSpeed; // Positive means improvement (faster)

//   // Calculate difficulty trend
//   const firstHalfDifficulty = firstHalf.reduce((sum, p) => sum + p.difficulty, 0) / firstHalf.length;
//   const secondHalfDifficulty = secondHalf.reduce((sum, p) => sum + p.difficulty, 0) / secondHalf.length;
//   const difficultyChange = secondHalfDifficulty - firstHalfDifficulty;

//   // Calculate consistency (streak analysis)
//   const consistencyScore = calculateConsistencyScore(performanceData);

//   return {
//     accuracy: {
//       trend: accuracyChange > 0.05 ? 'improving' : accuracyChange < -0.05 ? 'declining' : 'stable',
//       change: Math.round(accuracyChange * 100) / 100
//     },
//     speed: {
//       trend: speedChange > 5 ? 'improving' : speedChange < -5 ? 'declining' : 'stable',
//       change: Math.round(speedChange * 100) / 100
//     },
//     difficulty: {
//       trend: difficultyChange > 0.5 ? 'increasing' : difficultyChange < -0.5 ? 'decreasing' : 'stable',
//       change: Math.round(difficultyChange * 100) / 100
//     },
//     consistency: {
//       trend: consistencyScore > 0.7 ? 'consistent' : consistencyScore > 0.4 ? 'moderate' : 'inconsistent',
//       score: Math.round(consistencyScore * 100) / 100
//     }
//   };
// }

// // Helper function to calculate consistency score
// function calculateConsistencyScore(performanceData) {
//   if (performanceData.length < 5) return 0.5;

//   let streaks = [];
//   let currentStreak = 0;
//   let lastResult = null;

//   for (const performance of performanceData.reverse()) {
//     if (performance.correct === lastResult) {
//       currentStreak++;
//     } else {
//       if (currentStreak > 0) streaks.push(currentStreak);
//       currentStreak = 1;
//       lastResult = performance.correct;
//     }
//   }
//   if (currentStreak > 0) streaks.push(currentStreak);

//   // Calculate consistency based on streak variance
//   const avgStreak = streaks.reduce((sum, s) => sum + s, 0) / streaks.length;
//   const variance = streaks.reduce((sum, s) => sum + Math.pow(s - avgStreak, 2), 0) / streaks.length;
  
//   return Math.max(0, 1 - (variance / (avgStreak * avgStreak)));
// }

// // Helper function to calculate mastery progression
// function calculateMasteryProgression(categoryMastery) {
//   const masteryLevels = {
//     beginner: 0,    // 0-30
//     intermediate: 0, // 31-60
//     advanced: 0,     // 61-80
//     expert: 0        // 81-100
//   };

//   for (const [category, mastery] of categoryMastery) {
//     const level = mastery.level;
//     if (level <= 30) masteryLevels.beginner++;
//     else if (level <= 60) masteryLevels.intermediate++;
//     else if (level <= 80) masteryLevels.advanced++;
//     else masteryLevels.expert++;
//   }

//   return masteryLevels;
// }

// // Helper function to generate recommendations
// function generateRecommendations(learner, recentPerformance) {
//   const recommendations = [];

//   // Accuracy-based recommendations
//   if (learner.overallAccuracy < 0.6) {
//     recommendations.push({
//       type: 'accuracy',
//       priority: 'high',
//       message: 'Focus on understanding concepts before attempting more questions',
//       action: 'Review explanations and use hints when needed'
//     });
//   }

//   // Speed-based recommendations
//   const avgTime = recentPerformance.reduce((sum, p) => sum + p.timeSpent, 0) / recentPerformance.length;
//   if (avgTime > 120) { // More than 2 minutes per question
//     recommendations.push({
//       type: 'speed',
//       priority: 'medium',
//       message: 'Work on improving response time',
//       action: 'Practice with easier questions to build confidence and speed'
//     });
//   }

//   // Weak areas recommendations
//   if (learner.weakAreas.length > 0) {
//     recommendations.push({
//       type: 'categories',
//       priority: 'high',
//       message: `Focus on weak areas: ${learner.weakAreas.slice(0, 3).join(', ')}`,
//       action: 'Spend more time practicing questions in these categories'
//     });
//   }

//   // Streak recommendations
//   if (learner.currentStreak === 0 && learner.longestStreak > 5) {
//     recommendations.push({
//       type: 'motivation',
//       priority: 'medium',
//       message: 'Get back on track with your learning streak',
//       action: 'Start with easier questions to rebuild confidence'
//     });
//   }

//   return recommendations;
// }

// module.exports = router;

// routes/profileRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// ✅ Protected route to fetch current user profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    // Fetch full user data from database
    const User = require("../models/User");
    const user = await User.findById(req.user.id).select('-passwordHash -salt -refreshToken');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
    });
  }
});

module.exports = router;

