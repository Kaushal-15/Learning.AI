const Question = require('../models/Question');
const Learner = require('../models/Learner');
const Performance = require('../models/Performance');
const AdaptiveDifficultyEngine = require('./AdaptiveDifficultyEngine');

/**
 * Assessment Engine
 * Handles answer processing, feedback generation, and real-time difficulty adjustment
 * Requirements: 3.1, 3.2, 3.3, 1.1
 */
class AssessmentEngine {
  constructor() {
    this.difficultyEngine = new AdaptiveDifficultyEngine();
    
    // Configuration for feedback generation
    this.config = {
      // Hint progression settings
      MAX_HINTS_PER_QUESTION: 3,
      HINT_DELAY_SECONDS: 10,
      
      // Feedback quality settings
      MIN_EXPLANATION_LENGTH: 50,
      MAX_EXPLANATION_LENGTH: 500,
      
      // Performance thresholds for feedback customization
      EXCELLENT_PERFORMANCE_THRESHOLD: 0.9,
      GOOD_PERFORMANCE_THRESHOLD: 0.7,
      NEEDS_IMPROVEMENT_THRESHOLD: 0.5,
      
      // Time-based feedback thresholds
      FAST_ANSWER_THRESHOLD: 30,
      SLOW_ANSWER_THRESHOLD: 120
    };
  }

