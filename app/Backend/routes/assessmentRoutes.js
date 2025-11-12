const express = require('express');
const router = express.Router();
const Joi = require('joi');
const AssessmentEngine = require('../services/AssessmentEngine');
const Question = require('../models/Question');
const { validate } = require('../middleware/validation');

// Initialize assessment engine
const assessmentEngine = new AssessmentEngine();

// Validation schemas for assessment endpoints
const submitAnswerSchema = Joi.object({
  questionId: Joi.string().required(),
  learnerId: Joi.string().required(),
  selectedAnswer: Joi.string().required(),
  timeSpent: Joi.number().positive().required(),
  sessionId: Joi.string().required(),
  hintsUsed: Joi.number().integer().min(0).default(0),
  confidenceLevel: Joi.number().integer().min(1).max(5).optional(),
  deviceType: Joi.string().valid('desktop', 'mobile', 'tablet').default('desktop'),
  metadata: Joi.object().default({})
});

const hintRequestSchema = Joi.object({
  questionId: Joi.string().required(),
  learnerId: Joi.string().required(),
  hintLevel: Joi.number().integer().min(0).default(0)
});

// Custom validation middleware that applies defaults and shows all errors
const validateWithDefaults = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false, // Show all validation errors
      allowUnknown: false,
      stripUnknown: true
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    
    // Apply the validated and defaulted values back to req.body
    req.body = value;
    next();
  };
};

/**
 * POST /api/assessment/submit
 * Submit an answer for assessment and receive immediate feedback
 * Requirements: 3.1, 1.1
 */
router.post('/submit', validateWithDefaults(submitAnswerSchema), async (req, res) => {
  try {
    const submission = req.body;
    
    // Process the answer submission through the assessment engine
    const result = await assessmentEngine.processAnswerSubmission(submission);
    
    res.status(200).json({
      success: true,
      data: {
        correct: result.correct,
        feedback: result.feedback,
        performanceId: result.performanceId,
        difficultyAdjustment: result.difficultyAdjustment,
        learnerProgress: result.learnerProgress,
        recommendations: result.recommendations
      }
    });

  } catch (error) {
    console.error('Error processing answer submission:', error);
    
    // Handle specific error types
    if (error.message.includes('Question not found')) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
        error: 'QUESTION_NOT_FOUND'
      });
    }
    
    if (error.message.includes('Learner not found')) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found',
        error: 'LEARNER_NOT_FOUND'
      });
    }
    
    if (error.message.includes('Missing required field') || error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'VALIDATION_ERROR'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to process answer submission',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * GET /api/assessment/feedback/:questionId
 * Get detailed explanations and feedback for a specific question
 * Requirements: 3.1, 3.4
 */
router.get('/feedback/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { learnerId } = req.query;
    
    // Validate required parameters
    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: 'Question ID is required',
        error: 'MISSING_QUESTION_ID'
      });
    }
    
    if (!learnerId) {
      return res.status(400).json({
        success: false,
        message: 'Learner ID is required as query parameter',
        error: 'MISSING_LEARNER_ID'
      });
    }
    
    // Get the question
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
        error: 'QUESTION_NOT_FOUND'
      });
    }
    
    // Get learner's performance history for this question
    const Performance = require('../models/Performance');
    const performanceHistory = await Performance.find({
      questionId: questionId,
      learnerId: learnerId
    }).sort({ timestamp: -1 }).limit(5);
    
    // Prepare detailed feedback
    const detailedFeedback = {
      questionId: question._id,
      question: question.content,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      category: question.category,
      difficulty: question.difficulty,
      tags: question.tags,
      hints: question.hints || [],
      relatedConcepts: assessmentEngine.extractRelatedConcepts(question),
      performanceHistory: performanceHistory.map(perf => ({
        timestamp: perf.timestamp,
        selectedAnswer: perf.selectedAnswer,
        correct: perf.correct,
        timeSpent: perf.timeSpent,
        hintsUsed: perf.hintsUsed
      })),
      learningObjectives: question.learningObjectives || [],
      prerequisites: question.prerequisites || [],
      nextSteps: [
        'Practice similar questions to reinforce understanding',
        'Review related concepts if needed',
        'Try questions at the next difficulty level'
      ]
    };
    
    res.status(200).json({
      success: true,
      data: detailedFeedback
    });

  } catch (error) {
    console.error('Error retrieving question feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve question feedback',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * POST /api/assessment/hint
 * Request progressive hints for a question
 * Requirements: 3.4, 1.1
 */
router.post('/hint', validateWithDefaults(hintRequestSchema), async (req, res) => {
  try {
    const { questionId, learnerId, hintLevel } = req.body;
    
    // Generate hint using the assessment engine
    const hintResponse = await assessmentEngine.generateHint(questionId, learnerId, hintLevel);
    
    if (!hintResponse.available) {
      return res.status(200).json({
        success: true,
        data: {
          available: false,
          message: hintResponse.message,
          hintLevel: hintLevel,
          maxHints: assessmentEngine.config.MAX_HINTS_PER_QUESTION
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        available: true,
        hint: hintResponse.hint,
        hintLevel: hintResponse.hintLevel,
        maxHints: hintResponse.maxHints,
        message: hintResponse.message,
        hasMoreHints: hintResponse.hintLevel < hintResponse.maxHints
      }
    });

  } catch (error) {
    console.error('Error generating hint:', error);
    
    // Handle specific error types
    if (error.message.includes('Question not found')) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
        error: 'QUESTION_NOT_FOUND'
      });
    }
    
    if (error.message.includes('Learner not found')) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found',
        error: 'LEARNER_NOT_FOUND'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate hint',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

module.exports = router;