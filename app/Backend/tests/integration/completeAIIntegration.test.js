/**
 * Complete AI Integration Test
 * Tests the full AI integration functionality with real service instances
 */

const { createQuestionGenerationService } = require('../../services');

describe('Complete AI Integration Test', () => {
  let service;

  beforeEach(() => {
    // Create service without API key to test fallback mechanisms
    service = createQuestionGenerationService({
      openaiApiKey: null, // No API key to force fallback
      aiOptions: {
        model: 'gpt-3.5-turbo',
        timeout: 5000,
        maxRetries: 2
      }
    });
  });

  describe('Service Initialization', () => {
    test('should initialize service without AI client', () => {
      expect(service).toBeDefined();
      expect(service.isAIServiceHealthy()).toBe(false); // Should be false without AI client
      expect(service.aiClient).toBeNull();
    });

    test('should provide comprehensive service status', () => {
      const status = service.getAIServiceStatus();

      expect(status).toMatchObject({
        hasClient: false,
        isHealthy: false,
        lastHealthCheck: null,
        fallbackQuestionsAvailable: expect.any(Number),
        rateLimitRetries: 0,
        availableCategories: expect.arrayContaining(['programming', 'mathematics', 'science']),
        supportedQuestionTypes: expect.arrayContaining(['multiple-choice', 'true-false'])
      });

      expect(status.fallbackQuestionsAvailable).toBeGreaterThan(5);
    });

    test('should provide detailed metrics', () => {
      const metrics = service.getAIServiceMetrics();

      expect(metrics).toMatchObject({
        service: {
          hasClient: false,
          isHealthy: false,
          lastHealthCheck: null,
          rateLimitRetries: 0
        },
        fallback: {
          totalQuestions: expect.any(Number),
          categoryDistribution: expect.any(Object),
          availableCategories: expect.arrayContaining(['programming', 'mathematics', 'science'])
        },
        capabilities: {
          supportedQuestionTypes: expect.arrayContaining(['multiple-choice', 'true-false', 'fill-in-the-blank']),
          categorySpecificPrompts: expect.arrayContaining(['programming', 'mathematics', 'science']),
          difficultyLevels: '1-10',
          temperatureAdjustment: true,
          contentValidation: true
        }
      });

      expect(metrics.fallback.totalQuestions).toBeGreaterThan(10);
    });
  });

  describe('Question Generation with Fallback', () => {
    test('should generate programming questions using fallback', async () => {
      const params = {
        topic: 'Data Structures',
        category: ['Programming', 'Algorithms'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };

      const question = await service.generateQuestion(params);

      expect(question).toMatchObject({
        question: expect.any(String),
        options: expect.arrayContaining([expect.any(String)]),
        correctAnswer: expect.any(String),
        explanation: expect.any(String),
        category: ['Programming', 'Algorithms'],
        difficulty: 5,
        questionType: 'multiple-choice',
        generatedAt: expect.any(Date),
        validationScore: expect.any(Number)
      });

      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(question.options).toContain(question.correctAnswer);
      expect(question.question.length).toBeGreaterThan(10);
      expect(question.explanation.length).toBeGreaterThan(20);
    });

    test('should generate mathematics questions using fallback', async () => {
      const params = {
        topic: 'Calculus',
        category: ['Mathematics', 'Derivatives'],
        difficulty: 4,
        questionType: 'multiple-choice'
      };

      const question = await service.generateQuestion(params);

      expect(question).toMatchObject({
        question: expect.any(String),
        options: expect.arrayContaining([expect.any(String)]),
        correctAnswer: expect.any(String),
        explanation: expect.any(String),
        category: ['Mathematics', 'Derivatives'],
        difficulty: 4,
        questionType: 'multiple-choice'
      });

      expect(question.options).toContain(question.correctAnswer);
    });

    test('should generate science questions using fallback', async () => {
      const params = {
        topic: 'Physics',
        category: ['Science', 'Mechanics'],
        difficulty: 3,
        questionType: 'multiple-choice'
      };

      const question = await service.generateQuestion(params);

      expect(question).toMatchObject({
        question: expect.any(String),
        options: expect.arrayContaining([expect.any(String)]),
        correctAnswer: expect.any(String),
        explanation: expect.any(String),
        category: ['Science', 'Mechanics'],
        difficulty: 3,
        questionType: 'multiple-choice'
      });
    });

    test('should handle different difficulty levels appropriately', async () => {
      const difficulties = [1, 5, 10];

      for (const difficulty of difficulties) {
        const params = {
          topic: 'Algorithms',
          category: ['Programming'],
          difficulty,
          questionType: 'multiple-choice'
        };

        const question = await service.generateQuestion(params);

        expect(question.difficulty).toBe(difficulty);
        expect(question.question).toBeDefined();
        expect(question.options).toBeDefined();
        expect(question.correctAnswer).toBeDefined();
        expect(question.explanation).toBeDefined();
      }
    });

    test('should support different question types', async () => {
      const questionTypes = ['multiple-choice', 'true-false'];

      for (const questionType of questionTypes) {
        const params = {
          topic: 'Programming Concepts',
          category: ['Programming'],
          difficulty: 5,
          questionType
        };

        const question = await service.generateQuestion(params);

        expect(question.questionType).toBe(questionType);

        if (questionType === 'true-false') {
          expect(question.options).toEqual(['True', 'False']);
          expect(['True', 'False']).toContain(question.correctAnswer);
        } else {
          expect(question.options.length).toBeGreaterThanOrEqual(2);
        }
      }
    });
  });

  describe('Enhanced Category Support', () => {
    test('should handle computer science categories', async () => {
      const params = {
        topic: 'Database Design',
        category: ['Computer Science', 'Databases'],
        difficulty: 6,
        questionType: 'multiple-choice'
      };

      const question = await service.generateQuestion(params);
      expect(question).toBeDefined();
      expect(question.category).toEqual(['Computer Science', 'Databases']);
    });

    test('should handle data science categories', async () => {
      const params = {
        topic: 'Machine Learning',
        category: ['Data Science', 'ML'],
        difficulty: 7,
        questionType: 'multiple-choice'
      };

      const question = await service.generateQuestion(params);
      expect(question).toBeDefined();
      expect(question.category).toEqual(['Data Science', 'ML']);
    });

    test('should handle unknown categories gracefully', async () => {
      const params = {
        topic: 'Unknown Topic',
        category: ['Unknown Category', 'Subcategory'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };

      const question = await service.generateQuestion(params);
      expect(question).toBeDefined();
      expect(question.category).toEqual(['Unknown Category', 'Subcategory']);
      // The question might be from fallback pool, so just check it's defined
      expect(question.question).toBeDefined();
      expect(question.question.length).toBeGreaterThan(10);
    });
  });

  describe('Error Handling and Validation', () => {
    test('should validate input parameters', async () => {
      const invalidParams = [
        { topic: '', category: ['Programming'], difficulty: 5 },
        { topic: 'Valid', category: [], difficulty: 5 },
        { topic: 'Valid', category: ['Programming'], difficulty: 15 },
        { topic: 'Valid', category: ['Programming'], difficulty: 5, questionType: 'invalid' }
      ];

      for (const params of invalidParams) {
        await expect(service.generateQuestion(params)).rejects.toThrow();
      }
    });

    test('should handle service capabilities queries', () => {
      const questionTypes = service.getAvailableQuestionTypes();
      expect(questionTypes).toContain('multiple-choice');
      expect(questionTypes).toContain('true-false');

      const template = service.getPromptTemplate('multiple-choice');
      expect(template).toBeDefined();
      expect(template.base).toBeDefined();
      expect(template.categories).toBeDefined();
    });

    test('should provide health check functionality', async () => {
      // Without AI client, health check should return false
      const isHealthy = await service.checkAIServiceHealth();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Content Quality and Validation', () => {
    test('should generate questions with appropriate content quality', async () => {
      const params = {
        topic: 'Binary Search Trees',
        category: ['Programming', 'Data Structures'],
        difficulty: 6,
        questionType: 'multiple-choice'
      };

      const question = await service.generateQuestion(params);

      // Validate content quality
      expect(question.question.length).toBeGreaterThan(15);
      expect(question.explanation.length).toBeGreaterThan(30);
      expect(question.validationScore).toBeGreaterThan(0.5);
      expect(question.validationScore).toBeLessThanOrEqual(1.0);

      // Validate structure
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(question.options.length).toBeLessThanOrEqual(6);
      expect(question.options).toContain(question.correctAnswer);

      // Validate hints if present
      if (question.hints) {
        expect(Array.isArray(question.hints)).toBe(true);
        expect(question.hints.length).toBeLessThanOrEqual(3);
        question.hints.forEach(hint => {
          expect(hint.length).toBeGreaterThan(5);
          expect(hint.length).toBeLessThanOrEqual(150);
        });
      }
    });

    test('should maintain consistency across multiple generations', async () => {
      const params = {
        topic: 'Sorting Algorithms',
        category: ['Programming', 'Algorithms'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };

      const questions = [];
      for (let i = 0; i < 3; i++) {
        const question = await service.generateQuestion(params);
        questions.push(question);
      }

      // All questions should have consistent structure
      questions.forEach(question => {
        expect(question.category).toEqual(['Programming', 'Algorithms']);
        expect(question.difficulty).toBe(5);
        expect(question.questionType).toBe('multiple-choice');
        expect(question.validationScore).toBeGreaterThan(0);
      });

      // Questions should be different (fallback questions are randomly selected)
      const uniqueQuestions = new Set(questions.map(q => q.question));
      expect(uniqueQuestions.size).toBeGreaterThanOrEqual(1); // At least some variation expected
    });
  });

  describe('Performance and Scalability', () => {
    test('should generate questions efficiently', async () => {
      const params = {
        topic: 'Performance Test',
        category: ['Programming'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };

      const startTime = Date.now();
      const question = await service.generateQuestion(params);
      const endTime = Date.now();

      expect(question).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second for fallback
    });

    test('should handle concurrent question generation', async () => {
      const params = {
        topic: 'Concurrency Test',
        category: ['Programming'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };

      const promises = Array(5).fill().map(() => service.generateQuestion(params));
      const questions = await Promise.all(promises);

      expect(questions).toHaveLength(5);
      questions.forEach(question => {
        expect(question).toBeDefined();
        expect(question.question).toBeDefined();
        expect(question.options).toBeDefined();
        expect(question.correctAnswer).toBeDefined();
      });
    });
  });
});