  /**
   * Process answer submission and generate immediate feedback
   * @param {Object} submission - Answer submission data
   * @param {string} submission.questionId - Question ID
   * @param {string} submission.learnerId - Learner ID
   * @param {string} submission.selectedAnswer - Selected answer
   * @param {number} submission.timeSpent - Time spent in seconds
   * @param {string} submission.sessionId - Session ID
   * @param {number} submission.hintsUsed - Number of hints used
   * @param {number} submission.confidenceLevel - Learner's confidence (1-5)
   * @returns {Promise<Object>} - Assessment result with feedback
   */
  async processAnswerSubmission(submission) {
    try {
      // Validate submission
      this.validateSubmission(submission);
      
      // Get question and learner data
      const [question, learner] = await Promise.all([
        Question.findById(submission.questionId),
        Learner.findById(submission.learnerId)
      ]);

      if (!question) {
        throw new Error('Question not found');
      }
      if (!learner) {
        throw new Error('Learner not found');
      }

      // Determine correctness
      const isCorrect = this.evaluateAnswer(question, submission.selectedAnswer);
      
      // Generate immediate feedback
      const feedback = await this.generateFeedback(question, submission, isCorrect, learner);
      
      // Record performance
      const performanceRecord = await this.recordPerformance(
        submission, 
        question, 
        isCorrect
      );
      
      // Update learner profile
      await this.updateLearnerProfile(learner, question, isCorrect, submission.timeSpent);
      
      // Calculate next difficulty
      const difficultyAdjustment = await this.calculateNextDifficulty(
        learner._id,
        question.category[0], // Primary category
        question.difficulty,
        submission.sessionId
      );
      
      // Update question usage statistics
      await question.updateUsageStats(submission.timeSpent, isCorrect);
      
      return {
        correct: isCorrect,
        feedback: feedback,
        performanceId: performanceRecord._id,
        difficultyAdjustment: difficultyAdjustment,
        learnerProgress: {
          overallAccuracy: learner.overallAccuracy,
          currentStreak: learner.currentStreak,
          categoryMastery: learner.categoryMastery.get(question.category[0])
        },
        recommendations: await this.generateRecommendations(learner, question, isCorrect)
      };

    } catch (error) {
      throw new Error(`Failed to process answer submission: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive feedback for an answer submission
   * @param {Object} question - Question object
   * @param {Object} submission - Submission data
   * @param {boolean} isCorrect - Whether the answer is correct
   * @param {Object} learner - Learner object
   * @returns {Promise<Object>} - Feedback object
   */
  async generateFeedback(question, submission, isCorrect, learner) {
    const feedback = {
      correct: isCorrect,
      selectedAnswer: submission.selectedAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      timeSpent: submission.timeSpent,
      hintsUsed: submission.hintsUsed
    };

    // Generate personalized message based on performance
    feedback.message = this.generatePersonalizedMessage(
      isCorrect, 
      submission.timeSpent, 
      submission.hintsUsed,
      learner
    );

    // Add performance context
    feedback.performanceContext = this.generatePerformanceContext(
      submission.timeSpent,
      submission.hintsUsed,
      question.difficulty
    );

    // Add encouragement or guidance
    feedback.encouragement = this.generateEncouragement(isCorrect, learner, question);

    // Add related concepts if incorrect
    if (!isCorrect) {
      feedback.relatedConcepts = this.extractRelatedConcepts(question);
      feedback.commonMistakes = this.generateCommonMistakes(question, submission.selectedAnswer);
    }

    // Add next steps
    feedback.nextSteps = this.generateNextSteps(isCorrect, question, learner);

    return feedback;
  }

  /**
   * Generate progressive hints for a question
   * @param {string} questionId - Question ID
   * @param {string} learnerId - Learner ID
   * @param {number} hintLevel - Current hint level (0-based)
   * @returns {Promise<Object>} - Hint response
   */
  async generateHint(questionId, learnerId, hintLevel = 0) {
    try {
      const [question, learner] = await Promise.all([
        Question.findById(questionId),
        Learner.findById(learnerId)
      ]);

      if (!question) {
        throw new Error('Question not found');
      }
      if (!learner) {
        throw new Error('Learner not found');
      }

      // Check if hints are available and enabled
      if (!learner.preferences.hintsEnabled) {
        return {
          available: false,
          message: 'Hints are disabled in your preferences'
        };
      }

      if (hintLevel >= this.config.MAX_HINTS_PER_QUESTION) {
        return {
          available: false,
          message: 'Maximum hints reached for this question'
        };
      }

      if (!question.hints || question.hints.length === 0) {
        // Generate dynamic hint if none are predefined
        const dynamicHint = this.generateDynamicHint(question, hintLevel);
        return {
          available: true,
          hint: dynamicHint,
          hintLevel: hintLevel + 1,
          maxHints: this.config.MAX_HINTS_PER_QUESTION,
          message: 'Here\'s a hint to help you:'
        };
      }

      // Use predefined hints
      const hintIndex = Math.min(hintLevel, question.hints.length - 1);
      return {
        available: true,
        hint: question.hints[hintIndex],
        hintLevel: hintLevel + 1,
        maxHints: Math.min(this.config.MAX_HINTS_PER_QUESTION, question.hints.length),
        message: hintLevel === 0 ? 'Here\'s your first hint:' : 'Here\'s another hint:'
      };

    } catch (error) {
      throw new Error(`Failed to generate hint: ${error.message}`);
    }
  }

  /**
   * Evaluate if the selected answer is correct
   * @param {Object} question - Question object
   * @param {string} selectedAnswer - Selected answer
   * @returns {boolean} - Whether the answer is correct
   */
  evaluateAnswer(question, selectedAnswer) {
    // Normalize answers for comparison (trim whitespace, case-insensitive)
    const normalizedSelected = selectedAnswer.trim().toLowerCase();
    const normalizedCorrect = question.correctAnswer.trim().toLowerCase();
    
    return normalizedSelected === normalizedCorrect;
  }

  /**
   * Record performance data
   * @param {Object} submission - Submission data
   * @param {Object} question - Question object
   * @param {boolean} isCorrect - Whether answer is correct
   * @returns {Promise<Object>} - Performance record
   */
  async recordPerformance(submission, question, isCorrect) {
    const performanceData = {
      learnerId: submission.learnerId,
      questionId: submission.questionId,
      selectedAnswer: submission.selectedAnswer,
      correct: isCorrect,
      timeSpent: submission.timeSpent,
      hintsUsed: submission.hintsUsed || 0,
      difficulty: question.difficulty,
      category: question.category,
      sessionId: submission.sessionId,
      confidenceLevel: submission.confidenceLevel,
      deviceType: submission.deviceType || 'desktop',
      metadata: submission.metadata || {}
    };

    const performance = new Performance(performanceData);
    return await performance.save();
  }

  /**
   * Update learner profile based on performance
   * @param {Object} learner - Learner object
   * @param {Object} question - Question object
   * @param {boolean} isCorrect - Whether answer is correct
   * @param {number} timeSpent - Time spent on question
   * @returns {Promise<void>}
   */
  async updateLearnerProfile(learner, question, isCorrect, timeSpent) {
    // Update category mastery for primary category
    const primaryCategory = question.category[0];
    await learner.updateCategoryMastery(primaryCategory, isCorrect, timeSpent);
    
    // Update overall statistics
    await learner.updateOverallStats(isCorrect, timeSpent);
    
    // Update category mastery for all categories in hierarchy
    for (const category of question.category) {
      if (category !== primaryCategory) {
        await learner.updateCategoryMastery(category, isCorrect, timeSpent);
      }
    }
  }

  /**
   * Calculate next difficulty level
   * @param {string} learnerId - Learner ID
   * @param {string} category - Question category
   * @param {number} currentDifficulty - Current difficulty
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} - Difficulty adjustment result
   */
  async calculateNextDifficulty(learnerId, category, currentDifficulty, sessionId) {
    return await this.difficultyEngine.calculateNextDifficulty(
      learnerId,
      category,
      currentDifficulty,
      { sessionId, lookbackQuestions: 5 }
    );
  }

  /**
   * Validate answer submission data
   * @param {Object} submission - Submission data
   * @throws {Error} - If validation fails
   */
  validateSubmission(submission) {
    const required = ['questionId', 'learnerId', 'selectedAnswer', 'timeSpent', 'sessionId'];
    
    for (const field of required) {
      if (submission[field] === undefined || submission[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (typeof submission.timeSpent !== 'number' || submission.timeSpent < 0) {
      throw new Error('Invalid timeSpent value');
    }

    if (submission.hintsUsed && (typeof submission.hintsUsed !== 'number' || submission.hintsUsed < 0)) {
      throw new Error('Invalid hintsUsed value');
    }

    if (submission.confidenceLevel && 
        (typeof submission.confidenceLevel !== 'number' || 
         submission.confidenceLevel < 1 || 
         submission.confidenceLevel > 5)) {
      throw new Error('Invalid confidenceLevel value (must be 1-5)');
    }
  }

  /**
   * Generate personalized message based on performance
   * @param {boolean} isCorrect - Whether answer is correct
   * @param {number} timeSpent - Time spent
   * @param {number} hintsUsed - Hints used
   * @param {Object} learner - Learner object
   * @returns {string} - Personalized message
   */
  generatePersonalizedMessage(isCorrect, timeSpent, hintsUsed, learner) {
    if (isCorrect) {
      if (timeSpent < this.config.FAST_ANSWER_THRESHOLD && hintsUsed === 0) {
        return 'Excellent! You answered quickly and confidently.';
      } else if (hintsUsed === 0) {
        return 'Correct! Well done.';
      } else {
        return 'Correct! The hints helped guide you to the right answer.';
      }
    } else {
      if (hintsUsed > 0) {
        return 'Not quite right, even with the hints. Let\'s review the explanation.';
      } else if (timeSpent > this.config.SLOW_ANSWER_THRESHOLD) {
        return 'That\'s not correct. Take your time to review the explanation.';
      } else {
        return 'That\'s not the right answer. Let\'s look at why.';
      }
    }
  }

  /**
   * Generate performance context information
   * @param {number} timeSpent - Time spent
   * @param {number} hintsUsed - Hints used
   * @param {number} difficulty - Question difficulty
   * @returns {Object} - Performance context
   */
  generatePerformanceContext(timeSpent, hintsUsed, difficulty) {
    const context = {
      timeCategory: 'normal',
      hintUsage: 'none',
      difficultyLevel: 'appropriate'
    };

    // Categorize time spent
    if (timeSpent < this.config.FAST_ANSWER_THRESHOLD) {
      context.timeCategory = 'fast';
      context.timeMessage = 'You answered quickly!';
    } else if (timeSpent > this.config.SLOW_ANSWER_THRESHOLD) {
      context.timeCategory = 'slow';
      context.timeMessage = 'You took your time to think through this.';
    } else {
      context.timeMessage = 'Good pacing on this question.';
    }

    // Categorize hint usage
    if (hintsUsed === 0) {
      context.hintUsage = 'none';
      context.hintMessage = 'You solved this without hints!';
    } else if (hintsUsed <= 2) {
      context.hintUsage = 'moderate';
      context.hintMessage = 'You used hints effectively.';
    } else {
      context.hintUsage = 'heavy';
      context.hintMessage = 'You relied on several hints.';
    }

    // Difficulty context
    if (difficulty <= 3) {
      context.difficultyLevel = 'beginner';
    } else if (difficulty <= 6) {
      context.difficultyLevel = 'intermediate';
    } else {
      context.difficultyLevel = 'advanced';
    }

    return context;
  }

  /**
   * Generate encouragement message
   * @param {boolean} isCorrect - Whether answer is correct
   * @param {Object} learner - Learner object
   * @param {Object} question - Question object
   * @returns {string} - Encouragement message
   */
  generateEncouragement(isCorrect, learner, question) {
    if (isCorrect) {
      if (learner.currentStreak >= 5) {
        return `Amazing! You're on a ${learner.currentStreak}-question streak!`;
      } else if (learner.overallAccuracy > this.config.EXCELLENT_PERFORMANCE_THRESHOLD) {
        return 'Keep up the excellent work!';
      } else {
        return 'Great job! You\'re making good progress.';
      }
    } else {
      if (learner.currentStreak < -3) {
        return 'Don\'t worry, everyone learns at their own pace. Keep trying!';
      } else if (question.difficulty > 7) {
        return 'This was a challenging question. Review the explanation and try similar ones.';
      } else {
        return 'Learning from mistakes is part of the process. You\'ve got this!';
      }
    }
  }

