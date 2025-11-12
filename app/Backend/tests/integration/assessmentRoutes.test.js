/**
 * Integration tests for Assessment Routes
 * Requirements: 3.1, 3.4, 1.1
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// Mock the models and services
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
  learningObjectives: ['Understand time complexity', 'Apply algorithmic analysis'],
  prerequisites: ['Basic programming knowledge']
};

const mockLearner = {
  _id: '507f1f77bcf86cd799439012',
  name: 'Test Learner',
  email: 'test@example.com',
  categoryMastery: new Map([
    ['Programming', { level: 75, confidence: 0.8, lastAssessed: new Date() }]
  ]),
  overallAccuracy: 0.75,
  currentStreak: 3,
  weakAreas: ['Algorithms'],
  preferences: { hintsEnabled: true }
};

const mockPerformanceHistory = [
  {
    timestamp: new Date('2023-01-01'),
    selectedAnswer: 'O(n)',
    correct: false,
    timeSpent: 45,
    hintsUsed: 1
  },
  {
    timestamp: new Date('2023-01-02'),
    selectedAnswer: 'O(log n)',
    correct: true,
    timeSpent: 30,
    hintsUsed: 0
  }
];

// Mock the AssessmentEngine
const mockAssessmentEngine = {
  processAnswerSubmission: jest.fn(),
  generateHint: jest.fn(),
  extractRelatedConcepts: jest.fn(),
  config: {
    MAX_HINTS_PER_QUESTION: 3
  }
};

// Mock the models
jest.mock('../../models/Question', () => ({
  findById: jest.fn()
}));

jest.mock('../../models/Performance', () => ({
  find: jest.fn()
}));

// Mock the AssessmentEngine
jest.mock('../../services/AssessmentEngine', () => {
  return jest.fn().mockImplementation(() => mockAssessmentEngine);
});

const Question = require('../../models/Question');
const Performance = require('../../models/Performance');
const assessmentRoutes = require('../../routes/assessmentRoutes');

describe('Assessment Routes Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/assessment', assessmentRoutes);

    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset mock methods
    Object.keys(mockAssessmentEngine).forEach(key => {
      if (typeof mockAssessmentEngine[key] === 'function') {
        mockAssessmentEngine[key].mockReset();
      }
    });

    Question.findById.mockReset();
    Performance.find.mockReset();
  });

  describe('POST /api/assessment/submit', () => {
    const validSubmission = {
      questionId: '507f1f77bcf86cd799439011',
      learnerId: '507f1f77bcf86cd799439012',
      selectedAnswer: 'O(log n)',
      timeSpent: 45,
      sessionId: 'session-123',
      hintsUsed: 0,
      confidenceLevel: 4,
      deviceType: 'desktop',
      metadata: { source: 'quiz' }
    };

    test('should successfully process answer submission', async () => {
      const mockResult = {
        correct: true,
        feedback: {
          correct: true,
          selectedAnswer: 'O(log n)',
          correctAnswer: 'O(log n)',
          explanation: 'Binary search divides the search space in half with each comparison.',
          message: 'Excellent! You answered quickly and confidently.',
          performanceContext: {
            timeCategory: 'normal',
            hintUsage: 'none',
            difficultyLevel: 'intermediate'
          },
          encouragement: 'Great job! You\'re making good progress.',
          nextSteps: ['Continue with similar questions to reinforce your understanding']
        },
        performanceId: '507f1f77bcf86cd799439013',
        difficultyAdjustment: {
          currentDifficulty: 6,
          nextDifficulty: 7,
          adjustment: 1,
          reason: 'Consistent correct answers'
        },
        learnerProgress: {
          overallAccuracy: 0.78,
          currentStreak: 4,
          categoryMastery: { level: 78, confidence: 0.82 }
        },
        recommendations: [
          {
            type: 'practice',
            title: 'Try harder questions',
            description: 'You\'re ready for more challenging problems',
            priority: 'medium'
          }
        ]
      };

      mockAssessmentEngine.processAnswerSubmission.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/assessment/submit')
        .send(validSubmission)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          correct: true,
          feedback: expect.objectContaining({
            correct: true,
            selectedAnswer: 'O(log n)',
            correctAnswer: 'O(log n)',
            explanation: expect.any(String),
            message: expect.any(String)
          }),
          performanceId: '507f1f77bcf86cd799439013',
          difficultyAdjustment: expect.objectContaining({
            currentDifficulty: 6,
            nextDifficulty: 7
          }),
          learnerProgress: expect.objectContaining({
            overallAccuracy: expect.any(Number),
            currentStreak: expect.any(Number)
          }),
          recommendations: expect.any(Array)
        }
      });

      expect(mockAssessmentEngine.processAnswerSubmission).toHaveBeenCalledWith(validSubmission);
    });

    test('should validate required fields', async () => {
      const invalidSubmission = {
        questionId: '507f1f77bcf86cd799439011',
        // Missing learnerId, selectedAnswer, timeSpent, sessionId
      };

      const response = await request(app)
        .post('/api/assessment/submit')
        .send(invalidSubmission)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error',
        details: expect.arrayContaining([
          expect.stringContaining('learnerId'),
          expect.stringContaining('selectedAnswer'),
          expect.stringContaining('timeSpent'),
          expect.stringContaining('sessionId')
        ])
      });
    });

    test('should validate timeSpent is positive number', async () => {
      const invalidSubmission = {
        ...validSubmission,
        timeSpent: -10
      };

      const response = await request(app)
        .post('/api/assessment/submit')
        .send(invalidSubmission)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error',
        details: expect.arrayContaining([
          expect.stringContaining('timeSpent')
        ])
      });
    });

    test('should validate confidenceLevel range', async () => {
      const invalidSubmission = {
        ...validSubmission,
        confidenceLevel: 6 // Should be 1-5
      };

      const response = await request(app)
        .post('/api/assessment/submit')
        .send(invalidSubmission)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error',
        details: expect.arrayContaining([
          expect.stringContaining('confidenceLevel')
        ])
      });
    });

    test('should validate deviceType enum', async () => {
      const invalidSubmission = {
        ...validSubmission,
        deviceType: 'smartwatch' // Not in valid enum
      };

      const response = await request(app)
        .post('/api/assessment/submit')
        .send(invalidSubmission)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error',
        details: expect.arrayContaining([
          expect.stringContaining('deviceType')
        ])
      });
    });

    test('should handle question not found error', async () => {
      mockAssessmentEngine.processAnswerSubmission.mockRejectedValue(
        new Error('Question not found')
      );

      const response = await request(app)
        .post('/api/assessment/submit')
        .send(validSubmission)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Question not found',
        error: 'QUESTION_NOT_FOUND'
      });
    });

    test('should handle learner not found error', async () => {
      mockAssessmentEngine.processAnswerSubmission.mockRejectedValue(
        new Error('Learner not found')
      );

      const response = await request(app)
        .post('/api/assessment/submit')
        .send(validSubmission)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Learner not found',
        error: 'LEARNER_NOT_FOUND'
      });
    });

    test('should handle validation errors from assessment engine', async () => {
      mockAssessmentEngine.processAnswerSubmission.mockRejectedValue(
        new Error('Missing required field: sessionId')
      );

      const response = await request(app)
        .post('/api/assessment/submit')
        .send(validSubmission)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Missing required field: sessionId',
        error: 'VALIDATION_ERROR'
      });
    });

    test('should handle internal server errors', async () => {
      mockAssessmentEngine.processAnswerSubmission.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/assessment/submit')
        .send(validSubmission)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Failed to process answer submission',
        error: 'INTERNAL_SERVER_ERROR'
      });
    });

    test('should set default values for optional fields', async () => {
      const minimalSubmission = {
        questionId: '507f1f77bcf86cd799439011',
        learnerId: '507f1f77bcf86cd799439012',
        selectedAnswer: 'O(log n)',
        timeSpent: 45,
        sessionId: 'session-123'
      };

      const mockResult = {
        correct: true,
        feedback: { correct: true },
        performanceId: '507f1f77bcf86cd799439013',
        difficultyAdjustment: {},
        learnerProgress: {},
        recommendations: []
      };

      mockAssessmentEngine.processAnswerSubmission.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/assessment/submit')
        .send(minimalSubmission)
        .expect(200);

      expect(mockAssessmentEngine.processAnswerSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          ...minimalSubmission,
          hintsUsed: 0,
          deviceType: 'desktop',
          metadata: {}
        })
      );
    });
  });

  describe('GET /api/assessment/feedback/:questionId', () => {
    test('should retrieve detailed feedback for a question', async () => {
      Question.findById.mockResolvedValue(mockQuestion);
      Performance.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockPerformanceHistory)
        })
      });
      mockAssessmentEngine.extractRelatedConcepts.mockReturnValue(['Programming', 'Algorithms', 'Complexity Analysis']);

      const response = await request(app)
        .get('/api/assessment/feedback/507f1f77bcf86cd799439011?learnerId=507f1f77bcf86cd799439012')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          questionId: '507f1f77bcf86cd799439011',
          question: mockQuestion.content,
          options: mockQuestion.options,
          correctAnswer: mockQuestion.correctAnswer,
          explanation: mockQuestion.explanation,
          category: mockQuestion.category,
          difficulty: mockQuestion.difficulty,
          tags: mockQuestion.tags,
          hints: mockQuestion.hints,
          relatedConcepts: expect.any(Array),
          performanceHistory: expect.arrayContaining([
            expect.objectContaining({
              timestamp: expect.any(String),
              selectedAnswer: expect.any(String),
              correct: expect.any(Boolean),
              timeSpent: expect.any(Number),
              hintsUsed: expect.any(Number)
            })
          ]),
          learningObjectives: mockQuestion.learningObjectives,
          prerequisites: mockQuestion.prerequisites,
          nextSteps: expect.any(Array)
        }
      });

      expect(Question.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(Performance.find).toHaveBeenCalledWith({
        questionId: '507f1f77bcf86cd799439011',
        learnerId: '507f1f77bcf86cd799439012'
      });
    });

    test('should require learnerId query parameter', async () => {
      const response = await request(app)
        .get('/api/assessment/feedback/507f1f77bcf86cd799439011')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Learner ID is required as query parameter',
        error: 'MISSING_LEARNER_ID'
      });
    });

    test('should handle question not found', async () => {
      Question.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/assessment/feedback/507f1f77bcf86cd799439011?learnerId=507f1f77bcf86cd799439012')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Question not found',
        error: 'QUESTION_NOT_FOUND'
      });
    });

    test('should handle database errors', async () => {
      Question.findById.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/assessment/feedback/507f1f77bcf86cd799439011?learnerId=507f1f77bcf86cd799439012')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Failed to retrieve question feedback',
        error: 'INTERNAL_SERVER_ERROR'
      });
    });

    test('should handle empty performance history', async () => {
      Question.findById.mockResolvedValue(mockQuestion);
      Performance.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([])
        })
      });
      mockAssessmentEngine.extractRelatedConcepts.mockReturnValue(['Programming']);

      const response = await request(app)
        .get('/api/assessment/feedback/507f1f77bcf86cd799439011?learnerId=507f1f77bcf86cd799439012')
        .expect(200);

      expect(response.body.data.performanceHistory).toEqual([]);
    });

    test('should handle questions without optional fields', async () => {
      const minimalQuestion = {
        _id: '507f1f77bcf86cd799439011',
        content: 'Test question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
        explanation: 'Test explanation',
        category: ['Test'],
        difficulty: 5
      };

      Question.findById.mockResolvedValue(minimalQuestion);
      Performance.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([])
        })
      });
      mockAssessmentEngine.extractRelatedConcepts.mockReturnValue(['Test']);

      const response = await request(app)
        .get('/api/assessment/feedback/507f1f77bcf86cd799439011?learnerId=507f1f77bcf86cd799439012')
        .expect(200);

      expect(response.body.data).toMatchObject({
        questionId: '507f1f77bcf86cd799439011',
        question: minimalQuestion.content,
        hints: [],
        learningObjectives: [],
        prerequisites: []
      });
    });
  });

  describe('POST /api/assessment/hint', () => {
    const validHintRequest = {
      questionId: '507f1f77bcf86cd799439011',
      learnerId: '507f1f77bcf86cd799439012',
      hintLevel: 0
    };

    test('should generate hint successfully', async () => {
      const mockHintResponse = {
        available: true,
        hint: 'Think about divide and conquer algorithms',
        hintLevel: 1,
        maxHints: 3,
        message: 'Here\'s your first hint:'
      };

      mockAssessmentEngine.generateHint.mockResolvedValue(mockHintResponse);

      const response = await request(app)
        .post('/api/assessment/hint')
        .send(validHintRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          available: true,
          hint: 'Think about divide and conquer algorithms',
          hintLevel: 1,
          maxHints: 3,
          message: 'Here\'s your first hint:',
          hasMoreHints: true
        }
      });

      expect(mockAssessmentEngine.generateHint).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        0
      );
    });

    test('should handle hints not available', async () => {
      const mockHintResponse = {
        available: false,
        message: 'Maximum hints reached for this question'
      };

      mockAssessmentEngine.generateHint.mockResolvedValue(mockHintResponse);

      const response = await request(app)
        .post('/api/assessment/hint')
        .send({ ...validHintRequest, hintLevel: 3 })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          available: false,
          message: 'Maximum hints reached for this question',
          hintLevel: 3,
          maxHints: 3
        }
      });
    });

    test('should validate required fields', async () => {
      const invalidRequest = {
        questionId: '507f1f77bcf86cd799439011'
        // Missing learnerId
      };

      const response = await request(app)
        .post('/api/assessment/hint')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error',
        details: expect.arrayContaining([
          expect.stringContaining('learnerId')
        ])
      });
    });

    test('should validate hintLevel is non-negative integer', async () => {
      const invalidRequest = {
        ...validHintRequest,
        hintLevel: -1
      };

      const response = await request(app)
        .post('/api/assessment/hint')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error',
        details: expect.arrayContaining([
          expect.stringContaining('hintLevel')
        ])
      });
    });

    test('should set default hintLevel to 0', async () => {
      const requestWithoutHintLevel = {
        questionId: '507f1f77bcf86cd799439011',
        learnerId: '507f1f77bcf86cd799439012'
      };

      const mockHintResponse = {
        available: true,
        hint: 'First hint',
        hintLevel: 1,
        maxHints: 3,
        message: 'Here\'s your first hint:'
      };

      mockAssessmentEngine.generateHint.mockResolvedValue(mockHintResponse);

      const response = await request(app)
        .post('/api/assessment/hint')
        .send(requestWithoutHintLevel)
        .expect(200);

      expect(mockAssessmentEngine.generateHint).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        0
      );
    });

    test('should handle question not found error', async () => {
      mockAssessmentEngine.generateHint.mockRejectedValue(
        new Error('Question not found')
      );

      const response = await request(app)
        .post('/api/assessment/hint')
        .send(validHintRequest)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Question not found',
        error: 'QUESTION_NOT_FOUND'
      });
    });

    test('should handle learner not found error', async () => {
      mockAssessmentEngine.generateHint.mockRejectedValue(
        new Error('Learner not found')
      );

      const response = await request(app)
        .post('/api/assessment/hint')
        .send(validHintRequest)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Learner not found',
        error: 'LEARNER_NOT_FOUND'
      });
    });

    test('should handle internal server errors', async () => {
      mockAssessmentEngine.generateHint.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/assessment/hint')
        .send(validHintRequest)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Failed to generate hint',
        error: 'INTERNAL_SERVER_ERROR'
      });
    });

    test('should calculate hasMoreHints correctly', async () => {
      const mockHintResponse = {
        available: true,
        hint: 'Final hint',
        hintLevel: 3,
        maxHints: 3,
        message: 'Here\'s your final hint:'
      };

      mockAssessmentEngine.generateHint.mockResolvedValue(mockHintResponse);

      const response = await request(app)
        .post('/api/assessment/hint')
        .send({ ...validHintRequest, hintLevel: 2 })
        .expect(200);

      expect(response.body.data.hasMoreHints).toBe(false);
    });
  });

  describe('Error handling edge cases', () => {
    test('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/assessment/submit')
        .send('{"invalid": json}')
        .type('application/json')
        .expect(400);

      // Express will handle malformed JSON and return a 400 error
      expect(response.status).toBe(400);
    });

    test('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/assessment/submit')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error'
      });
    });

    test('should handle very large request body', async () => {
      const largeMetadata = {
        data: 'x'.repeat(1000000) // 1MB of data
      };

      const response = await request(app)
        .post('/api/assessment/submit')
        .send({
          questionId: '507f1f77bcf86cd799439011',
          learnerId: '507f1f77bcf86cd799439012',
          selectedAnswer: 'O(log n)',
          timeSpent: 45,
          sessionId: 'session-123',
          metadata: largeMetadata
        });

      // Should either succeed or fail gracefully depending on body size limits
      expect([200, 413]).toContain(response.status);
    });
  });
});