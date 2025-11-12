const AdaptiveDifficultyEngine = require('../../services/AdaptiveDifficultyEngine');
const Performance = require('../../models/Performance');
const Learner = require('../../models/Learner');
const mongoose = require('mongoose');

// Mock the models
jest.mock('../../models/Performance');
jest.mock('../../models/Learner');

describe('AdaptiveDifficultyEngine', () => {
  let engine;
  let mockLearnerId;
  let mockLearner;

  beforeEach(() => {
    engine = new AdaptiveDifficultyEngine();
    mockLearnerId = new mongoose.Types.ObjectId().toString();
    
    // Mock learner data
    mockLearner = {
      _id: mockLearnerId,
      email: 'test@example.com',
      name: 'Test Learner',
      difficultyPreference: 5,
      learningVelocity: 1.0,
      categoryMastery: new Map([
        ['Mathematics', {
          level: 70,
          confidence: 0.8,
          questionsAnswered: 20,
          averageAccuracy: 0.75
        }]
      ])
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('calculateNextDifficulty', () => {
    it('should increase difficulty for high accuracy performance', async () => {
      // Mock high accuracy performance data
      const mockPerformances = [
        { correct: true, timeSpent: 25, hintsUsed: 0, createdAt: new Date() },
        { correct: true, timeSpent: 30, hintsUsed: 0, createdAt: new Date() },
        { correct: true, timeSpent: 28, hintsUsed: 1, createdAt: new Date() },
        { correct: true, timeSpent: 22, hintsUsed: 0, createdAt: new Date() },
        { correct: true, timeSpent: 35, hintsUsed: 0, createdAt: new Date() }
      ];

      Learner.findById.mockResolvedValue(mockLearner);
      Performance.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPerformances)
      });

      const result = await engine.calculateNextDifficulty(mockLearnerId, 'Mathematics', 5);

      expect(result.newDifficulty).toBeGreaterThan(5);
      expect(result.adjustment).toBeGreaterThan(0);
      expect(result.reasoning).toContain('High accuracy');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should decrease difficulty for low accuracy performance', async () => {
      // Mock low accuracy performance data
      const mockPerformances = [
        { correct: false, timeSpent: 120, hintsUsed: 3, createdAt: new Date() },
        { correct: false, timeSpent: 150, hintsUsed: 2, createdAt: new Date() },
        { correct: true, timeSpent: 90, hintsUsed: 1, createdAt: new Date() },
        { correct: false, timeSpent: 180, hintsUsed: 4, createdAt: new Date() },
        { correct: false, timeSpent: 200, hintsUsed: 3, createdAt: new Date() }
      ];

      Learner.findById.mockResolvedValue(mockLearner);
      Performance.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPerformances)
      });

      const result = await engine.calculateNextDifficulty(mockLearnerId, 'Mathematics', 5);

      expect(result.newDifficulty).toBeLessThan(5);
      expect(result.adjustment).toBeLessThan(0);
      expect(result.reasoning).toContain('Low accuracy');
    });

    it('should maintain difficulty for moderate performance', async () => {
      // Mock moderate performance data
      const mockPerformances = [
        { correct: true, timeSpent: 60, hintsUsed: 1, createdAt: new Date() },
        { correct: false, timeSpent: 70, hintsUsed: 2, createdAt: new Date() },
        { correct: true, timeSpent: 55, hintsUsed: 1, createdAt: new Date() },
        { correct: true, timeSpent: 65, hintsUsed: 0, createdAt: new Date() },
        { correct: false, timeSpent: 80, hintsUsed: 2, createdAt: new Date() }
      ];

      Learner.findById.mockResolvedValue(mockLearner);
      Performance.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPerformances)
      });

      const result = await engine.calculateNextDifficulty(mockLearnerId, 'Mathematics', 5);

      expect(Math.abs(result.adjustment)).toBeLessThanOrEqual(1);
    });

    it('should use initial difficulty for insufficient data', async () => {
      // Mock insufficient performance data
      const mockPerformances = [
        { correct: true, timeSpent: 60, hintsUsed: 1, createdAt: new Date() }
      ];

      Learner.findById.mockResolvedValue(mockLearner);
      Performance.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPerformances)
      });

      const result = await engine.calculateNextDifficulty(mockLearnerId, 'Mathematics', 5);

      expect(result.reasoning).toContain('Insufficient performance data');
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should throw error for non-existent learner', async () => {
      Learner.findById.mockResolvedValue(null);

      await expect(
        engine.calculateNextDifficulty(mockLearnerId, 'Mathematics', 5)
      ).rejects.toThrow('Learner not found');
    });

    it('should respect maximum difficulty change limits', async () => {
      // Mock extremely high performance that would normally cause large adjustment
      const mockPerformances = [
        { correct: true, timeSpent: 10, hintsUsed: 0, createdAt: new Date() },
        { correct: true, timeSpent: 8, hintsUsed: 0, createdAt: new Date() },
        { correct: true, timeSpent: 12, hintsUsed: 0, createdAt: new Date() },
        { correct: true, timeSpent: 9, hintsUsed: 0, createdAt: new Date() },
        { correct: true, timeSpent: 11, hintsUsed: 0, createdAt: new Date() }
      ];

      Learner.findById.mockResolvedValue(mockLearner);
      Performance.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPerformances)
      });

      const result = await engine.calculateNextDifficulty(mockLearnerId, 'Mathematics', 5);

      expect(Math.abs(result.adjustment)).toBeLessThanOrEqual(engine.config.MAX_DIFFICULTY_CHANGE);
    });
  });

  describe('calculatePerformanceMetrics', () => {
    it('should calculate correct accuracy', () => {
      const performances = [
        { correct: true, timeSpent: 30, hintsUsed: 0 },
        { correct: true, timeSpent: 25, hintsUsed: 1 },
        { correct: false, timeSpent: 60, hintsUsed: 2 },
        { correct: true, timeSpent: 35, hintsUsed: 0 }
      ];

      const metrics = engine.calculatePerformanceMetrics(performances);

      expect(metrics.accuracy).toBe(0.75); // 3/4 correct
      expect(metrics.totalQuestions).toBe(4);
      expect(metrics.averageTimeSpent).toBe(37.5); // (30+25+60+35)/4
      expect(metrics.averageHintsUsed).toBe(0.75); // (0+1+2+0)/4
    });

    it('should calculate positive streak correctly', () => {
      const performances = [
        { correct: true, timeSpent: 30, hintsUsed: 0 },
        { correct: true, timeSpent: 25, hintsUsed: 1 },
        { correct: true, timeSpent: 35, hintsUsed: 0 },
        { correct: false, timeSpent: 60, hintsUsed: 2 }
      ];

      const metrics = engine.calculatePerformanceMetrics(performances);

      expect(metrics.streak).toBe(3); // 3 consecutive correct from most recent
    });

    it('should calculate negative streak correctly', () => {
      const performances = [
        { correct: false, timeSpent: 60, hintsUsed: 2 },
        { correct: false, timeSpent: 80, hintsUsed: 3 },
        { correct: true, timeSpent: 30, hintsUsed: 0 },
        { correct: true, timeSpent: 25, hintsUsed: 1 }
      ];

      const metrics = engine.calculatePerformanceMetrics(performances);

      expect(metrics.streak).toBe(-2); // 2 consecutive incorrect from most recent
    });

    it('should handle empty performance array', () => {
      const metrics = engine.calculatePerformanceMetrics([]);

      expect(metrics.accuracy).toBe(0);
      expect(metrics.averageTimeSpent).toBe(0);
      expect(metrics.streak).toBe(0);
      expect(metrics.totalQuestions).toBe(0);
    });

    it('should calculate time efficiency correctly', () => {
      const fastPerformances = [
        { correct: true, timeSpent: 20, hintsUsed: 0 },
        { correct: true, timeSpent: 25, hintsUsed: 0 }
      ];

      const slowPerformances = [
        { correct: true, timeSpent: 150, hintsUsed: 0 },
        { correct: true, timeSpent: 180, hintsUsed: 0 }
      ];

      const fastMetrics = engine.calculatePerformanceMetrics(fastPerformances);
      const slowMetrics = engine.calculatePerformanceMetrics(slowPerformances);

      expect(fastMetrics.timeEfficiency).toBeGreaterThan(slowMetrics.timeEfficiency);
      expect(fastMetrics.timeEfficiency).toBeGreaterThan(0.8);
      expect(slowMetrics.timeEfficiency).toBeLessThan(0.2);
    });
  });

  describe('getCategoryMasteryInfluence', () => {
    it('should return correct mastery influence for existing category', () => {
      const influence = engine.getCategoryMasteryInfluence(mockLearner, 'Mathematics');

      expect(influence.masteryLevel).toBe(0.7); // 70/100
      expect(influence.confidence).toBe(0.8);
      expect(influence.influence).toBeGreaterThan(0);
    });

    it('should return zero influence for non-existent category', () => {
      const influence = engine.getCategoryMasteryInfluence(mockLearner, 'Physics');

      expect(influence.masteryLevel).toBe(0);
      expect(influence.confidence).toBe(0);
      expect(influence.influence).toBe(0);
    });
  });

  describe('calculateDifficultyAdjustment', () => {
    it('should increase difficulty for high performance metrics', () => {
      const performanceMetrics = {
        accuracy: 0.9,
        streak: 6,
        timeEfficiency: 0.9,
        averageHintsUsed: 0,
        consistencyScore: 0.8
      };

      const masteryInfluence = { influence: 0.1 };
      const adjustment = engine.calculateDifficultyAdjustment(
        performanceMetrics, 
        masteryInfluence, 
        1.0
      );

      expect(adjustment).toBeGreaterThan(0);
    });

    it('should decrease difficulty for low performance metrics', () => {
      const performanceMetrics = {
        accuracy: 0.3,
        streak: -4,
        timeEfficiency: 0.2,
        averageHintsUsed: 3,
        consistencyScore: 0.4
      };

      const masteryInfluence = { influence: -0.1 };
      const adjustment = engine.calculateDifficultyAdjustment(
        performanceMetrics, 
        masteryInfluence, 
        1.0
      );

      expect(adjustment).toBeLessThan(0);
    });

    it('should respect maximum adjustment bounds', () => {
      const extremePerformanceMetrics = {
        accuracy: 1.0,
        streak: 10,
        timeEfficiency: 1.0,
        averageHintsUsed: 0,
        consistencyScore: 1.0
      };

      const masteryInfluence = { influence: 0.5 };
      const adjustment = engine.calculateDifficultyAdjustment(
        extremePerformanceMetrics, 
        masteryInfluence, 
        2.0
      );

      expect(Math.abs(adjustment)).toBeLessThanOrEqual(engine.config.MAX_DIFFICULTY_CHANGE);
    });
  });

  describe('applyDifficultyAdjustment', () => {
    it('should apply positive adjustment correctly', () => {
      const newDifficulty = engine.applyDifficultyAdjustment(5, 1.5, 5);
      expect(newDifficulty).toBe(7); // 5 + round(1.5) = 7
    });

    it('should apply negative adjustment correctly', () => {
      const newDifficulty = engine.applyDifficultyAdjustment(5, -1.3, 5);
      expect(newDifficulty).toBe(4); // 5 + round(-1.3) = 4
    });

    it('should enforce minimum difficulty of 1', () => {
      const newDifficulty = engine.applyDifficultyAdjustment(2, -5, 5);
      expect(newDifficulty).toBeGreaterThanOrEqual(1);
    });

    it('should enforce maximum difficulty of 10', () => {
      const newDifficulty = engine.applyDifficultyAdjustment(8, 5, 5);
      expect(newDifficulty).toBeLessThanOrEqual(10);
    });

    it('should not deviate too far from preferred difficulty', () => {
      const preferredDifficulty = 5;
      const newDifficulty = engine.applyDifficultyAdjustment(5, 0.5, preferredDifficulty);
      
      expect(Math.abs(newDifficulty - preferredDifficulty)).toBeLessThanOrEqual(3);
    });
  });

  describe('getInitialDifficulty', () => {
    it('should adjust based on category mastery', () => {
      const result = engine.getInitialDifficulty(mockLearner, 'Mathematics', 5);
      
      expect(result.newDifficulty).toBeDefined();
      expect(result.reasoning).toContain('Insufficient performance data');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should use preference for unknown category', () => {
      const result = engine.getInitialDifficulty(mockLearner, 'UnknownCategory', 5);
      
      expect(result.newDifficulty).toBe(mockLearner.difficultyPreference);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should decrease difficulty for low mastery category', () => {
      const lowMasteryLearner = {
        ...mockLearner,
        categoryMastery: new Map([
          ['Mathematics', {
            level: 20, // Low mastery
            confidence: 0.6
          }]
        ])
      };

      const result = engine.getInitialDifficulty(lowMasteryLearner, 'Mathematics', 5);
      
      expect(result.newDifficulty).toBeLessThan(mockLearner.difficultyPreference);
    });

    it('should increase difficulty for high mastery category', () => {
      const highMasteryLearner = {
        ...mockLearner,
        categoryMastery: new Map([
          ['Mathematics', {
            level: 90, // High mastery
            confidence: 0.9
          }]
        ])
      };

      const result = engine.getInitialDifficulty(highMasteryLearner, 'Mathematics', 5);
      
      expect(result.newDifficulty).toBeGreaterThan(mockLearner.difficultyPreference);
    });
  });

  describe('calculateAdjustmentConfidence', () => {
    it('should increase confidence with more data points', () => {
      const lowDataConfidence = engine.calculateAdjustmentConfidence(3, { consistencyScore: 0.8 });
      const highDataConfidence = engine.calculateAdjustmentConfidence(10, { consistencyScore: 0.8 });
      
      expect(highDataConfidence).toBeGreaterThan(lowDataConfidence);
    });

    it('should decrease confidence for inconsistent performance', () => {
      const consistentConfidence = engine.calculateAdjustmentConfidence(5, { consistencyScore: 0.9 });
      const inconsistentConfidence = engine.calculateAdjustmentConfidence(5, { consistencyScore: 0.3 });
      
      expect(consistentConfidence).toBeGreaterThan(inconsistentConfidence);
    });

    it('should reduce confidence for extreme accuracy values', () => {
      const normalConfidence = engine.calculateAdjustmentConfidence(5, { 
        consistencyScore: 0.8, 
        accuracy: 0.7 
      });
      const extremeConfidence = engine.calculateAdjustmentConfidence(5, { 
        consistencyScore: 0.8, 
        accuracy: 1.0 
      });
      
      expect(normalConfidence).toBeGreaterThan(extremeConfidence);
    });

    it('should never return confidence below 0.1', () => {
      const confidence = engine.calculateAdjustmentConfidence(1, { 
        consistencyScore: 0, 
        accuracy: 1.0 
      });
      
      expect(confidence).toBeGreaterThanOrEqual(0.1);
    });
  });

  describe('batchCalculateDifficulty', () => {
    it('should process multiple learner-category combinations', async () => {
      const learnerCategories = [
        { learnerId: mockLearnerId, category: 'Mathematics', currentDifficulty: 5 },
        { learnerId: mockLearnerId, category: 'Physics', currentDifficulty: 4 }
      ];

      // Mock successful responses
      Learner.findById.mockResolvedValue(mockLearner);
      Performance.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { correct: true, timeSpent: 30, hintsUsed: 0, createdAt: new Date() },
          { correct: true, timeSpent: 25, hintsUsed: 1, createdAt: new Date() }
        ])
      });

      const results = await engine.batchCalculateDifficulty(learnerCategories);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].learnerId).toBe(mockLearnerId);
      expect(results[0].category).toBe('Mathematics');
    });

    it('should handle errors gracefully in batch processing', async () => {
      const learnerCategories = [
        { learnerId: 'invalid-id', category: 'Mathematics', currentDifficulty: 5 }
      ];

      Learner.findById.mockResolvedValue(null);

      const results = await engine.batchCalculateDifficulty(learnerCategories);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Learner not found');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle learner with no category mastery data', async () => {
      const learnerWithoutMastery = {
        ...mockLearner,
        categoryMastery: new Map()
      };

      const mockPerformances = [
        { correct: true, timeSpent: 30, hintsUsed: 0, createdAt: new Date() },
        { correct: false, timeSpent: 60, hintsUsed: 2, createdAt: new Date() },
        { correct: true, timeSpent: 45, hintsUsed: 1, createdAt: new Date() }
      ];

      Learner.findById.mockResolvedValue(learnerWithoutMastery);
      Performance.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPerformances)
      });

      const result = await engine.calculateNextDifficulty(mockLearnerId, 'NewCategory', 5);

      expect(result).toBeDefined();
      expect(result.newDifficulty).toBeGreaterThanOrEqual(1);
      expect(result.newDifficulty).toBeLessThanOrEqual(10);
    });

    it('should handle extreme learning velocity values', () => {
      const performanceMetrics = {
        accuracy: 0.8,
        streak: 3,
        timeEfficiency: 0.7,
        averageHintsUsed: 1,
        consistencyScore: 0.8
      };

      const masteryInfluence = { influence: 0 };
      
      // Test with very high learning velocity
      const highVelocityAdjustment = engine.calculateDifficultyAdjustment(
        performanceMetrics, 
        masteryInfluence, 
        5.0
      );

      // Test with very low learning velocity
      const lowVelocityAdjustment = engine.calculateDifficultyAdjustment(
        performanceMetrics, 
        masteryInfluence, 
        0.1
      );

      expect(Math.abs(highVelocityAdjustment)).toBeLessThanOrEqual(engine.config.MAX_DIFFICULTY_CHANGE);
      expect(Math.abs(lowVelocityAdjustment)).toBeLessThanOrEqual(engine.config.MAX_DIFFICULTY_CHANGE);
    });

    it('should handle performance data with zero time spent', () => {
      const performancesWithZeroTime = [
        { correct: true, timeSpent: 0, hintsUsed: 0 },
        { correct: false, timeSpent: 0, hintsUsed: 1 }
      ];

      const metrics = engine.calculatePerformanceMetrics(performancesWithZeroTime);

      expect(metrics.averageTimeSpent).toBe(0);
      expect(metrics.timeEfficiency).toBeGreaterThanOrEqual(0);
      expect(metrics.timeEfficiency).toBeLessThanOrEqual(1);
    });
  });

  describe('Configuration Validation', () => {
    it('should have valid configuration constants', () => {
      expect(engine.config.HIGH_ACCURACY_THRESHOLD).toBeGreaterThan(engine.config.LOW_ACCURACY_THRESHOLD);
      expect(engine.config.MIN_QUESTIONS_FOR_ADJUSTMENT).toBeGreaterThan(0);
      expect(engine.config.MAX_DIFFICULTY_CHANGE).toBeGreaterThan(0);
      expect(engine.config.FAST_ANSWER_THRESHOLD).toBeLessThan(engine.config.SLOW_ANSWER_THRESHOLD);
    });
  });
});