  /**
   * Extract related concepts from question
   * @param {Object} question - Question object
   * @returns {Array} - Array of related concepts
   */
  extractRelatedConcepts(question) {
    // Extract concepts from category hierarchy and tags
    const concepts = [...question.category];
    
    // Add relevant tags as concepts
    if (question.tags) {
      concepts.push(...question.tags.slice(0, 3)); // Limit to 3 most relevant tags
    }
    
    return [...new Set(concepts)]; // Remove duplicates
  }

  /**
   * Generate common mistakes explanation
   * @param {Object} question - Question object
   * @param {string} selectedAnswer - Selected (incorrect) answer
   * @returns {string} - Common mistakes explanation
   */
  generateCommonMistakes(question, selectedAnswer) {
    // This is a simplified version - in a real system, you'd have a database of common mistakes
    const incorrectOptions = question.options.filter(option => option !== question.correctAnswer);
    const selectedIndex = incorrectOptions.indexOf(selectedAnswer);
    
    const commonMistakes = [
      'This is a common misconception. Make sure to consider all aspects of the problem.',
      'Many students choose this option. Remember to read the question carefully.',
      'This answer seems plausible but misses a key detail in the question.',
      'This is a typical error. Focus on the specific requirements mentioned.'
    ];
    
    return commonMistakes[selectedIndex] || commonMistakes[0];
  }

