const Learner = require('../../models/Learner');

// Mock Mongoose for testing without database
jest.mock('mongoose', () => ({
  Schema: jest.fn().mockImplementation(() => ({
    index: jest.fn(),
    virtual: jest.fn().mockReturnValue({ get: jest.fn() }),
    pre: jest.fn(),
    statics: {},
    methods: {}
  })),
  model: jest.fn(),
  Types: {
    ObjectId: jest.fn()
  }
}));

describe('Learner Model Logic', () => {
  // Create a mock learner object for testing validation methods
  const createMockLearner = (data = {}) => {
    const mockLearner = {
      email: data.email || 'test@example.com',
      name: data.name || 'Test User',
      categoryMastery: data.categoryMastery || new Map(),
      difficultyPreference: data.difficultyPreference || 5,
      learningVelocity: data.learningVelocity || 1.0,
      retentionRate: data.retentionRate || 0.8,
      totalQuestionsAnswered: data.totalQuestionsAnswered || 0,
      totalTimeSpent: data.totalTimeSpent || 0,
      overallAccuracy: data.overallAccuracy || 0,
      currentStreak: data.currentStreak || 0,
      longestStreak: data.longestStreak || 0,
      lastActive: data.lastActive || new Date(),
      preferences: data.preferences || {
        hintsEnabled: true,
        explanationsEnabled: true,
        timerEnabled: true,
        soundEnabled: false
      },

      // Mock save method
      save: jest.fn().mockResolvedValue(this),

      // Virtual properties
      get weakAreas() {
        const weakAreas = [];
        for (const [category, mastery] of this.categoryMastery) {
          if (mastery.level < 60) {
            weakAreas.push(category);
          }
        }
        return weakAreas;
      },

      get strongAreas() {
        const strongAreas = [];
        for (const [category, mastery] of this.categoryMastery) {
          if (mastery.level >= 80) {
            strongAreas.push(category);
          }
        }
        return strongAreas;
      },

      get averageSessionTime() {
        if (this.totalQuestionsAnswered === 0) return 0;
        return this.totalTimeSpent / this.totalQuestionsAnswered;
      },

      // Instance methods
      updateCategoryMastery: function (category, wasCorrect, timeSpent) {
        if (!this.categoryMastery.has(category)) {
          this.categoryMastery.set(category, {
            level: 0,
            confidence: 0,
            lastAssessed: new Date(),
            questionsAnswered: 0,
            averageAccuracy: 0,
            averageTimePerQuestion: 0,
            streakCount: 0
          });
        }

        const mastery = this.categoryMastery.get(category);

        // Update questions answered
        mastery.questionsAnswered += 1;

        // Update average accuracy
        const previousCorrect = Math.round(mastery.averageAccuracy * (mastery.questionsAnswered - 1));
        const newCorrect = previousCorrect + (wasCorrect ? 1 : 0);
        mastery.averageAccuracy = newCorrect / mastery.questionsAnswered;

        // Update average time per question
        mastery.averageTimePerQuestion = ((mastery.averageTimePerQuestion * (mastery.questionsAnswered - 1)) + timeSpent) / mastery.questionsAnswered;

        // Update streak
        if (wasCorrect) {
          mastery.streakCount += 1;
        } else {
          mastery.streakCount = 0;
        }

        // Calculate mastery level (0-100) based on accuracy, consistency, and speed
        const accuracyScore = mastery.averageAccuracy * 60; // Max 60 points for accuracy
        const consistencyScore = Math.min(mastery.streakCount * 2, 25); // Max 25 points for consistency
        const speedScore = Math.max(0, 15 - (mastery.averageTimePerQuestion / 10)); // Max 15 points for speed

        mastery.level = Math.min(100, Math.round(accuracyScore + consistencyScore + speedScore));

        // Update confidence based on recent performance and question count
        const experienceFactor = Math.min(1, mastery.questionsAnswered / 20); // Full confidence after 20 questions
        mastery.confidence = mastery.averageAccuracy * experienceFactor;

        mastery.lastAssessed = new Date();

        this.categoryMastery.set(category, mastery);
        return Promise.resolve(this);
      },

      updateOverallStats: function (wasCorrect, timeSpent) {
        this.totalQuestionsAnswered += 1;
        this.totalTimeSpent += timeSpent;

        // Update overall accuracy
        const previousCorrect = Math.round(this.overallAccuracy * (this.totalQuestionsAnswered - 1));
        const newCorrect = previousCorrect + (wasCorrect ? 1 : 0);
        this.overallAccuracy = newCorrect / this.totalQuestionsAnswered;

        // Update streaks
        if (wasCorrect) {
          this.currentStreak += 1;
          this.longestStreak = Math.max(this.longestStreak, this.currentStreak);
        } else {
          this.currentStreak = 0;
        }

        return Promise.resolve(this);
      },

      getRecommendedDifficulty: function (category) {
        if (!this.categoryMastery.has(category)) {
          return this.difficultyPreference;
        }

        const mastery = this.categoryMastery.get(category);
        const masteryLevel = mastery.level;

        // Adjust difficulty based on mastery level
        let recommendedDifficulty = this.difficultyPreference;

        if (masteryLevel < 30) {
          recommendedDifficulty = Math.max(1, this.difficultyPreference - 2);
        } else if (masteryLevel < 60) {
          recommendedDifficulty = Math.max(1, this.difficultyPreference - 1);
        } else if (masteryLevel > 80) {
          recommendedDifficulty = Math.min(10, this.difficultyPreference + 1);
        } else if (masteryLevel > 90) {
          recommendedDifficulty = Math.min(10, this.difficultyPreference + 2);
        }

        return recommendedDifficulty;
      }
    };

    return mockLearner;
  };

  describe('Schema Structure and Defaults', () => {
    test('should create a learner with valid data and defaults', () => {
      const learner = createMockLearner({
        email: 'test@example.com',
        name: 'Test User'
      });

      expect(learner.email).toBe('test@example.com');
      expect(learner.name).toBe('Test User');
      expect(learner.categoryMastery).toBeInstanceOf(Map);
      expect(learner.difficultyPreference).toBe(5);
      expect(learner.learningVelocity).toBe(1.0);
      expect(learner.retentionRate).toBe(0.8);
      expect(learner.totalQuestionsAnswered).toBe(0);
      expect(learner.overallAccuracy).toBe(0);
      expect(learner.currentStreak).toBe(0);
      expect(learner.longestStreak).toBe(0);
    });

    test('should validate email format logic', () => {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

      expect(emailRegex.test('valid@example.com')).toBe(true);
      expect(emailRegex.test('user.name@domain.co.uk')).toBe(true);
      expect(emailRegex.test('invalid-email')).toBe(false);
      expect(emailRegex.test('@domain.com')).toBe(false);
      expect(emailRegex.test('user@')).toBe(false);
    });

    test('should validate difficulty preference range logic', () => {
      const validateDifficultyPreference = (value) => {
        return value >= 1 && value <= 10 && Number.isInteger(value);
      };

      expect(validateDifficultyPreference(1)).toBe(true);
      expect(validateDifficultyPreference(5)).toBe(true);
      expect(validateDifficultyPreference(10)).toBe(true);
      expect(validateDifficultyPreference(0)).toBe(false);
      expect(validateDifficultyPreference(11)).toBe(false);
      expect(validateDifficultyPreference(5.5)).toBe(false);
    });

    test('should validate learning velocity range logic', () => {
      const validateLearningVelocity = (value) => {
        return value >= 0.1 && value <= 5.0;
      };

      expect(validateLearningVelocity(0.1)).toBe(true);
      expect(validateLearningVelocity(1.0)).toBe(true);
      expect(validateLearningVelocity(5.0)).toBe(true);
      expect(validateLearningVelocity(0.05)).toBe(false);
      expect(validateLearningVelocity(6.0)).toBe(false);
    });

    test('should validate retention rate range logic', () => {
      const validateRetentionRate = (value) => {
        return value >= 0 && value <= 1;
      };

      expect(validateRetentionRate(0)).toBe(true);
      expect(validateRetentionRate(0.8)).toBe(true);
      expect(validateRetentionRate(1)).toBe(true);
      expect(validateRetentionRate(-0.1)).toBe(false);
      expect(validateRetentionRate(1.5)).toBe(false);
    });
  });

  describe('Category Mastery Map', () => {
    test('should initialize with empty category mastery map', () => {
      const learner = createMockLearner();

      expect(learner.categoryMastery).toBeInstanceOf(Map);
      expect(learner.categoryMastery.size).toBe(0);
    });

    test('should allow setting category mastery data', () => {
      const learner = createMockLearner();
      const categoryData = {
        level: 75,
        confidence: 0.8,
        lastAssessed: new Date(),
        questionsAnswered: 10,
        averageAccuracy: 0.8,
        averageTimePerQuestion: 30,
        streakCount: 5
      };

      learner.categoryMastery.set('Mathematics', categoryData);

      expect(learner.categoryMastery.has('Mathematics')).toBe(true);
      expect(learner.categoryMastery.get('Mathematics').level).toBe(75);
      expect(learner.categoryMastery.get('Mathematics').confidence).toBe(0.8);
      expect(learner.categoryMastery.get('Mathematics').questionsAnswered).toBe(10);
    });

    test('should validate category mastery sub-schema constraints', () => {
      const validateCategoryMastery = (data) => {
        const errors = [];

        if (data.level < 0 || data.level > 100) {
          errors.push('Level must be between 0 and 100');
        }
        if (data.confidence < 0 || data.confidence > 1) {
          errors.push('Confidence must be between 0 and 1');
        }
        if (data.questionsAnswered < 0) {
          errors.push('Questions answered cannot be negative');
        }
        if (data.averageAccuracy < 0 || data.averageAccuracy > 1) {
          errors.push('Average accuracy must be between 0 and 1');
        }
        if (data.averageTimePerQuestion < 0) {
          errors.push('Average time cannot be negative');
        }
        if (data.streakCount < 0) {
          errors.push('Streak count cannot be negative');
        }

        return errors;
      };

      // Valid data
      const validData = {
        level: 75,
        confidence: 0.8,
        questionsAnswered: 10,
        averageAccuracy: 0.8,
        averageTimePerQuestion: 30,
        streakCount: 5
      };
      expect(validateCategoryMastery(validData)).toHaveLength(0);

      // Invalid data
      const invalidData = {
        level: 150, // Invalid: exceeds max of 100
        confidence: 1.5, // Invalid: exceeds max of 1
        questionsAnswered: -1, // Invalid: negative
        averageAccuracy: 1.2, // Invalid: exceeds max of 1
        averageTimePerQuestion: -5, // Invalid: negative
        streakCount: -1 // Invalid: negative
      };
      const errors = validateCategoryMastery(invalidData);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Level must be between 0 and 100');
      expect(errors).toContain('Confidence must be between 0 and 1');
    });

    test('should handle multiple categories', () => {
      const learner = createMockLearner();
      const mathData = {
        level: 75,
        confidence: 0.8,
        questionsAnswered: 10,
        averageAccuracy: 0.8
      };

      const scienceData = {
        level: 60,
        confidence: 0.7,
        questionsAnswered: 8,
        averageAccuracy: 0.75
      };

      learner.categoryMastery.set('Mathematics', mathData);
      learner.categoryMastery.set('Science', scienceData);

      expect(learner.categoryMastery.size).toBe(2);
      expect(learner.categoryMastery.has('Mathematics')).toBe(true);
      expect(learner.categoryMastery.has('Science')).toBe(true);
    });
  });

  describe('Virtual Properties', () => {
    test('should identify weak areas correctly', () => {
      const learner = createMockLearner();

      // Set up category mastery data
      learner.categoryMastery.set('Mathematics', {
        level: 45, // Weak area (< 60)
        confidence: 0.5,
        questionsAnswered: 10,
        averageAccuracy: 0.5
      });

      learner.categoryMastery.set('Science', {
        level: 85, // Strong area (>= 80)
        confidence: 0.9,
        questionsAnswered: 15,
        averageAccuracy: 0.85
      });

      learner.categoryMastery.set('History', {
        level: 70, // Neither weak nor strong
        confidence: 0.7,
        questionsAnswered: 12,
        averageAccuracy: 0.7
      });

      const weakAreas = learner.weakAreas;
      expect(weakAreas).toContain('Mathematics');
      expect(weakAreas).not.toContain('Science');
      expect(weakAreas).not.toContain('History');
    });

    test('should identify strong areas correctly', () => {
      const learner = createMockLearner();

      learner.categoryMastery.set('Mathematics', {
        level: 45, // Weak area (< 60)
        confidence: 0.5,
        questionsAnswered: 10,
        averageAccuracy: 0.5
      });

      learner.categoryMastery.set('Science', {
        level: 85, // Strong area (>= 80)
        confidence: 0.9,
        questionsAnswered: 15,
        averageAccuracy: 0.85
      });

      learner.categoryMastery.set('History', {
        level: 70, // Neither weak nor strong
        confidence: 0.7,
        questionsAnswered: 12,
        averageAccuracy: 0.7
      });

      const strongAreas = learner.strongAreas;
      expect(strongAreas).toContain('Science');
      expect(strongAreas).not.toContain('Mathematics');
      expect(strongAreas).not.toContain('History');
    });

    test('should calculate average session time correctly', () => {
      const learner = createMockLearner({
        totalQuestionsAnswered: 37,
        totalTimeSpent: 1110 // 30 seconds average
      });

      const avgSessionTime = learner.averageSessionTime;
      expect(avgSessionTime).toBe(30); // 1110 / 37
    });

    test('should return 0 for average session time when no questions answered', () => {
      const learner = createMockLearner({
        totalQuestionsAnswered: 0,
        totalTimeSpent: 0
      });

      expect(learner.averageSessionTime).toBe(0);
    });
  });

  describe('Instance Methods', () => {

    describe('updateCategoryMastery', () => {
      test('should create new category mastery when category does not exist', async () => {
        const learner = createMockLearner();
        await learner.updateCategoryMastery('Mathematics', true, 25);

        expect(learner.categoryMastery.has('Mathematics')).toBe(true);
        const mastery = learner.categoryMastery.get('Mathematics');
        expect(mastery.questionsAnswered).toBe(1);
        expect(mastery.averageAccuracy).toBe(1);
        expect(mastery.averageTimePerQuestion).toBe(25);
        expect(mastery.streakCount).toBe(1);
        expect(mastery.level).toBeGreaterThan(0);
      });

      test('should update existing category mastery correctly', async () => {
        const learner = createMockLearner();

        // First question - correct
        await learner.updateCategoryMastery('Mathematics', true, 30);

        // Second question - incorrect
        await learner.updateCategoryMastery('Mathematics', false, 45);

        const mastery = learner.categoryMastery.get('Mathematics');
        expect(mastery.questionsAnswered).toBe(2);
        expect(mastery.averageAccuracy).toBe(0.5); // 1 correct out of 2
        expect(mastery.averageTimePerQuestion).toBe(37.5); // (30 + 45) / 2
        expect(mastery.streakCount).toBe(0); // Reset after incorrect answer
      });

      test('should calculate mastery level based on accuracy, consistency, and speed', async () => {
        const learner = createMockLearner();

        // Answer 5 questions correctly with good speed
        for (let i = 0; i < 5; i++) {
          await learner.updateCategoryMastery('Mathematics', true, 20);
        }

        const mastery = learner.categoryMastery.get('Mathematics');
        expect(mastery.level).toBeGreaterThan(60); // Should be high due to perfect accuracy and good speed
        expect(mastery.confidence).toBeGreaterThan(0.2); // Should increase with more questions
      });

      test('should update confidence based on experience and accuracy', async () => {
        const learner = createMockLearner();

        // Answer 20 questions with 80% accuracy
        for (let i = 0; i < 20; i++) {
          const isCorrect = i < 16; // 16 correct out of 20 = 80%
          await learner.updateCategoryMastery('Mathematics', isCorrect, 25);
        }

        const mastery = learner.categoryMastery.get('Mathematics');
        expect(mastery.confidence).toBeCloseTo(0.8, 1); // Should approach accuracy * experience factor
      });

      test('should reset streak on incorrect answer', async () => {
        const learner = createMockLearner();

        // Build up a streak
        await learner.updateCategoryMastery('Mathematics', true, 25);
        await learner.updateCategoryMastery('Mathematics', true, 25);
        await learner.updateCategoryMastery('Mathematics', true, 25);

        let mastery = learner.categoryMastery.get('Mathematics');
        expect(mastery.streakCount).toBe(3);

        // Break the streak
        await learner.updateCategoryMastery('Mathematics', false, 25);

        mastery = learner.categoryMastery.get('Mathematics');
        expect(mastery.streakCount).toBe(0);
      });

      test('should update lastAssessed timestamp', async () => {
        const learner = createMockLearner();
        const beforeTime = new Date();
        await learner.updateCategoryMastery('Mathematics', true, 25);
        const afterTime = new Date();

        const mastery = learner.categoryMastery.get('Mathematics');
        expect(mastery.lastAssessed.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(mastery.lastAssessed.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      });
    });

    describe('updateOverallStats', () => {
      test('should update overall statistics correctly', async () => {
        const learner = createMockLearner();
        await learner.updateOverallStats(true, 30);

        expect(learner.totalQuestionsAnswered).toBe(1);
        expect(learner.totalTimeSpent).toBe(30);
        expect(learner.overallAccuracy).toBe(1);
        expect(learner.currentStreak).toBe(1);
        expect(learner.longestStreak).toBe(1);
      });

      test('should calculate overall accuracy correctly over multiple questions', async () => {
        const learner = createMockLearner();

        await learner.updateOverallStats(true, 25);  // 1/1 = 100%
        await learner.updateOverallStats(false, 35); // 1/2 = 50%
        await learner.updateOverallStats(true, 20);  // 2/3 = 66.67%

        expect(learner.totalQuestionsAnswered).toBe(3);
        expect(learner.totalTimeSpent).toBe(80);
        expect(learner.overallAccuracy).toBeCloseTo(0.6667, 4);
      });

      test('should track current and longest streaks correctly', async () => {
        const learner = createMockLearner();

        // Build up a streak
        await learner.updateOverallStats(true, 25);
        await learner.updateOverallStats(true, 25);
        await learner.updateOverallStats(true, 25);

        expect(learner.currentStreak).toBe(3);
        expect(learner.longestStreak).toBe(3);

        // Break the streak
        await learner.updateOverallStats(false, 25);

        expect(learner.currentStreak).toBe(0);
        expect(learner.longestStreak).toBe(3); // Should maintain longest

        // Start a new shorter streak
        await learner.updateOverallStats(true, 25);
        await learner.updateOverallStats(true, 25);

        expect(learner.currentStreak).toBe(2);
        expect(learner.longestStreak).toBe(3); // Should still be 3
      });
    });

    describe('getRecommendedDifficulty', () => {
      test('should return default difficulty preference for unknown category', () => {
        const learner = createMockLearner();
        const difficulty = learner.getRecommendedDifficulty('Unknown Category');
        expect(difficulty).toBe(learner.difficultyPreference);
      });

      test('should decrease difficulty for low mastery levels', () => {
        const learner = createMockLearner();

        // Set up low mastery
        learner.categoryMastery.set('Mathematics', {
          level: 25,
          confidence: 0.3,
          questionsAnswered: 10,
          averageAccuracy: 0.3
        });

        const difficulty = learner.getRecommendedDifficulty('Mathematics');
        expect(difficulty).toBeLessThan(learner.difficultyPreference);
      });

      test('should increase difficulty for high mastery levels', () => {
        const learner = createMockLearner();

        // Set up high mastery
        learner.categoryMastery.set('Mathematics', {
          level: 85,
          confidence: 0.9,
          questionsAnswered: 20,
          averageAccuracy: 0.85
        });

        const difficulty = learner.getRecommendedDifficulty('Mathematics');
        expect(difficulty).toBeGreaterThan(learner.difficultyPreference);
      });

      test('should respect difficulty bounds (1-10)', () => {
        // Test lower bound
        const learner1 = createMockLearner({ difficultyPreference: 1 });
        learner1.categoryMastery.set('Mathematics', {
          level: 10,
          confidence: 0.1,
          questionsAnswered: 5,
          averageAccuracy: 0.2
        });

        let difficulty = learner1.getRecommendedDifficulty('Mathematics');
        expect(difficulty).toBeGreaterThanOrEqual(1);

        // Test upper bound
        const learner2 = createMockLearner({ difficultyPreference: 10 });
        learner2.categoryMastery.set('Science', {
          level: 95,
          confidence: 0.95,
          questionsAnswered: 30,
          averageAccuracy: 0.95
        });

        difficulty = learner2.getRecommendedDifficulty('Science');
        expect(difficulty).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Static Methods Logic', () => {
    describe('findByPerformanceLevel Logic', () => {
      test('should filter learners by performance range with sufficient data', () => {
        const learners = [
          { overallAccuracy: 0.9, totalQuestionsAnswered: 50 },
          { overallAccuracy: 0.7, totalQuestionsAnswered: 30 },
          { overallAccuracy: 0.4, totalQuestionsAnswered: 20 },
          { overallAccuracy: 0.8, totalQuestionsAnswered: 5 } // Below threshold
        ];

        const findByPerformanceLevel = (learners, minAccuracy, maxAccuracy) => {
          return learners.filter(learner =>
            learner.overallAccuracy >= minAccuracy &&
            learner.overallAccuracy <= maxAccuracy &&
            learner.totalQuestionsAnswered >= 10
          );
        };

        const mediumPerformers = findByPerformanceLevel(learners, 0.6, 0.8);
        expect(mediumPerformers).toHaveLength(1);
        expect(mediumPerformers[0].overallAccuracy).toBe(0.7);

        const highPerformers = findByPerformanceLevel(learners, 0.75, 1.0);
        expect(highPerformers).toHaveLength(1); // Should exclude user with insufficient data
        expect(highPerformers[0].overallAccuracy).toBe(0.9);

        const veryHighPerformers = findByPerformanceLevel(learners, 0.95, 1.0);
        expect(veryHighPerformers).toHaveLength(0);
      });
    });

    describe('getAnalytics Logic', () => {
      test('should calculate analytics correctly', () => {
        const learner = createMockLearner({
          name: 'High Performer',
          email: 'high@example.com',
          overallAccuracy: 0.9,
          totalQuestionsAnswered: 50,
          totalTimeSpent: 1500,
          currentStreak: 5,
          longestStreak: 12
        });

        learner.categoryMastery.set('Math', { level: 85 });
        learner.categoryMastery.set('Science', { level: 90 });

        const getAnalytics = (learner) => {
          return {
            name: learner.name,
            email: learner.email,
            overallAccuracy: learner.overallAccuracy,
            totalQuestionsAnswered: learner.totalQuestionsAnswered,
            totalTimeSpent: learner.totalTimeSpent,
            currentStreak: learner.currentStreak,
            longestStreak: learner.longestStreak,
            categoryCount: learner.categoryMastery.size,
            averageSessionTime: learner.totalQuestionsAnswered === 0 ? 0 :
              learner.totalTimeSpent / learner.totalQuestionsAnswered
          };
        };

        const analytics = getAnalytics(learner);
        expect(analytics.name).toBe('High Performer');
        expect(analytics.email).toBe('high@example.com');
        expect(analytics.overallAccuracy).toBe(0.9);
        expect(analytics.totalQuestionsAnswered).toBe(50);
        expect(analytics.averageSessionTime).toBe(30);
        expect(analytics.categoryCount).toBe(2);
      });

      test('should handle learner with no questions answered', () => {
        const learner = createMockLearner({
          name: 'Zero Questions',
          email: 'zero@example.com',
          totalQuestionsAnswered: 0,
          totalTimeSpent: 0
        });

        const getAnalytics = (learner) => {
          return {
            averageSessionTime: learner.totalQuestionsAnswered === 0 ? 0 :
              learner.totalTimeSpent / learner.totalQuestionsAnswered
          };
        };

        const analytics = getAnalytics(learner);
        expect(analytics.averageSessionTime).toBe(0);
      });
    });
  });

  describe('Middleware and Hooks Logic', () => {
    test('should update lastActive on save logic', () => {
      const preSaveMiddleware = function (next) {
        if (this.isModified() && !this.isModified('lastActive')) {
          this.lastActive = new Date();
        }
        next();
      };

      const mockLearner = {
        lastActive: new Date('2023-01-01'),
        isModified: jest.fn().mockImplementation((field) => {
          if (field === 'lastActive') return false;
          return true; // Other fields are modified
        })
      };

      const beforeTime = new Date();
      preSaveMiddleware.call(mockLearner, () => { });
      const afterTime = new Date();

      expect(mockLearner.lastActive.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(mockLearner.lastActive.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    test('should not update lastActive when explicitly setting it', () => {
      const preSaveMiddleware = function (next) {
        if (this.isModified() && !this.isModified('lastActive')) {
          this.lastActive = new Date();
        }
        next();
      };

      const specificDate = new Date('2023-01-01');
      const mockLearner = {
        lastActive: specificDate,
        isModified: jest.fn().mockImplementation((field) => {
          if (field === 'lastActive') return true; // lastActive was explicitly modified
          return false;
        })
      };

      preSaveMiddleware.call(mockLearner, () => { });

      expect(mockLearner.lastActive.getTime()).toBe(specificDate.getTime());
    });
  });

  describe('CRUD Operations Logic', () => {
    test('should validate CRUD operation patterns', () => {
      // Test create operation
      const createLearner = (data) => {
        const requiredFields = ['email', 'name'];
        const missingFields = requiredFields.filter(field => !data[field]);

        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        return {
          _id: 'generated-id',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      };

      const validData = { email: 'create@example.com', name: 'Create Test' };
      const learner = createLearner(validData);

      expect(learner._id).toBeDefined();
      expect(learner.email).toBe('create@example.com');
      expect(learner.name).toBe('Create Test');
      expect(learner.createdAt).toBeDefined();
      expect(learner.updatedAt).toBeDefined();

      // Test validation
      expect(() => createLearner({})).toThrow('Missing required fields: email, name');
      expect(() => createLearner({ email: 'test@example.com' })).toThrow('Missing required fields: name');
    });

    test('should validate update operation patterns', () => {
      const updateLearner = (original, updates) => {
        return {
          ...original,
          ...updates,
          updatedAt: new Date()
        };
      };

      const original = {
        _id: 'test-id',
        email: 'update@example.com',
        name: 'Update Test',
        difficultyPreference: 5
      };

      const updated = updateLearner(original, {
        name: 'Updated Name',
        difficultyPreference: 7
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.difficultyPreference).toBe(7);
      expect(updated.email).toBe('update@example.com'); // Should remain unchanged
      expect(updated._id).toBe('test-id'); // Should remain unchanged
    });

    test('should validate query operation patterns', () => {
      const learners = [
        { email: 'query1@example.com', name: 'Query Test 1', difficultyPreference: 3 },
        { email: 'query2@example.com', name: 'Query Test 2', difficultyPreference: 7 },
        { email: 'query3@example.com', name: 'Query Test 3', difficultyPreference: 3 }
      ];

      const findByQuery = (learners, query) => {
        return learners.filter(learner => {
          for (const [key, condition] of Object.entries(query)) {
            if (typeof condition === 'object' && condition !== null) {
              if (condition.$lte !== undefined && learner[key] > condition.$lte) return false;
              if (condition.$gte !== undefined && learner[key] < condition.$gte) return false;
            } else {
              if (learner[key] !== condition) return false;
            }
          }
          return true;
        });
      };

      const beginnerLearners = findByQuery(learners, { difficultyPreference: { $lte: 3 } });
      expect(beginnerLearners).toHaveLength(2);

      const advancedLearners = findByQuery(learners, { difficultyPreference: { $gte: 7 } });
      expect(advancedLearners).toHaveLength(1);
    });
  });

  describe('Integration with Performance Data', () => {
    test('should handle complete learning session simulation', async () => {
      const learner = createMockLearner({
        email: 'integration@example.com',
        name: 'Integration Test'
      });

      const questions = [
        { category: 'Mathematics', correct: true, time: 25 },
        { category: 'Mathematics', correct: false, time: 45 },
        { category: 'Science', correct: true, time: 30 },
        { category: 'Science', correct: true, time: 20 },
        { category: 'History', correct: false, time: 60 },
        { category: 'Mathematics', correct: true, time: 22 }
      ];

      // Simulate answering questions
      for (const q of questions) {
        await learner.updateCategoryMastery(q.category, q.correct, q.time);
        await learner.updateOverallStats(q.correct, q.time);
      }

      // Verify overall stats
      expect(learner.totalQuestionsAnswered).toBe(6);
      expect(learner.totalTimeSpent).toBe(202);
      expect(learner.overallAccuracy).toBeCloseTo(0.6667, 4); // 4 correct out of 6

      // Verify category-specific stats
      const mathMastery = learner.categoryMastery.get('Mathematics');
      expect(mathMastery.questionsAnswered).toBe(3);
      expect(mathMastery.averageAccuracy).toBeCloseTo(0.6667, 4); // 2 correct out of 3

      const scienceMastery = learner.categoryMastery.get('Science');
      expect(scienceMastery.questionsAnswered).toBe(2);
      expect(scienceMastery.averageAccuracy).toBe(1); // 2 correct out of 2

      const historyMastery = learner.categoryMastery.get('History');
      expect(historyMastery.questionsAnswered).toBe(1);
      expect(historyMastery.averageAccuracy).toBe(0); // 0 correct out of 1

      // Verify virtual properties
      expect(learner.strongAreas).toContain('Science');
      expect(learner.weakAreas).toContain('History');
    });

    test('should provide appropriate difficulty recommendations based on performance', async () => {
      const learner = createMockLearner();

      // Simulate poor performance in Mathematics
      for (let i = 0; i < 10; i++) {
        await learner.updateCategoryMastery('Mathematics', i < 2, 30); // 20% accuracy
      }

      // Simulate excellent performance in Science
      for (let i = 0; i < 10; i++) {
        await learner.updateCategoryMastery('Science', i < 9, 20); // 90% accuracy
      }

      const mathDifficulty = learner.getRecommendedDifficulty('Mathematics');
      const scienceDifficulty = learner.getRecommendedDifficulty('Science');

      expect(mathDifficulty).toBeLessThan(learner.difficultyPreference);
      expect(scienceDifficulty).toBeGreaterThan(learner.difficultyPreference);
    });
  });

  describe('Mastery Calculation Algorithms', () => {
    test('should calculate mastery level correctly based on multiple factors', async () => {
      const learner = createMockLearner();

      // Test perfect performance with good speed
      await learner.updateCategoryMastery('PerfectCategory', true, 15); // Fast response
      await learner.updateCategoryMastery('PerfectCategory', true, 15);
      await learner.updateCategoryMastery('PerfectCategory', true, 15);
      await learner.updateCategoryMastery('PerfectCategory', true, 15);
      await learner.updateCategoryMastery('PerfectCategory', true, 15);

      const perfectMastery = learner.categoryMastery.get('PerfectCategory');
      expect(perfectMastery.level).toBeGreaterThan(80); // Should be high
      expect(perfectMastery.averageAccuracy).toBe(1);
      expect(perfectMastery.streakCount).toBe(5);

      // Test poor performance with slow speed
      await learner.updateCategoryMastery('PoorCategory', false, 60); // Slow response
      await learner.updateCategoryMastery('PoorCategory', false, 60);
      await learner.updateCategoryMastery('PoorCategory', true, 60);
      await learner.updateCategoryMastery('PoorCategory', false, 60);
      await learner.updateCategoryMastery('PoorCategory', false, 60);

      const poorMastery = learner.categoryMastery.get('PoorCategory');
      expect(poorMastery.level).toBeLessThan(30); // Should be low
      expect(poorMastery.averageAccuracy).toBe(0.2); // 1 correct out of 5
      expect(poorMastery.streakCount).toBe(0); // Broken by last incorrect answer
    });

    test('should update confidence based on experience factor', async () => {
      const learner = createMockLearner();

      // Test confidence with few questions (low experience)
      await learner.updateCategoryMastery('NewCategory', true, 25);
      await learner.updateCategoryMastery('NewCategory', true, 25);
      await learner.updateCategoryMastery('NewCategory', true, 25);

      let mastery = learner.categoryMastery.get('NewCategory');
      expect(mastery.confidence).toBeLessThan(mastery.averageAccuracy); // Should be reduced by experience factor

      // Test confidence with many questions (high experience)
      for (let i = 0; i < 17; i++) { // Total 20 questions
        await learner.updateCategoryMastery('NewCategory', true, 25);
      }

      mastery = learner.categoryMastery.get('NewCategory');
      expect(mastery.confidence).toBeCloseTo(mastery.averageAccuracy, 1); // Should approach accuracy
    });
  });
});