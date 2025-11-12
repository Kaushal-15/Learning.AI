/**
 * Unit tests for PersonalizedQuestionSetService
 * Tests personalized set generation and category targeting functionality
 */

const mongoose = require('mongoose');
const PersonalizedQuestionSetService = require('../../services/PersonalizedQuestionSetService');
const Learner = require('../../models/Learner');
const Question = require('../../models/Question');
const Performance = require('../../models/Performance');
const SpacedRepetition = require('../../models/SpacedRepetition');

// Mock the models
jest.mock('../../models/Learner');
jest.mock('../../models/Question');
jest.mock('../../models/Performance');
jest.mock('../../models/SpacedRepetition');

describe('PersonalizedQuestionSetService', () => {
  let service;
  let mockLearnerId;
  let mockLearner;
  let mockQuestions;
  let mockPerformances;

  beforeEach(() => {
    service = new PersonalizedQuestionSetService();
    mockLearnerId = new mongoose.Types.ObjectId();
    
    // Mock learner data
    mockLearner = {
      _id: mockLearnerId,
      email: 'test@example.com',
      name: 'Test Learner',
      categoryMastery: new Map([
        ['programming', {
          level: 45, // Weak area
          confidence: 0.6,
          questionsAnswered: 15,
          averageAccuracy: 0.5,
          lastAssessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }],
        ['mathematics', {
          level: 85, // Strong area
          confidence: 0.9,
          questionsAnswered: 30,
          averageAccuracy: 0.88,
          lastAssessed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
        }],
        ['data-science', {
          level: 65, // Moderate area
          confidence: 0.7,
          questionsAnswered: 20,
          averageAccuracy: 0.7,
          lastAssessed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }]
      ]),
      difficultyPreference: 5,
      learningVelocity: 1.2,
      totalQuestionsAnswered: 65,
      overallAccuracy: 0.72,
      currentStreak: 3,
      lastActive: new Date()
    };

    // Mock questions
    mockQuestions = [
      {
        _id: new mongoose.Types.ObjectId(),
        content: 'What is a binary search tree?',
        category: ['programming', 'data-structures'],
        difficulty: 4,
        timesUsed: 5
      },
      {
        _id: new mongoose.Types.ObjectId(),
        content: 'Calculate the derivative of x²',
        category: ['mathematics', 'calculus'],
        difficulty: 5,
        timesUsed: 3
      },
      {
        _id: new mongoose.Types.ObjectId(),
        content: 'What is overfitting in machine learning?',
        category: ['data-science', 'machine-learning'],
        difficulty: 6,
        timesUsed: 2
      }
    ];

    // Mock recent performance data
    mockPerformances = [
      {
        learnerId: mockLearnerId,
        category: ['programming'],
        correct: false,
        timeSpent: 120,
        hintsUsed: 2,
        difficulty: 4,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      },
      {
        learnerId: mockLearnerId,
        category: ['programming'],
        correct: false,
        timeSpent: 90,
        hintsUsed: 1,
        difficulty: 3,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        learnerId: mockLearnerId,
        category: ['mathematics'],
        correct: true,
        timeSpent: 45,
        hintsUsed: 0,
        difficulty: 5,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
      }
    ];

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('generatePersonalizedSet', () => {
    beforeEach(() => {
      Learner.findById.mockResolvedValue(mockLearner);
      Performance.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockPerformances)
          })
        })
      });
      Performance.aggregate.mockResolvedValue([]);
      Question.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockQuestions)
        })
      });
      SpacedRepetition.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });
    });

    it('should generate a personalized question set with default parameters', async () => {
      const result = await service.generatePersonalizedSet(mockLearnerId);

      expect(result).toHaveProperty('questions');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('learnerId', mockLearnerId);
      expect(result.metadata).toHaveProperty('distribution');
      expect(result.metadata).toHaveProperty('learnerAnalysis');
      expect(result.questions).toBeInstanceOf(Array);
    });

    it('should respect custom set size', async () => {
      const customSetSize = 15;
      const result = await service.generatePersonalizedSet(mockLearnerId, { 
        setSize: customSetSize 
      });

      expect(result.metadata.setSize).toBeLessThanOrEqual(customSetSize);
      expect(result.metadata.distribution.total).toBe(customSetSize);
    });

    it('should enforce minimum and maximum set sizes', async () => {
      // Test minimum
      const tooSmall = await service.generatePersonalizedSet(mockLearnerId, { 
        setSize: 2 
      });
      expect(tooSmall.metadata.distribution.total).toBe(service.config.MIN_SET_SIZE);

      // Test maximum
      const tooLarge = await service.generatePersonalizedSet(mockLearnerId, { 
        setSize: 100 
      });
      expect(tooLarge.metadata.distribution.total).toBe(service.config.MAX_SET_SIZE);
    });

    it('should exclude specified question IDs', async () => {
      const excludeIds = [mockQuestions[0]._id.toString()];
      
      Question.find.mockImplementation((query) => {
        let filteredQuestions = mockQuestions;
        if (query._id && query._id.$nin) {
          filteredQuestions = mockQuestions.filter(q => !query._id.$nin.includes(q._id.toString()));
        }
        return {
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(filteredQuestions)
          })
        };
      });

      const result = await service.generatePersonalizedSet(mockLearnerId, { 
        excludeQuestionIds: excludeIds 
      });

      const questionIds = result.questions.map(q => q._id.toString());
      expect(questionIds).not.toContain(excludeIds[0]);
    });

    it('should handle learner not found error', async () => {
      Learner.findById.mockResolvedValue(null);

      await expect(service.generatePersonalizedSet('invalid-id'))
        .rejects.toThrow('Learner not found');
    });

    it('should include session ID in metadata when provided', async () => {
      const sessionId = 'test-session-123';
      const result = await service.generatePersonalizedSet(mockLearnerId, { 
        sessionId 
      });

      expect(result.metadata.sessionId).toBe(sessionId);
    });
  });

  describe('analyzeLearnerProfile', () => {
    beforeEach(() => {
      Performance.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockPerformances)
          })
        })
      });
      Performance.aggregate.mockResolvedValue([]);
    });

    it('should identify weak areas correctly', async () => {
      const analysis = await service.analyzeLearnerProfile(mockLearnerId);

      expect(analysis.weakAreas).toBeInstanceOf(Array);
      expect(analysis.weakAreas.length).toBeGreaterThan(0);
      
      // Programming should be identified as weak (level 45 < 60)
      const programmingWeak = analysis.weakAreas.find(w => w.category === 'programming');
      expect(programmingWeak).toBeDefined();
      expect(programmingWeak.masteryLevel).toBe(45);
    });

    it('should identify strong areas correctly', async () => {
      const analysis = await service.analyzeLearnerProfile(mockLearnerId);

      expect(analysis.strongAreas).toBeInstanceOf(Array);
      
      // Mathematics should be identified as strong (level 85 >= 80)
      const mathematicsStrong = analysis.strongAreas.find(s => s.category === 'mathematics');
      expect(mathematicsStrong).toBeDefined();
      expect(mathematicsStrong.masteryLevel).toBe(85);
    });

    it('should calculate recommended difficulty based on performance', async () => {
      const analysis = await service.analyzeLearnerProfile(mockLearnerId);

      expect(analysis.recommendedDifficulty).toBeGreaterThanOrEqual(1);
      expect(analysis.recommendedDifficulty).toBeLessThanOrEqual(10);
    });

    it('should respect focus categories when provided', async () => {
      const focusCategories = ['programming'];
      const analysis = await service.analyzeLearnerProfile(mockLearnerId, focusCategories);

      // Should only analyze the focused categories
      expect(Object.keys(analysis.categoryAnalysis)).toEqual(['programming']);
    });
  });

  describe('calculateQuestionDistribution', () => {
    let mockAnalysis;

    beforeEach(() => {
      mockAnalysis = {
        weakAreas: [
          { category: 'programming', priority: 80 },
          { category: 'algorithms', priority: 70 }
        ],
        strongAreas: [
          { category: 'mathematics', masteryLevel: 85 }
        ],
        totalQuestionsAnswered: 65
      };
    });

    it('should calculate proper distribution for experienced learner', () => {
      const distribution = service.calculateQuestionDistribution(10, mockAnalysis, true);

      expect(distribution.total).toBe(10);
      expect(distribution.weakAreas).toBeGreaterThan(0);
      expect(distribution.reviews).toBeGreaterThan(0);
      expect(distribution.newContent).toBeGreaterThan(0);
      expect(distribution.weakAreas + distribution.reviews + distribution.newContent).toBe(10);
    });

    it('should adjust distribution for new learners', () => {
      const newLearnerAnalysis = { ...mockAnalysis, totalQuestionsAnswered: 5 };
      const distribution = service.calculateQuestionDistribution(10, newLearnerAnalysis, true);

      // New learners should get more new content
      expect(distribution.newContent).toBeGreaterThan(distribution.weakAreas);
    });

    it('should adjust distribution when reviews are disabled', () => {
      const distribution = service.calculateQuestionDistribution(10, mockAnalysis, false);

      expect(distribution.reviews).toBe(0);
      expect(distribution.weakAreas + distribution.newContent).toBe(10);
    });

    it('should increase weak area focus when many weak areas exist', () => {
      const manyWeakAreasAnalysis = {
        ...mockAnalysis,
        weakAreas: [
          { category: 'programming', priority: 80 },
          { category: 'algorithms', priority: 75 },
          { category: 'data-structures', priority: 70 },
          { category: 'databases', priority: 65 }
        ]
      };

      const distribution = service.calculateQuestionDistribution(10, manyWeakAreasAnalysis, true);

      // Should allocate more questions to weak areas
      expect(distribution.weakAreas).toBeGreaterThanOrEqual(7);
    });
  });

  describe('identifyWeakAreas', () => {
    let mockCategoryAnalysis;

    beforeEach(() => {
      mockCategoryAnalysis = {
        'programming': {
          level: 45,
          confidence: 0.6,
          questionsAnswered: 15,
          lastAssessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          needsAttention: true,
          isStrong: false
        },
        'mathematics': {
          level: 85,
          confidence: 0.9,
          questionsAnswered: 30,
          lastAssessed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          needsAttention: false,
          isStrong: true
        }
      };
    });

    it('should identify weak areas from category mastery', () => {
      const weakAreas = service.identifyWeakAreas(mockCategoryAnalysis, mockPerformances);

      expect(weakAreas).toBeInstanceOf(Array);
      expect(weakAreas.length).toBeGreaterThan(0);
      
      const programmingWeak = weakAreas.find(w => w.category === 'programming');
      expect(programmingWeak).toBeDefined();
      expect(programmingWeak.masteryLevel).toBe(45);
      expect(programmingWeak.reason).toContain('Low mastery level');
    });

    it('should calculate priority scores correctly', () => {
      const weakAreas = service.identifyWeakAreas(mockCategoryAnalysis, mockPerformances);

      expect(weakAreas[0]).toHaveProperty('priority');
      expect(weakAreas[0].priority).toBeGreaterThan(0);
      expect(weakAreas[0].priority).toBeLessThanOrEqual(100);
    });

    it('should sort weak areas by priority', () => {
      const weakAreas = service.identifyWeakAreas(mockCategoryAnalysis, mockPerformances);

      for (let i = 1; i < weakAreas.length; i++) {
        expect(weakAreas[i-1].priority).toBeGreaterThanOrEqual(weakAreas[i].priority);
      }
    });

    it('should identify weak areas from recent poor performance', () => {
      const poorPerformances = [
        ...mockPerformances,
        {
          category: ['new-topic'],
          correct: false,
          timeSpent: 150,
          createdAt: new Date()
        },
        {
          category: ['new-topic'],
          correct: false,
          timeSpent: 140,
          createdAt: new Date()
        },
        {
          category: ['new-topic'],
          correct: false,
          timeSpent: 130,
          createdAt: new Date()
        }
      ];

      const weakAreas = service.identifyWeakAreas({}, poorPerformances);

      const newTopicWeak = weakAreas.find(w => w.category === 'new-topic');
      expect(newTopicWeak).toBeDefined();
      expect(newTopicWeak.reason).toContain('Recent poor performance');
    });
  });

  describe('getWeakAreaQuestions', () => {
    beforeEach(() => {
      Question.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockQuestions.slice(0, 2))
        })
      });
    });

    it('should return questions for weak areas', async () => {
      const weakAreas = [
        { category: 'programming', masteryLevel: 45 },
        { category: 'algorithms', masteryLevel: 50 }
      ];

      const questions = await service.getWeakAreaQuestions(
        weakAreas, 
        4, 
        mockLearner, 
        [], 
        null
      );

      expect(questions).toBeInstanceOf(Array);
      expect(questions.length).toBeGreaterThan(0);
      expect(Question.find).toHaveBeenCalled();
    });

    it('should respect question count limit', async () => {
      const weakAreas = [{ category: 'programming', masteryLevel: 45 }];
      const requestedCount = 3;

      const questions = await service.getWeakAreaQuestions(
        weakAreas, 
        requestedCount, 
        mockLearner, 
        [], 
        null
      );

      expect(questions.length).toBeLessThanOrEqual(requestedCount);
    });

    it('should return empty array when no weak areas provided', async () => {
      const questions = await service.getWeakAreaQuestions([], 5, mockLearner, [], null);

      expect(questions).toEqual([]);
    });

    it('should use difficulty override when provided', async () => {
      const weakAreas = [{ category: 'programming', masteryLevel: 45 }];
      const difficultyOverride = 8;

      await service.getWeakAreaQuestions(
        weakAreas, 
        3, 
        mockLearner, 
        [], 
        difficultyOverride
      );

      expect(Question.find).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: expect.objectContaining({
            $gte: expect.any(Number),
            $lte: expect.any(Number)
          })
        })
      );
    });
  });

  describe('getReviewQuestions', () => {
    beforeEach(() => {
      const mockSpacedRepetitions = [
        {
          questionId: mockQuestions[0],
          nextReviewDate: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago (due)
        },
        {
          questionId: mockQuestions[1],
          nextReviewDate: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now (due soon)
        }
      ];

      SpacedRepetition.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockSpacedRepetitions)
          })
        })
      });
    });

    it('should return due review questions', async () => {
      const reviewQuestions = await service.getReviewQuestions(mockLearnerId, 5, []);

      expect(reviewQuestions).toBeInstanceOf(Array);
      expect(reviewQuestions.length).toBeGreaterThan(0);
      expect(SpacedRepetition.find).toHaveBeenCalledWith(
        expect.objectContaining({
          learnerId: mockLearnerId,
          nextReviewDate: expect.objectContaining({
            $lte: expect.any(Date)
          })
        })
      );
    });

    it('should respect the requested count limit', async () => {
      const requestedCount = 1;
      const reviewQuestions = await service.getReviewQuestions(mockLearnerId, requestedCount, []);

      expect(reviewQuestions.length).toBeLessThanOrEqual(requestedCount);
    });

    it('should exclude specified question IDs', async () => {
      const excludeIds = [mockQuestions[0]._id.toString()];
      const reviewQuestions = await service.getReviewQuestions(mockLearnerId, 5, excludeIds);

      const questionIds = reviewQuestions.map(q => q._id.toString());
      expect(questionIds).not.toContain(excludeIds[0]);
    });
  });

  describe('calculateTargetDifficulty', () => {
    it('should return learner preference for unknown category', () => {
      const difficulty = service.calculateTargetDifficulty(mockLearner, 'unknown-category');
      expect(difficulty).toBe(mockLearner.difficultyPreference);
    });

    it('should decrease difficulty for weak categories', () => {
      // Mock a weak category
      const weakLearner = {
        ...mockLearner,
        categoryMastery: new Map([
          ['weak-category', { level: 25 }]
        ])
      };

      const difficulty = service.calculateTargetDifficulty(weakLearner, 'weak-category');
      expect(difficulty).toBeLessThan(weakLearner.difficultyPreference);
    });

    it('should increase difficulty for strong categories', () => {
      // Mock a strong category
      const strongLearner = {
        ...mockLearner,
        categoryMastery: new Map([
          ['strong-category', { level: 85 }]
        ])
      };

      const difficulty = service.calculateTargetDifficulty(strongLearner, 'strong-category');
      expect(difficulty).toBeGreaterThan(strongLearner.difficultyPreference);
    });

    it('should maintain bounds (1-10)', () => {
      const extremeLearner = {
        difficultyPreference: 1,
        categoryMastery: new Map([
          ['weak-category', { level: 10 }]
        ])
      };

      const difficulty = service.calculateTargetDifficulty(extremeLearner, 'weak-category');
      expect(difficulty).toBeGreaterThanOrEqual(1);
      expect(difficulty).toBeLessThanOrEqual(10);
    });
  });

  describe('shuffleQuestions', () => {
    it('should return array of same length', () => {
      const shuffled = service.shuffleQuestions(mockQuestions);
      expect(shuffled.length).toBe(mockQuestions.length);
    });

    it('should contain all original questions', () => {
      const shuffled = service.shuffleQuestions(mockQuestions);
      
      for (const question of mockQuestions) {
        expect(shuffled).toContain(question);
      }
    });

    it('should not modify original array', () => {
      const original = [...mockQuestions];
      service.shuffleQuestions(mockQuestions);
      expect(mockQuestions).toEqual(original);
    });
  });

  describe('categorizeExperienceLevel', () => {
    it('should categorize beginner correctly', () => {
      expect(service.categorizeExperienceLevel(5)).toBe('beginner');
    });

    it('should categorize novice correctly', () => {
      expect(service.categorizeExperienceLevel(25)).toBe('novice');
    });

    it('should categorize intermediate correctly', () => {
      expect(service.categorizeExperienceLevel(100)).toBe('intermediate');
    });

    it('should categorize advanced correctly', () => {
      expect(service.categorizeExperienceLevel(300)).toBe('advanced');
    });

    it('should categorize expert correctly', () => {
      expect(service.categorizeExperienceLevel(600)).toBe('expert');
    });
  });

  describe('analyzeTimePatterns', () => {
    it('should analyze hourly performance patterns', () => {
      const performances = [
        { createdAt: new Date('2023-01-01T09:00:00Z'), correct: true },
        { createdAt: new Date('2023-01-01T09:30:00Z'), correct: true },
        { createdAt: new Date('2023-01-01T14:00:00Z'), correct: false },
        { createdAt: new Date('2023-01-01T14:30:00Z'), correct: false },
        { createdAt: new Date('2023-01-01T14:45:00Z'), correct: false }
      ];

      const patterns = service.analyzeTimePatterns(performances);

      expect(patterns).toHaveProperty('bestHour');
      expect(patterns).toHaveProperty('worstHour');
      expect(patterns).toHaveProperty('bestAccuracy');
      expect(patterns).toHaveProperty('worstAccuracy');
      expect(patterns).toHaveProperty('hourlyData');
    });

    it('should handle empty performance data', () => {
      const patterns = service.analyzeTimePatterns([]);

      expect(patterns.bestHour).toBeNull();
      expect(patterns.worstHour).toBeNull();
      expect(patterns.hourlyData).toEqual({});
    });
  });

  describe('analyzeDifficultyPatterns', () => {
    it('should analyze accuracy by difficulty level', () => {
      const performances = [
        { difficulty: 3, correct: true },
        { difficulty: 3, correct: true },
        { difficulty: 5, correct: false },
        { difficulty: 5, correct: true },
        { difficulty: 7, correct: false }
      ];

      const patterns = service.analyzeDifficultyPatterns(performances);

      expect(patterns).toHaveProperty('accuracyByDifficulty');
      expect(patterns).toHaveProperty('difficultyData');
      expect(patterns.accuracyByDifficulty['3']).toBe(1); // 100% accuracy at difficulty 3
      expect(patterns.accuracyByDifficulty['5']).toBe(0.5); // 50% accuracy at difficulty 5
    });
  });

  describe('analyzeHintPatterns', () => {
    it('should calculate hint usage statistics', () => {
      const performances = [
        { hintsUsed: 0, correct: true },
        { hintsUsed: 1, correct: true },
        { hintsUsed: 2, correct: false },
        { hintsUsed: 3, correct: false }
      ];

      const patterns = service.analyzeHintPatterns(performances);

      expect(patterns).toHaveProperty('averageHints');
      expect(patterns).toHaveProperty('totalHints');
      expect(patterns).toHaveProperty('hintsByCorrectness');
      expect(patterns.averageHints).toBe(1.5);
      expect(patterns.totalHints).toBe(6);
    });

    it('should handle empty performance data', () => {
      const patterns = service.analyzeHintPatterns([]);

      expect(patterns.averageHints).toBe(0);
      expect(patterns.totalHints).toBe(0);
    });
  });
});