  /**
   * Generate next steps recommendations
   * @param {boolean} isCorrect - Whether answer is correct
   * @param {Object} question - Question object
   * @param {Object} learner - Learner object
   * @returns {Array} - Array of next step recommendations
   */
  generateNextSteps(isCorrect, question, learner) {
    const steps = [];
    
    if (isCorrect) {
      steps.push('Continue with similar questions to reinforce your understanding');
      
      if (question.difficulty < 8) {
        steps.push('Try more challenging questions in this category');
      }
      
      steps.push('Explore related topics to broaden your knowledge');
    } else {
      steps.push('Review the explanation carefully');
      steps.push('Practice similar questions at this difficulty level');
      
      const categoryMastery = learner.categoryMastery.get(question.category[0]);
      if (categoryMastery && categoryMastery.level < 50) {
        steps.push('Consider reviewing fundamental concepts in this category');
      }
      
      steps.push('Use hints when available to guide your thinking');
    }
    
    return steps;
  }

  /**
   * Generate dynamic hint when predefined hints are not available
   * @param {Object} question - Question object
   * @param {number} hintLevel - Current hint level
   * @returns {string} - Dynamic hint
   */
  generateDynamicHint(question, hintLevel) {
    const hints = [
      'Think about the key concepts mentioned in the question.',
      'Consider eliminating obviously incorrect options first.',
      'Look for keywords that might guide you to the correct answer.'
    ];
    
    return hints[Math.min(hintLevel, hints.length - 1)];
  }

  /**
   * Generate recommendations for learning resources
   * @param {Object} learner - Learner object
   * @param {Object} question - Question object
   * @param {boolean} isCorrect - Whether answer is correct
   * @returns {Promise<Array>} - Array of recommendations
   */
  async generateRecommendations(learner, question, isCorrect) {
    const recommendations = [];
    
    if (!isCorrect) {
      recommendations.push({
        type: 'review',
        title: 'Review this topic',
        description: `Study more about ${question.category[0]}`,
        priority: 'high'
      });
    }
    
    // Check for weak areas
    const weakAreas = learner.weakAreas || [];
    if (weakAreas.includes(question.category[0])) {
      recommendations.push({
        type: 'practice',
        title: 'Practice weak area',
        description: `Focus on ${question.category[0]} questions`,
        priority: 'medium'
      });
    }
    
    return recommendations;
  }
}

module.exports = AssessmentEngine;