const Performance = require('../models/Performance');
const Learner = require('../models/Learner');

/**
 * Adaptive Difficulty Engine
 * Implements algorithms to dynamically adjust question difficulty based on learner performance patterns
 * Requirements: 1.1, 1.2, 1.4
 */
class AdaptiveDifficultyEngine {
  constructor() {
    // Configuration constants for difficulty adjustment
    this.config = {
      // Accuracy thresholds for difficulty adjustment
      HIGH_ACCURACY_THRESHOLD: 0.8,  // 80% accuracy triggers difficulty increase
      LOW_ACCURACY_THRESHOLD: 0.5,   // 50% accuracy triggers difficulty decrease

      // Minimum questions needed for reliable adjustment
      MIN_QUESTIONS_FOR_ADJUSTMENT: 3,

      // Maximum difficulty adjustment per session
      MAX_DIFFICULTY_CHANGE: 2,

      // Time-based performance factors
      FAST_ANSWER_THRESHOLD: 30,     // seconds
      SLOW_ANSWER_THRESHOLD: 120,    // seconds

      // Streak bonuses and penalties
      STREAK_BONUS_THRESHOLD: 5,
      STREAK_PENALTY_THRESHOLD: 3,

      // Category mastery influence
      MASTERY_INFLUENCE_FACTOR: 0.3,

      // Learning velocity adjustment
      VELOCITY_ADJUSTMENT_FACTOR: 0.2
    };
  }

