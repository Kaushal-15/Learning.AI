const express = require('express');
const Joi = require('joi');
const { createQuestionGenerationService } = require('../services');
const router = express.Router();

// Initialize question generation service
const questionService = createQuestionGenerationService({
  openaiApiKey: process.env.OPENAI_API_KEY,
  aiOptions: {
    model: process.env.AI_MODEL || 'gpt-3.5-turbo',
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT) || 30000,
    maxRetries: 3
  }
});

// Validation schemas
const generateQuestionSchema = Joi.object({
  topic: Joi.string().min(1).max(200).required()
    .messages({
      'string.empty': 'Topic is required',
      'string.min': 'Topic must be at least 1 character long',
      'string.max': 'Topic cannot exceed 200 characters',
      'any.required': 'Topic is required'
    }),
  category: Joi.array().items(Joi.string().min(1).max(100)).min(1).max(5).required()
    .messages({
      'array.min': 'At least one category is required',
      'array.max': 'Cannot have more than 5 categories',
      'any.required': 'Category is required'
    }),
  difficulty: Joi.number().integer().min(1).max(10).required()
    .messages({
      'number.base': 'Difficulty must be a number',
      'number.integer': 'Difficulty must be an integer',
      'number.min': 'Difficulty must be at least 1',
      'number.max': 'Difficulty cannot exceed 10',
      'any.required': 'Difficulty is required'
    }),
  questionType: Joi.string().valid('multiple-choice', 'true-false', 'fill-in-the-blank').default('multiple-choice')
    .messages({
      'any.only': 'Question type must be one of: multiple-choice, true-false, fill-in-the-blank'
    }),
  learnerId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional()
    .messages({
      'string.pattern.base': 'Learner ID must be a valid MongoDB ObjectId'
    }),
  excludeQuestionIds: Joi.array().items(
    Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'Question ID must be a valid MongoDB ObjectId'
      })
  ).optional()
});

// GET /api/questions - Get service status and capabilities
router.get('/', async (req, res) => {
  try {
    const status = questionService.getAIServiceStatus();
    const metrics = questionService.getAIServiceMetrics();
    
    res.json({
      success: true,
      message: 'Question Generation Service',
      status,
      metrics,
      endpoints: {
        generate: 'POST /api/questions/generate',
        health: 'GET /api/questions/health',
        metrics: 'GET /api/questions/metrics'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get service status',
      error: error.message
    });
  }
});

// POST /api/questions/generate - Generate a new question
router.post('/generate', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = generateQuestionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { topic, category, difficulty, questionType, learnerId, excludeQuestionIds } = value;

    // Generate question
    const startTime = Date.now();
    const question = await questionService.generateQuestion({
      topic,
      category,
      difficulty,
      questionType
    });

    const generationTime = Date.now() - startTime;

    // Add metadata
    const response = {
      success: true,
      data: {
        ...question,
        metadata: {
          generationTime,
          aiGenerated: questionService.isAIServiceHealthy(),
          learnerId: learnerId || null,
          requestId: req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      }
    };

    // Log successful generation
    console.log(`Question generated: ${topic} (${category.join(' > ')}) - Difficulty: ${difficulty} - Time: ${generationTime}ms`);

    res.json(response);

  } catch (error) {
    console.error('Question generation error:', error);
    
    // Categorize error types for better response
    let statusCode = 500;
    let errorMessage = 'Failed to generate question';
    let errorDetails = error.message;
    
    if (error.message.includes('Invalid topic') || error.message.includes('Unsupported')) {
      statusCode = 400;
      errorMessage = 'Invalid request parameters';
    } else if (error.message.includes('Rate limit') || error.message.includes('quota')) {
      statusCode = 429;
      errorMessage = 'Service temporarily unavailable due to rate limiting';
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
      errorMessage = 'Question generation timed out';
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: errorDetails,
      fallbackAvailable: questionService.hasFallbackQuestions(),
      retryAfter: statusCode === 429 ? 60 : undefined, // Suggest retry after 60 seconds for rate limits
      requestId: req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }
});

// GET /api/questions/health - Health check for AI service
router.get('/health', async (req, res) => {
  try {
    const isHealthy = await questionService.checkAIServiceHealth();
    const status = questionService.getAIServiceStatus();
    
    res.json({
      success: true,
      healthy: isHealthy,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/questions/metrics - Detailed service metrics
router.get('/metrics', (req, res) => {
  try {
    const metrics = questionService.getAIServiceMetrics();
    
    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get metrics',
      error: error.message
    });
  }
});

// GET /api/questions/categories - Get available categories and question types
router.get('/categories', (req, res) => {
  try {
    const questionTypes = questionService.getAvailableQuestionTypes();
    const metrics = questionService.getAIServiceMetrics();
    
    res.json({
      success: true,
      data: {
        questionTypes,
        categories: metrics.fallback.availableCategories,
        categorySpecificPrompts: metrics.capabilities.categorySpecificPrompts,
        difficultyRange: {
          min: 1,
          max: 10,
          description: 'Difficulty levels from 1 (basic) to 10 (expert)'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
      error: error.message
    });
  }
});

// POST /api/questions/validate - Validate question parameters without generating
router.post('/validate', (req, res) => {
  try {
    const { error, value } = generateQuestionSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context.value
        }))
      });
    }

    res.json({
      success: true,
      valid: true,
      message: 'Parameters are valid',
      normalizedParams: value
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Validation error',
      error: error.message
    });
  }
});

// GET /api/questions/:id - Get question by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
        details: 'Question ID must be a valid MongoDB ObjectId'
      });
    }

    // Import Question model
    const Question = require('../models/Question');
    
    // Find question by ID
    const question = await Question.findById(id);
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
        details: `No question found with ID: ${id}`
      });
    }

    // Return question data (excluding internal fields)
    const questionData = {
      id: question._id,
      content: question.content,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      category: question.category,
      difficulty: question.difficulty,
      tags: question.tags,
      hints: question.hints,
      generatedBy: question.generatedBy,
      validationScore: question.validationScore,
      metadata: {
        timesUsed: question.timesUsed,
        averageTimeSpent: question.averageTimeSpent,
        successRate: question.successRate,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
        categoryDepth: question.categoryDepth,
        primaryCategory: question.primaryCategory
      }
    };

    res.json({
      success: true,
      data: questionData
    });

  } catch (error) {
    console.error('Error retrieving question:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve question',
      error: error.message
    });
  }
});

module.exports = router;