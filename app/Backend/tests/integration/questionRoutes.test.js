/**
 * Integration tests for Question Routes with AI Integration
 */

const request = require('supertest');
const express = require('express');

// Create a mock service instance
const mockService = {
  generateQuestion: jest.fn(),
  getAIServiceStatus: jest.fn(),
  getAIServiceMetrics: jest.fn(),
  checkAIServiceHealth: jest.fn(),
  getAvailableQuestionTypes: jest.fn(),
  isAIServiceHealthy: jest.fn(),
  hasFallbackQuestions: jest.fn()
};

// Mock the services module
jest.mock('../../services', () => ({
  createQuestionGenerationService: jest.fn(() => mockService)
}));

const { createQuestionGenerationService } = require('../../services');
const questionRoutes = require('../../routes/questionRoutes');

describe('Question Routes Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/questions', questionRoutes);

    // Reset mocks
    jest.clearAllMocks();
    
    // Reset mock service methods
    Object.keys(mockService).forEach(key => {
      if (typeof mockService[key] === 'function') {
        mockService[key].mockReset();
      }
    });
  });

  describe('GET /api/questions', () => {
    test('should return service status and capabilities', async () => {
      const mockStatus = {
        hasClient: true,
        isHealthy: true,
        lastHealthCheck: Date.now(),
        fallbackQuestionsAvailable: 4
      };

      const mockMetrics = {
        service: { hasClient: true, isHealthy: true },
        fallback: { totalQuestions: 15, availableCategories: ['programming', 'mathematics'] },
        capabilities: { supportedQuestionTypes: ['multiple-choice', 'true-false'] }
      };

      mockService.getAIServiceStatus.mockReturnValue(mockStatus);
      mockService.getAIServiceMetrics.mockReturnValue(mockMetrics);

      const response = await request(app)
        .get('/api/questions')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Question Generation Service',
        status: mockStatus,
        metrics: mockMetrics,
        endpoints: expect.any(Object)
      });
    });

    test('should handle service status errors', async () => {
      mockService.getAIServiceStatus.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const response = await request(app)
        .get('/api/questions')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Failed to get service status',
        error: 'Service unavailable'
      });
    });
  });

  describe('POST /api/questions/generate', () => {
    test('should generate question with valid parameters', async () => {
      const mockQuestion = {
        question: "What is the time complexity of binary search?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
        correctAnswer: "O(log n)",
        explanation: "Binary search divides the search space in half with each comparison.",
        hints: ["Think about divide and conquer", "Consider the search space reduction"],
        category: ['Programming', 'Algorithms'],
        difficulty: 6,
        questionType: 'multiple-choice',
        generatedAt: new Date().toISOString(),
        validationScore: 0.85
      };

      mockService.generateQuestion.mockResolvedValue(mockQuestion);
      mockService.isAIServiceHealthy.mockReturnValue(true);

      const requestBody = {
        topic: 'Binary Search',
        category: ['Programming', 'Algorithms'],
        difficulty: 6,
        questionType: 'multiple-choice'
      };

      const response = await request(app)
        .post('/api/questions/generate')
        .send(requestBody)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          ...mockQuestion,
          metadata: {
            generationTime: expect.any(Number),
            aiGenerated: true,
            learnerId: null,
            requestId: expect.any(String)
          }
        }
      });

      expect(mockService.generateQuestion).toHaveBeenCalledWith({
        topic: 'Binary Search',
        category: ['Programming', 'Algorithms'],
        difficulty: 6,
        questionType: 'multiple-choice'
      });
    });

    test('should validate request parameters', async () => {
      const invalidRequest = {
        topic: '', // Invalid: empty topic
        category: [], // Invalid: empty category array
        difficulty: 15, // Invalid: difficulty > 10
        questionType: 'invalid-type' // Invalid: unsupported type
      };

      const response = await request(app)
        .post('/api/questions/generate')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error'
      });
      
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Topic is required')
        ])
      );
    });

    test('should validate learner ID format when provided', async () => {
      const invalidRequest = {
        topic: 'Valid Topic',
        category: ['Programming'],
        difficulty: 5,
        learnerId: 'invalid-id' // Invalid ObjectId format
      };

      const response = await request(app)
        .post('/api/questions/generate')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error',
        details: expect.arrayContaining([
          expect.stringContaining('Learner ID must be a valid MongoDB ObjectId')
        ])
      });
    });

    test('should validate exclude question IDs format when provided', async () => {
      const invalidRequest = {
        topic: 'Valid Topic',
        category: ['Programming'],
        difficulty: 5,
        excludeQuestionIds: ['valid-id', 'invalid-id'] // Mixed valid/invalid ObjectIds
      };

      const response = await request(app)
        .post('/api/questions/generate')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error',
        details: expect.arrayContaining([
          expect.stringContaining('Question ID must be a valid MongoDB ObjectId')
        ])
      });
    });

    test('should handle question generation errors', async () => {
      mockService.generateQuestion.mockRejectedValue(new Error('AI service unavailable'));
      mockService.hasFallbackQuestions.mockReturnValue(true);

      const requestBody = {
        topic: 'Test Topic',
        category: ['Programming'],
        difficulty: 5
      };

      const response = await request(app)
        .post('/api/questions/generate')
        .send(requestBody)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Failed to generate question',
        error: 'AI service unavailable',
        fallbackAvailable: true,
        requestId: expect.any(String)
      });
    });

    test('should handle rate limit errors with appropriate status code', async () => {
      mockService.generateQuestion.mockRejectedValue(new Error('Rate limit exceeded'));
      mockService.hasFallbackQuestions.mockReturnValue(true);

      const requestBody = {
        topic: 'Test Topic',
        category: ['Programming'],
        difficulty: 5
      };

      const response = await request(app)
        .post('/api/questions/generate')
        .send(requestBody)
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Service temporarily unavailable due to rate limiting',
        error: 'Rate limit exceeded',
        fallbackAvailable: true,
        retryAfter: 60,
        requestId: expect.any(String)
      });
    });

    test('should handle timeout errors with appropriate status code', async () => {
      mockService.generateQuestion.mockRejectedValue(new Error('Request timeout'));
      mockService.hasFallbackQuestions.mockReturnValue(false);

      const requestBody = {
        topic: 'Test Topic',
        category: ['Programming'],
        difficulty: 5
      };

      const response = await request(app)
        .post('/api/questions/generate')
        .send(requestBody)
        .expect(504);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Question generation timed out',
        error: 'Request timeout',
        fallbackAvailable: false,
        requestId: expect.any(String)
      });
    });

    test('should handle invalid parameter errors with appropriate status code', async () => {
      mockService.generateQuestion.mockRejectedValue(new Error('Invalid topic specified'));
      mockService.hasFallbackQuestions.mockReturnValue(true);

      const requestBody = {
        topic: 'Test Topic',
        category: ['Programming'],
        difficulty: 5
      };

      const response = await request(app)
        .post('/api/questions/generate')
        .send(requestBody)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid request parameters',
        error: 'Invalid topic specified',
        fallbackAvailable: true,
        requestId: expect.any(String)
      });
    });

    test('should accept optional parameters', async () => {
      const mockQuestion = {
        question: "Test question?",
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        explanation: "Test explanation",
        category: ['Programming'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };

      mockService.generateQuestion.mockResolvedValue(mockQuestion);
      mockService.isAIServiceHealthy.mockReturnValue(false);

      const requestBody = {
        topic: 'Test Topic',
        category: ['Programming'],
        difficulty: 5,
        learnerId: '507f1f77bcf86cd799439011',
        excludeQuestionIds: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013']
      };

      const response = await request(app)
        .post('/api/questions/generate')
        .send(requestBody)
        .expect(200);

      expect(response.body.data.metadata.learnerId).toBe('507f1f77bcf86cd799439011');
      expect(response.body.data.metadata.aiGenerated).toBe(false);
    });
  });

  describe('GET /api/questions/health', () => {
    test('should return AI service health status', async () => {
      const mockStatus = {
        hasClient: true,
        isHealthy: true,
        lastHealthCheck: Date.now()
      };

      mockService.checkAIServiceHealth.mockResolvedValue(true);
      mockService.getAIServiceStatus.mockReturnValue(mockStatus);

      const response = await request(app)
        .get('/api/questions/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        healthy: true,
        status: mockStatus,
        timestamp: expect.any(String)
      });
    });

    test('should handle health check failures', async () => {
      mockService.checkAIServiceHealth.mockRejectedValue(new Error('Health check failed'));

      const response = await request(app)
        .get('/api/questions/health')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        healthy: false,
        error: 'Health check failed',
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/questions/metrics', () => {
    test('should return detailed service metrics', async () => {
      const mockMetrics = {
        service: {
          hasClient: true,
          isHealthy: true,
          lastHealthCheck: Date.now(),
          rateLimitRetries: 0
        },
        fallback: {
          totalQuestions: 20,
          categoryDistribution: {
            programming: 8,
            mathematics: 6,
            science: 4,
            general: 2
          },
          availableCategories: ['programming', 'mathematics', 'science', 'general']
        },
        capabilities: {
          supportedQuestionTypes: ['multiple-choice', 'true-false', 'fill-in-the-blank'],
          categorySpecificPrompts: ['programming', 'mathematics', 'science'],
          difficultyLevels: '1-10',
          temperatureAdjustment: true,
          contentValidation: true
        }
      };

      mockService.getAIServiceMetrics.mockReturnValue(mockMetrics);

      const response = await request(app)
        .get('/api/questions/metrics')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        metrics: mockMetrics,
        timestamp: expect.any(String)
      });
    });

    test('should handle metrics retrieval errors', async () => {
      mockService.getAIServiceMetrics.mockImplementation(() => {
        throw new Error('Metrics unavailable');
      });

      const response = await request(app)
        .get('/api/questions/metrics')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Failed to get metrics',
        error: 'Metrics unavailable'
      });
    });
  });

  describe('GET /api/questions/categories', () => {
    test('should return available categories and question types', async () => {
      const mockQuestionTypes = ['multiple-choice', 'true-false', 'fill-in-the-blank'];
      const mockMetrics = {
        fallback: {
          availableCategories: ['programming', 'mathematics', 'science', 'general']
        },
        capabilities: {
          categorySpecificPrompts: ['programming', 'mathematics', 'science']
        }
      };

      mockService.getAvailableQuestionTypes.mockReturnValue(mockQuestionTypes);
      mockService.getAIServiceMetrics.mockReturnValue(mockMetrics);

      const response = await request(app)
        .get('/api/questions/categories')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          questionTypes: mockQuestionTypes,
          categories: mockMetrics.fallback.availableCategories,
          categorySpecificPrompts: mockMetrics.capabilities.categorySpecificPrompts,
          difficultyRange: {
            min: 1,
            max: 10,
            description: expect.any(String)
          }
        }
      });
    });
  });

  describe('POST /api/questions/validate', () => {
    test('should validate parameters without generating question', async () => {
      const validParams = {
        topic: 'Valid Topic',
        category: ['Programming', 'Algorithms'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };

      const response = await request(app)
        .post('/api/questions/validate')
        .send(validParams)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        valid: true,
        message: 'Parameters are valid',
        normalizedParams: validParams
      });
    });

    test('should return detailed validation errors', async () => {
      const invalidParams = {
        topic: '',
        category: ['Programming'],
        difficulty: 15
      };

      const response = await request(app)
        .post('/api/questions/validate')
        .send(invalidParams)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        valid: false,
        message: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String),
            value: expect.anything()
          })
        ])
      });
    });
  });

  describe('GET /api/questions/:id', () => {
    // Mock the Question model
    const mockQuestion = {
      _id: '507f1f77bcf86cd799439011',
      content: 'What is the time complexity of binary search?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
      correctAnswer: 'O(log n)',
      explanation: 'Binary search divides the search space in half with each comparison.',
      category: ['Programming', 'Algorithms'],
      difficulty: 6,
      tags: ['programming', 'algorithms', 'complexity'],
      hints: ['Think about divide and conquer', 'Consider the search space reduction'],
      generatedBy: 'AI',
      validationScore: 0.85,
      timesUsed: 5,
      averageTimeSpent: 45.2,
      successRate: 0.8,
      createdAt: new Date('2023-01-01').toISOString(),
      updatedAt: new Date('2023-01-02').toISOString(),
      categoryDepth: 2,
      primaryCategory: 'Programming'
    };

    beforeEach(() => {
      // Mock the Question model
      jest.doMock('../../models/Question', () => ({
        findById: jest.fn()
      }));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should retrieve question by valid ID', async () => {
      const Question = require('../../models/Question');
      Question.findById.mockResolvedValue(mockQuestion);

      const response = await request(app)
        .get('/api/questions/507f1f77bcf86cd799439011')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: '507f1f77bcf86cd799439011',
          content: mockQuestion.content,
          options: mockQuestion.options,
          correctAnswer: mockQuestion.correctAnswer,
          explanation: mockQuestion.explanation,
          category: mockQuestion.category,
          difficulty: mockQuestion.difficulty,
          tags: mockQuestion.tags,
          hints: mockQuestion.hints,
          generatedBy: mockQuestion.generatedBy,
          validationScore: mockQuestion.validationScore,
          metadata: {
            timesUsed: mockQuestion.timesUsed,
            averageTimeSpent: mockQuestion.averageTimeSpent,
            successRate: mockQuestion.successRate,
            createdAt: mockQuestion.createdAt,
            updatedAt: mockQuestion.updatedAt,
            categoryDepth: mockQuestion.categoryDepth,
            primaryCategory: mockQuestion.primaryCategory
          }
        }
      });

      expect(Question.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    test('should return 404 for non-existent question', async () => {
      const Question = require('../../models/Question');
      Question.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/questions/507f1f77bcf86cd799439012')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Question not found',
        details: 'No question found with ID: 507f1f77bcf86cd799439012'
      });
    });

    test('should return 400 for invalid ObjectId format', async () => {
      const response = await request(app)
        .get('/api/questions/invalid-id')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid question ID format',
        details: 'Question ID must be a valid MongoDB ObjectId'
      });
    });

    test('should handle database errors', async () => {
      const Question = require('../../models/Question');
      Question.findById.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/questions/507f1f77bcf86cd799439011')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Failed to retrieve question',
        error: 'Database connection failed'
      });
    });

    test('should handle malformed ObjectId', async () => {
      const response = await request(app)
        .get('/api/questions/507f1f77bcf86cd79943901') // 23 characters instead of 24
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid question ID format',
        details: 'Question ID must be a valid MongoDB ObjectId'
      });
    });

    test('should handle ObjectId with invalid characters', async () => {
      const response = await request(app)
        .get('/api/questions/507f1f77bcf86cd79943901g') // 'g' is not a valid hex character
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid question ID format',
        details: 'Question ID must be a valid MongoDB ObjectId'
      });
    });
  });

  describe('Request validation edge cases', () => {
    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/questions/generate')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Topic is required')
        ])
      );
    });

    test('should handle category array validation', async () => {
      const response = await request(app)
        .post('/api/questions/generate')
        .send({
          topic: 'Valid Topic',
          category: ['A'.repeat(101)], // Category too long
          difficulty: 5
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details.some(detail => 
        detail.includes('category') && detail.includes('100')
      )).toBe(true);
    });

    test('should handle topic length validation', async () => {
      const response = await request(app)
        .post('/api/questions/generate')
        .send({
          topic: 'A'.repeat(201), // Topic too long
          category: ['Programming'],
          difficulty: 5
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details.some(detail => 
        detail.includes('Topic') && detail.includes('200')
      )).toBe(true);
    });

    test('should set default question type', async () => {
      const mockQuestion = {
        question: "Test question?",
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        explanation: "Test explanation",
        questionType: 'multiple-choice'
      };

      mockService.generateQuestion.mockResolvedValue(mockQuestion);
      mockService.isAIServiceHealthy.mockReturnValue(true);

      const response = await request(app)
        .post('/api/questions/generate')
        .send({
          topic: 'Test Topic',
          category: ['Programming'],
          difficulty: 5
          // No questionType specified - should default to 'multiple-choice'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockService.generateQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          questionType: 'multiple-choice'
        })
      );
    });
  });
});