  /**
   * Calculate the next difficulty level for a learner based on their recent performance
   * @param {string} learnerId - The learner's ID
   * @param {string} category - The question category
   * @param {number} currentDifficulty - Current difficulty level (1-10)
   * @param {Object} options - Additional options for calculation
   * @returns {Promise<Object>} - Object containing new difficulty and reasoning
   */
  async calculateNextDifficulty(learnerId, category, currentDifficulty, options = {}) {
    try {
      const {
        sessionId = null,
        lookbackQuestions = 5,
        considerTimeSpent = true,
        considerHints = true
      } = options;

      // Get learner profile
      const learner = await Learner.findById(learnerId);
      if (!learner) {
        throw new Error('Learner not found');
      }

      // Get recent performance data
      const recentPerformance = await this.getRecentPerformance(
        learnerId,
        category,
        lookbackQuestions,
        sessionId
      );

      if (recentPerformance.length < this.config.MIN_QUESTIONS_FOR_ADJUSTMENT) {
        // Not enough data, use learner's preference with slight category adjustment
        return this.getInitialDifficulty(learner, category, currentDifficulty);
      }

      // Calculate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(
        recentPerformance,
        considerTimeSpent,
        considerHints
      );

      // Get category mastery influence
      const masteryInfluence = this.getCategoryMasteryInfluence(learner, category);

      // Calculate difficulty adjustment
      const difficultyAdjustment = this.calculateDifficultyAdjustment(
        performanceMetrics,
        masteryInfluence,
        learner.learningVelocity
      );

      // Apply adjustment with bounds checking
      const newDifficulty = this.applyDifficultyAdjustment(
        currentDifficulty,
        difficultyAdjustment,
        learner.difficultyPreference
      );

      return {
        newDifficulty,
        previousDifficulty: currentDifficulty,
        adjustment: newDifficulty - currentDifficulty,
        reasoning: this.generateAdjustmentReasoning(
          performanceMetrics,
          masteryInfluence,
          difficultyAdjustment
        ),
        confidence: this.calculateAdjustmentConfidence(recentPerformance.length, performanceMetrics),
        performanceMetrics
      };

    } catch (error) {
      throw new Error(`Failed to calculate next difficulty: ${error.message}`);
    }
  }

  /**
   * Get recent performance data for a learner in a specific category
   * @param {string} learnerId - The learner's ID
   * @param {string} category - The question category
   * @param {number} limit - Number of recent performances to retrieve
   * @param {string} sessionId - Optional session ID to filter by
   * @returns {Promise<Array>} - Array of recent performance records
   */
  async getRecentPerformance(learnerId, category, limit = 5, sessionId = null) {
    const query = {
      learnerId,
      category: { $in: [category] }
    };

    if (sessionId) {
      query.sessionId = sessionId;
    }

    return await Performance.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Calculate performance metrics from recent performance data
   * @param {Array} performances - Array of performance records
   * @param {boolean} considerTimeSpent - Whether to factor in time spent
   * @param {boolean} considerHints - Whether to factor in hints used
   * @returns {Object} - Performance metrics object
   */
  calculatePerformanceMetrics(performances, considerTimeSpent = true, considerHints = true) {
    if (performances.length === 0) {
      return {
        accuracy: 0,
        averageTimeSpent: 0,
        averageHintsUsed: 0,
        streak: 0,
        timeEfficiency: 0,
        consistencyScore: 0,
        totalQuestions: 0
      };
    }

    const correctAnswers = performances.filter(p => p.correct).length;
    const accuracy = correctAnswers / performances.length;

    const totalTimeSpent = performances.reduce((sum, p) => sum + p.timeSpent, 0);
    const averageTimeSpent = totalTimeSpent / performances.length;

    const totalHintsUsed = performances.reduce((sum, p) => sum + p.hintsUsed, 0);
    const averageHintsUsed = totalHintsUsed / performances.length;

    // Calculate current streak (consecutive correct/incorrect from most recent)
    let streak = 0;
    const isPositiveStreak = performances[0].correct;

    for (const performance of performances) {
      if (performance.correct === isPositiveStreak) {
        streak++;
      } else {
        break;
      }
    }

    // If it's an incorrect streak, make it negative
    if (!isPositiveStreak) {
      streak = -streak;
    }

    // Calculate time efficiency (faster is better, normalized 0-1)
    const timeEfficiency = considerTimeSpent ?
      Math.max(0, 1 - (averageTimeSpent / this.config.SLOW_ANSWER_THRESHOLD)) : 0.5;

    // Calculate consistency score based on variance in performance
    const accuracyVariance = this.calculateVariance(performances.map(p => p.correct ? 1 : 0));
    const consistencyScore = Math.max(0, 1 - accuracyVariance);

    return {
      accuracy,
      averageTimeSpent,
      averageHintsUsed: considerHints ? averageHintsUsed : 0,
      streak,
      timeEfficiency,
      consistencyScore,
      totalQuestions: performances.length
    };
  }

  /**
   * Get category mastery influence on difficulty adjustment
   * @param {Object} learner - Learner object
   * @param {string} category - Category to check
   * @returns {Object} - Mastery influence object
   */
  getCategoryMasteryInfluence(learner, category) {
    const categoryMastery = learner.categoryMastery.get(category);

    if (!categoryMastery) {
      return {
        masteryLevel: 0,
        confidence: 0,
        influence: 0
      };
    }

    // Calculate influence based on mastery level and confidence
    const masteryLevel = categoryMastery.level / 100; // Normalize to 0-1
    const confidence = categoryMastery.confidence;
    const influence = masteryLevel * confidence * this.config.MASTERY_INFLUENCE_FACTOR;

    return {
      masteryLevel,
      confidence,
      influence
    };
  }

  /**
   * Calculate difficulty adjustment based on performance metrics and mastery
   * @param {Object} performanceMetrics - Performance metrics object
   * @param {Object} masteryInfluence - Mastery influence object
   * @param {number} learningVelocity - Learner's learning velocity
   * @returns {number} - Difficulty adjustment (-2 to +2)
   */
  calculateDifficultyAdjustment(performanceMetrics, masteryInfluence, learningVelocity) {
    let adjustment = 0;

    // Base adjustment on accuracy
    if (performanceMetrics.accuracy >= this.config.HIGH_ACCURACY_THRESHOLD) {
      adjustment += 1;

      // Additional increase for very high accuracy with good time efficiency
      if (performanceMetrics.accuracy >= 0.9 && performanceMetrics.timeEfficiency > 0.7) {
        adjustment += 0.5;
      }
    } else if (performanceMetrics.accuracy <= this.config.LOW_ACCURACY_THRESHOLD) {
      adjustment -= 1;

      // Additional decrease for very low accuracy
      if (performanceMetrics.accuracy <= 0.3) {
        adjustment -= 0.5;
      }
    }

    // Adjust based on streak
    if (performanceMetrics.streak >= this.config.STREAK_BONUS_THRESHOLD) {
      adjustment += 0.5;
    } else if (performanceMetrics.streak <= -this.config.STREAK_PENALTY_THRESHOLD) {
      adjustment -= 0.5;
    }

    // Adjust based on time efficiency
    if (performanceMetrics.timeEfficiency > 0.8) {
      adjustment += 0.3;
    } else if (performanceMetrics.timeEfficiency < 0.3) {
      adjustment -= 0.3;
    }

    // Adjust based on hints usage
    if (performanceMetrics.averageHintsUsed > 2) {
      adjustment -= 0.3;
    } else if (performanceMetrics.averageHintsUsed === 0 && performanceMetrics.accuracy > 0.7) {
      adjustment += 0.2;
    }

    // Apply mastery influence
    adjustment += masteryInfluence.influence;

    // Apply learning velocity factor
    adjustment *= (1 + (learningVelocity - 1) * this.config.VELOCITY_ADJUSTMENT_FACTOR);

    // Ensure adjustment is within bounds
    return Math.max(-this.config.MAX_DIFFICULTY_CHANGE,
      Math.min(this.config.MAX_DIFFICULTY_CHANGE, adjustment));
  }

  /**
   * Apply difficulty adjustment with bounds checking
   * @param {number} currentDifficulty - Current difficulty level
   * @param {number} adjustment - Calculated adjustment
   * @param {number} preferredDifficulty - Learner's preferred difficulty
   * @returns {number} - New difficulty level (1-10)
   */
  applyDifficultyAdjustment(currentDifficulty, adjustment, preferredDifficulty) {
    let newDifficulty = currentDifficulty + Math.round(adjustment);

    // Ensure within valid range
    newDifficulty = Math.max(1, Math.min(10, newDifficulty));

    // Don't deviate too far from preferred difficulty unless performance strongly indicates it
    const maxDeviation = Math.abs(adjustment) > 1.5 ? 3 : 2;
    const minAllowed = Math.max(1, preferredDifficulty - maxDeviation);
    const maxAllowed = Math.min(10, preferredDifficulty + maxDeviation);

    newDifficulty = Math.max(minAllowed, Math.min(maxAllowed, newDifficulty));

    return newDifficulty;
  }

  /**
   * Get initial difficulty for a learner with insufficient performance data
   * @param {Object} learner - Learner object
   * @param {string} category - Category
   * @param {number} currentDifficulty - Current difficulty
   * @returns {Object} - Initial difficulty recommendation
   */
  getInitialDifficulty(learner, category, currentDifficulty) {
    const categoryMastery = learner.categoryMastery.get(category);
    let recommendedDifficulty = learner.difficultyPreference;

    if (categoryMastery) {
      // Adjust based on category mastery
      const masteryLevel = categoryMastery.level;
      if (masteryLevel < 30) {
        recommendedDifficulty = Math.max(1, learner.difficultyPreference - 1);
      } else if (masteryLevel > 80) {
        recommendedDifficulty = Math.min(10, learner.difficultyPreference + 1);
      }
    }

    return {
      newDifficulty: recommendedDifficulty,
      previousDifficulty: currentDifficulty,
      adjustment: recommendedDifficulty - currentDifficulty,
      reasoning: 'Insufficient performance data - using learner preference with category mastery adjustment',
      confidence: categoryMastery ? 0.6 : 0.3,
      performanceMetrics: null
    };
  }

  /**
   * Generate human-readable reasoning for difficulty adjustment
   * @param {Object} performanceMetrics - Performance metrics
   * @param {Object} masteryInfluence - Mastery influence
   * @param {number} adjustment - Calculated adjustment
   * @returns {string} - Reasoning text
   */
  generateAdjustmentReasoning(performanceMetrics, masteryInfluence, adjustment) {
    const reasons = [];

    if (performanceMetrics.accuracy >= this.config.HIGH_ACCURACY_THRESHOLD) {
      reasons.push(`High accuracy (${(performanceMetrics.accuracy * 100).toFixed(1)}%)`);
    } else if (performanceMetrics.accuracy <= this.config.LOW_ACCURACY_THRESHOLD) {
      reasons.push(`Low accuracy (${(performanceMetrics.accuracy * 100).toFixed(1)}%)`);
    }

    if (performanceMetrics.streak >= this.config.STREAK_BONUS_THRESHOLD) {
      reasons.push(`Positive streak of ${performanceMetrics.streak} questions`);
    } else if (performanceMetrics.streak <= -this.config.STREAK_PENALTY_THRESHOLD) {
      reasons.push(`Negative streak of ${Math.abs(performanceMetrics.streak)} questions`);
    }

    if (performanceMetrics.timeEfficiency > 0.8) {
      reasons.push('Fast response times');
    } else if (performanceMetrics.timeEfficiency < 0.3) {
      reasons.push('Slow response times');
    }

    if (performanceMetrics.averageHintsUsed > 2) {
      reasons.push('High hint usage');
    } else if (performanceMetrics.averageHintsUsed === 0 && performanceMetrics.accuracy > 0.7) {
      reasons.push('No hints needed');
    }

    if (masteryInfluence.influence > 0.1) {
      reasons.push(`High category mastery (${(masteryInfluence.masteryLevel * 100).toFixed(1)}%)`);
    } else if (masteryInfluence.influence < -0.1) {
      reasons.push(`Low category mastery (${(masteryInfluence.masteryLevel * 100).toFixed(1)}%)`);
    }

    if (reasons.length === 0) {
      return 'Maintaining current difficulty level';
    }

    const action = adjustment > 0 ? 'Increasing' : adjustment < 0 ? 'Decreasing' : 'Maintaining';
    return `${action} difficulty based on: ${reasons.join(', ')}`;
  }

  /**
   * Calculate confidence in the difficulty adjustment
   * @param {number} dataPoints - Number of performance data points
   * @param {Object} performanceMetrics - Performance metrics
   * @returns {number} - Confidence score (0-1)
   */
  calculateAdjustmentConfidence(dataPoints, performanceMetrics) {
    // Base confidence on amount of data (more generous scaling)
    let confidence = Math.min(1, dataPoints / 8);

    // Adjust based on consistency
    confidence *= Math.max(0.5, performanceMetrics.consistencyScore);

    // Reduce confidence for edge cases
    if (performanceMetrics.accuracy === 0 || performanceMetrics.accuracy === 1) {
      confidence *= 0.8;
    }

    return Math.max(0.1, confidence);
  }

  /**
   * Calculate variance of an array of values
   * @param {Array} values - Array of numeric values
   * @returns {number} - Variance
   */
  calculateVariance(values) {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Batch process difficulty adjustments for multiple learners
   * @param {Array} learnerCategories - Array of {learnerId, category, currentDifficulty}
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} - Array of difficulty adjustment results
   */
  async batchCalculateDifficulty(learnerCategories, options = {}) {
    const results = [];

    for (const { learnerId, category, currentDifficulty } of learnerCategories) {
      try {
        const result = await this.calculateNextDifficulty(
          learnerId,
          category,
          currentDifficulty,
          options
        );
        results.push({
          learnerId,
          category,
          ...result,
          success: true
        });
      } catch (error) {
        results.push({
          learnerId,
          category,
          error: error.message,
          success: false
        });
      }
    }

    return results;
  }

  /**
   * Real-time performance analysis for dynamic exams
   * @param {Array} responses - Array of response objects
   * @param {number} timeWindow - Time window in seconds for analysis
   * @returns {Object} - Analysis results with recommendations
   */
  analyzeRealTimePerformance(responses, timeWindow = 60) {
    const now = Date.now();
    const recentResponses = responses.filter(r =>
      (now - new Date(r.timestamp).getTime()) <= (timeWindow * 1000)
    );

    if (recentResponses.length === 0) {
      return {
        correctRate: 0.5,
        avgResponseTime: 30,
        recommendedDifficulty: 'medium',
        adaptation: 'maintain'
      };
    }

    const correctCount = recentResponses.filter(r => r.isCorrect).length;
    const correctRate = correctCount / recentResponses.length;
    const avgResponseTime = recentResponses.reduce((sum, r) => sum + r.responseTime, 0) / recentResponses.length;

    let recommendedDifficulty = 'medium';
    let adaptation = 'maintain';

    // Adaptation logic based on performance
    if (correctRate >= 0.8 && avgResponseTime < 30) {
      recommendedDifficulty = 'hard';
      adaptation = 'increase';
    } else if (correctRate >= 0.7) {
      recommendedDifficulty = 'medium';
      adaptation = 'maintain';
    } else if (correctRate < 0.5) {
      recommendedDifficulty = 'easy';
      adaptation = 'decrease';
    }

    return {
      correctRate,
      avgResponseTime,
      recommendedDifficulty,
      adaptation,
      sampleSize: recentResponses.length
    };
  }

  /**
   * Get next question based on current performance
   * @param {string} examId - Exam ID
   * @param {string} currentDifficulty - Current difficulty level
   * @param {Array} excludeQuestions - Questions to exclude
   * @returns {Promise<Object>} - Next question object
   */
  async getNextDynamicQuestion(examId, currentDifficulty, excludeQuestions = []) {
    try {
      const ExamQuestion = require('../config/examDatabase').ExamQuestion;

      const questions = await ExamQuestion.find({
        examId,
        difficulty: currentDifficulty,
        _id: { $nin: excludeQuestions }
      });

      if (questions.length === 0) {
        // Fallback to any available question
        const fallbackQuestions = await ExamQuestion.find({
          examId,
          _id: { $nin: excludeQuestions }
        });

        if (fallbackQuestions.length === 0) {
          throw new Error('No questions available for this exam');
        }

        return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
      }

      // Return random question of appropriate difficulty
      return questions[Math.floor(Math.random() * questions.length)];
    } catch (error) {
      console.error('Error getting next dynamic question:', error);
      throw error;
    }
  }

  /**
   * Process real-time exam responses
   * @param {string} examId - Exam ID
   * @param {string} userId - User ID
   * @param {string} questionId - Question ID
   * @param {string} response - User's response
   * @param {number} responseTime - Time taken to respond
   * @returns {Object} - Response data object
   */
  processRealTimeResponse(examId, userId, questionId, response, responseTime) {
    const responseData = {
      examId,
      userId,
      questionId,
      response,
      responseTime,
      timestamp: new Date(),
      isCorrect: false // Will be determined by comparing with correct answer
    };

    // Store response for analysis
    this.storeResponse(responseData);

    return responseData;
  }

  /**
   * Store response for real-time analysis
   * @param {Object} responseData - Response data to store
   */
  storeResponse(responseData) {
    // In a real implementation, this would store to a fast database like Redis
    // For now, we'll use in-memory storage
    if (!this.realTimeResponses) {
      this.realTimeResponses = new Map();
    }

    const examKey = responseData.examId.toString();
    if (!this.realTimeResponses.has(examKey)) {
      this.realTimeResponses.set(examKey, []);
    }

    this.realTimeResponses.get(examKey).push(responseData);

    // Keep only recent responses (last 10 minutes)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    const filtered = this.realTimeResponses.get(examKey).filter(r =>
      new Date(r.timestamp).getTime() > tenMinutesAgo
    );
    this.realTimeResponses.set(examKey, filtered);
  }

  /**
   * Get real-time responses for an exam
   * @param {string} examId - Exam ID
   * @returns {Array} - Array of recent responses
   */
  getRealTimeResponses(examId) {
    if (!this.realTimeResponses) {
      return [];
    }

    const examKey = examId.toString();
    return this.realTimeResponses.get(examKey) || [];
  }

  /**
   * Clear real-time responses for an exam
   * @param {string} examId - Exam ID
   */
  clearRealTimeResponses(examId) {
    if (!this.realTimeResponses) {
      return;
    }

    const examKey = examId.toString();
    this.realTimeResponses.delete(examKey);
  }
};

module.exports = AdaptiveDifficultyEngine;