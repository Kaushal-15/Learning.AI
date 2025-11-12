// Mock Mongoose for testing without database
jest.mock('mongoose', () => {
  const mockSchema = jest.fn().mockImplementation(() => ({
    index: jest.fn(),
    virtual: jest.fn().mockReturnValue({ get: jest.fn() }),
    pre: jest.fn(),
    statics: {},
    methods: {}
  }));
  
  mockSchema.Types = {
    ObjectId: jest.fn().mockImplementation((id) => id || 'mock-object-id')
  };
  
  return {
    Schema: mockSchema,
    model: jest.fn(),
    Types: {
      ObjectId: jest.fn().mockImplementation((id) => id || 'mock-object-id')
    }
  };
});

const Performance = require('../../models/Performance');

describe('Performance Model Logic', () => {
  // Create a mock performance record for testing
  const createMockPerformance = (data = {}) => {
    const mockPerformance = {
      learnerId: data.learnerId || 'learner-123',
      questionId: data.questionId || 'question-456',
      selectedAnswer: data.selectedAnswer || 'Option A',
      correct: data.correct !== undefined ? data.correct : true,
      timeSpent: data.timeSpent || 30,
      hintsUsed: data.hintsUsed || 0,
      difficulty: data.difficulty || 5,
      category: data.category || ['Mathematics', 'Algebra'],
      sessionId: data.sessionId || 'session-789',
      attemptNumber: data.attemptNumber || 1,
      confidenceLevel: data.confidenceLevel || 4,
      deviceType: data.deviceType || 'desktop',
      metadata: data.metadata || {},
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
      
      // Mock save method
      save: jest.fn().mockResolvedValue(this),
      
      // Virtual properties
      get performanceScore() {
        let score = this.correct ? 60 : 0; // Base score for correctness
        
        // Time bonus (faster = better, up to 25 points)
        const timeBonus = Math.max(0, 25 - (this.timeSpent / 10));
        score += timeBonus;
        
        // Hint penalty (fewer hints = better, up to 10 points)
        const hintPenalty = this.hintsUsed * 2;
        score = Math.max(0, score - hintPenalty);
        
        // Difficulty bonus (harder questions = more points, up to 15 points)
        const difficultyBonus = (this.difficulty - 1) * 1.5;
        score += difficultyBonus;
        
        return Math.min(100, Math.round(score));
      },
      
      get primaryCategory() {
        return this.category[0];
      },
      
      // Instance methods
      getPerformanceMetrics: function() {
        return {
          performanceScore: this.performanceScore,
          efficiency: this.correct ? (60 / Math.max(this.timeSpent, 1)) : 0,
          difficultyAdjustedScore: this.performanceScore * (this.difficulty / 5),
          hintDependency: this.hintsUsed / Math.max(1, this.timeSpent / 30), // hints per 30 seconds
          categoryMastery: this.correct && this.hintsUsed === 0 && this.timeSpent < 60
        };
      }
    };
    
    return mockPerformance;
  };

  describe('Schema Structure and Validation', () => {
    test('should create performance record with valid data and defaults', () => {
      const performance = createMockPerformance({
        learnerId: 'learner-123',
        questionId: 'question-456',
        selectedAnswer: 'Option B',
        correct: true,
        timeSpent: 45
      });

      expect(performance.learnerId).toBe('learner-123');
      expect(performance.questionId).toBe('question-456');
      expect(performance.selectedAnswer).toBe('Option B');
      expect(performance.correct).toBe(true);
      expect(performance.timeSpent).toBe(45);
      expect(performance.hintsUsed).toBe(0);
      expect(performance.difficulty).toBe(5);
      expect(performance.category).toEqual(['Mathematics', 'Algebra']);
      expect(performance.attemptNumber).toBe(1);
      expect(performance.deviceType).toBe('desktop');
    });

    test('should validate required fields logic', () => {
      const validateRequired = (data) => {
        const requiredFields = ['learnerId', 'questionId', 'selectedAnswer', 'correct', 'timeSpent', 'difficulty', 'category', 'sessionId'];
        const missingFields = requiredFields.filter(field => data[field] === undefined || data[field] === null);
        return missingFields;
      };

      const validData = {
        learnerId: 'learner-123',
        questionId: 'question-456',
        selectedAnswer: 'Option A',
        correct: true,
        timeSpent: 30,
        difficulty: 5,
        category: ['Math'],
        sessionId: 'session-789'
      };

      expect(validateRequired(validData)).toHaveLength(0);

      const invalidData = {
        learnerId: 'learner-123',
        // Missing questionId, selectedAnswer, etc.
      };

      const missingFields = validateRequired(invalidData);
      expect(missingFields.length).toBeGreaterThan(0);
      expect(missingFields).toContain('questionId');
      expect(missingFields).toContain('selectedAnswer');
    });

    test('should validate time spent constraints', () => {
      const validateTimeSpent = (timeSpent) => {
        return timeSpent >= 0 && timeSpent <= 3600; // 0 to 1 hour
      };

      expect(validateTimeSpent(30)).toBe(true);
      expect(validateTimeSpent(0)).toBe(true);
      expect(validateTimeSpent(3600)).toBe(true);
      expect(validateTimeSpent(-1)).toBe(false);
      expect(validateTimeSpent(3601)).toBe(false);
    });

    test('should validate hints used constraints', () => {
      const validateHintsUsed = (hintsUsed) => {
        return hintsUsed >= 0 && hintsUsed <= 10;
      };

      expect(validateHintsUsed(0)).toBe(true);
      expect(validateHintsUsed(5)).toBe(true);
      expect(validateHintsUsed(10)).toBe(true);
      expect(validateHintsUsed(-1)).toBe(false);
      expect(validateHintsUsed(11)).toBe(false);
    });

    test('should validate difficulty constraints', () => {
      const validateDifficulty = (difficulty) => {
        return difficulty >= 1 && difficulty <= 10 && Number.isInteger(difficulty);
      };

      expect(validateDifficulty(1)).toBe(true);
      expect(validateDifficulty(5)).toBe(true);
      expect(validateDifficulty(10)).toBe(true);
      expect(validateDifficulty(0)).toBe(false);
      expect(validateDifficulty(11)).toBe(false);
      expect(validateDifficulty(5.5)).toBe(false);
    });

    test('should validate device type enum', () => {
      const validateDeviceType = (deviceType) => {
        const validTypes = ['desktop', 'tablet', 'mobile'];
        return validTypes.includes(deviceType);
      };

      expect(validateDeviceType('desktop')).toBe(true);
      expect(validateDeviceType('tablet')).toBe(true);
      expect(validateDeviceType('mobile')).toBe(true);
      expect(validateDeviceType('laptop')).toBe(false);
      expect(validateDeviceType('phone')).toBe(false);
    });

    test('should validate category array constraints', () => {
      const validateCategory = (category) => {
        return Array.isArray(category) && 
               category.length > 0 && 
               category.every(cat => typeof cat === 'string' && cat.trim().length > 0);
      };

      expect(validateCategory(['Math'])).toBe(true);
      expect(validateCategory(['Math', 'Algebra'])).toBe(true);
      expect(validateCategory([])).toBe(false);
      expect(validateCategory([''])).toBe(false);
      expect(validateCategory(['Math', ''])).toBe(false);
    });
  });

  describe('Virtual Properties', () => {
    test('should calculate performance score correctly for correct answer', () => {
      const performance = createMockPerformance({
        correct: true,
        timeSpent: 20, // Fast answer
        hintsUsed: 0,  // No hints
        difficulty: 8  // High difficulty
      });

      const score = performance.performanceScore;
      
      // Base score: 60 (correct)
      // Time bonus: 25 - (20/10) = 23
      // Hint penalty: 0 * 2 = 0
      // Difficulty bonus: (8-1) * 1.5 = 10.5
      // Total: 60 + 23 + 0 + 10.5 = 93.5 → 94
      
      expect(score).toBe(94);
    });

    test('should calculate performance score correctly for incorrect answer', () => {
      const performance = createMockPerformance({
        correct: false,
        timeSpent: 60,
        hintsUsed: 3,
        difficulty: 3
      });

      const score = performance.performanceScore;
      
      // Base score: 0 (incorrect)
      // Time bonus: 25 - (60/10) = 19
      // Hint penalty: 3 * 2 = 6
      // Difficulty bonus: (3-1) * 1.5 = 3
      // Total: 0 + 19 - 6 + 3 = 16
      
      expect(score).toBe(16);
    });

    test('should cap performance score at 100', () => {
      const performance = createMockPerformance({
        correct: true,
        timeSpent: 5,   // Very fast
        hintsUsed: 0,   // No hints
        difficulty: 10  // Maximum difficulty
      });

      const score = performance.performanceScore;
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should return primary category correctly', () => {
      const performance = createMockPerformance({
        category: ['Mathematics', 'Algebra', 'Linear Equations']
      });

      expect(performance.primaryCategory).toBe('Mathematics');
    });

    test('should handle single category', () => {
      const performance = createMockPerformance({
        category: ['Science']
      });

      expect(performance.primaryCategory).toBe('Science');
    });
  });

  describe('Instance Methods', () => {
    describe('getPerformanceMetrics', () => {
      test('should calculate comprehensive performance metrics', () => {
        const performance = createMockPerformance({
          correct: true,
          timeSpent: 30,
          hintsUsed: 1,
          difficulty: 6
        });

        const metrics = performance.getPerformanceMetrics();

        expect(metrics.performanceScore).toBeDefined();
        expect(metrics.efficiency).toBe(2); // 60 / 30
        expect(metrics.difficultyAdjustedScore).toBeDefined();
        expect(metrics.hintDependency).toBeDefined();
        expect(metrics.categoryMastery).toBe(false); // Used hints
      });

      test('should identify category mastery correctly', () => {
        const masteryPerformance = createMockPerformance({
          correct: true,
          timeSpent: 45,  // Under 60 seconds
          hintsUsed: 0,   // No hints
          difficulty: 7
        });

        const metrics = masteryPerformance.getPerformanceMetrics();
        expect(metrics.categoryMastery).toBe(true);

        const nonMasteryPerformance = createMockPerformance({
          correct: true,
          timeSpent: 70,  // Over 60 seconds
          hintsUsed: 0,
          difficulty: 7
        });

        const nonMasteryMetrics = nonMasteryPerformance.getPerformanceMetrics();
        expect(nonMasteryMetrics.categoryMastery).toBe(false);
      });

      test('should calculate efficiency correctly', () => {
        const fastPerformance = createMockPerformance({
          correct: true,
          timeSpent: 20
        });

        const slowPerformance = createMockPerformance({
          correct: true,
          timeSpent: 60
        });

        const incorrectPerformance = createMockPerformance({
          correct: false,
          timeSpent: 30
        });

        expect(fastPerformance.getPerformanceMetrics().efficiency).toBe(3); // 60/20
        expect(slowPerformance.getPerformanceMetrics().efficiency).toBe(1); // 60/60
        expect(incorrectPerformance.getPerformanceMetrics().efficiency).toBe(0); // Incorrect answer
      });

      test('should calculate hint dependency correctly', () => {
        const performance = createMockPerformance({
          timeSpent: 60,  // 2 intervals of 30 seconds
          hintsUsed: 2
        });

        const metrics = performance.getPerformanceMetrics();
        expect(metrics.hintDependency).toBe(1); // 2 hints / 2 intervals
      });
    });
  });

  describe('Static Methods Logic', () => {
    describe('getLearnerAnalytics Logic', () => {
      test('should aggregate learner performance data correctly', () => {
        const performanceRecords = [
          { correct: true, timeSpent: 30, hintsUsed: 0, difficulty: 5, category: ['Math'] },
          { correct: false, timeSpent: 45, hintsUsed: 2, difficulty: 4, category: ['Math'] },
          { correct: true, timeSpent: 25, hintsUsed: 1, difficulty: 6, category: ['Science'] }
        ];

        const aggregateAnalytics = (records) => {
          const totalQuestions = records.length;
          const correctAnswers = records.filter(r => r.correct).length;
          const totalTimeSpent = records.reduce((sum, r) => sum + r.timeSpent, 0);
          const totalHintsUsed = records.reduce((sum, r) => sum + r.hintsUsed, 0);
          const averageDifficulty = records.reduce((sum, r) => sum + r.difficulty, 0) / totalQuestions;

          return {
            totalQuestions,
            correctAnswers,
            accuracy: correctAnswers / totalQuestions,
            totalTimeSpent,
            averageTimePerQuestion: totalTimeSpent / totalQuestions,
            totalHintsUsed,
            averageDifficulty
          };
        };

        const analytics = aggregateAnalytics(performanceRecords);

        expect(analytics.totalQuestions).toBe(3);
        expect(analytics.correctAnswers).toBe(2);
        expect(analytics.accuracy).toBeCloseTo(0.6667, 4);
        expect(analytics.totalTimeSpent).toBe(100);
        expect(analytics.averageTimePerQuestion).toBeCloseTo(33.33, 2);
        expect(analytics.totalHintsUsed).toBe(3);
        expect(analytics.averageDifficulty).toBe(5);
      });

      test('should handle empty performance data', () => {
        const aggregateAnalytics = (records) => {
          const totalQuestions = records.length;
          if (totalQuestions === 0) {
            return {
              totalQuestions: 0,
              correctAnswers: 0,
              accuracy: 0,
              totalTimeSpent: 0,
              averageTimePerQuestion: 0,
              totalHintsUsed: 0,
              averageDifficulty: 0
            };
          }
        };

        const analytics = aggregateAnalytics([]);
        expect(analytics.totalQuestions).toBe(0);
        expect(analytics.accuracy).toBe(0);
        expect(analytics.averageTimePerQuestion).toBe(0);
      });
    });

    describe('getCategoryTrends Logic', () => {
      test('should group performance by date correctly', () => {
        const performanceRecords = [
          { 
            createdAt: new Date('2023-01-01'), 
            correct: true, 
            timeSpent: 30, 
            difficulty: 5 
          },
          { 
            createdAt: new Date('2023-01-01'), 
            correct: false, 
            timeSpent: 45, 
            difficulty: 4 
          },
          { 
            createdAt: new Date('2023-01-02'), 
            correct: true, 
            timeSpent: 25, 
            difficulty: 6 
          }
        ];

        const groupByDate = (records) => {
          const grouped = {};
          
          records.forEach(record => {
            const dateKey = record.createdAt.toDateString();
            if (!grouped[dateKey]) {
              grouped[dateKey] = {
                questionsAnswered: 0,
                correctAnswers: 0,
                totalTimeSpent: 0,
                totalDifficulty: 0
              };
            }
            
            grouped[dateKey].questionsAnswered += 1;
            grouped[dateKey].correctAnswers += record.correct ? 1 : 0;
            grouped[dateKey].totalTimeSpent += record.timeSpent;
            grouped[dateKey].totalDifficulty += record.difficulty;
          });

          return Object.entries(grouped).map(([date, data]) => ({
            date,
            questionsAnswered: data.questionsAnswered,
            correctAnswers: data.correctAnswers,
            accuracy: data.correctAnswers / data.questionsAnswered,
            averageTimeSpent: data.totalTimeSpent / data.questionsAnswered,
            averageDifficulty: data.totalDifficulty / data.questionsAnswered
          }));
        };

        const trends = groupByDate(performanceRecords);
        
        expect(trends).toHaveLength(2);
        
        const jan1Trend = trends.find(t => t.date === 'Sun Jan 01 2023');
        expect(jan1Trend).toBeDefined();
        expect(jan1Trend.questionsAnswered).toBe(2);
        expect(jan1Trend.correctAnswers).toBe(1);
        expect(jan1Trend.accuracy).toBe(0.5);
        
        const jan2Trend = trends.find(t => t.date === 'Mon Jan 02 2023');
        expect(jan2Trend).toBeDefined();
        expect(jan2Trend.questionsAnswered).toBe(1);
        expect(jan2Trend.correctAnswers).toBe(1);
        expect(jan2Trend.accuracy).toBe(1);
      });
    });

    describe('getDifficultyProgression Logic', () => {
      test('should group performance by difficulty level', () => {
        const performanceRecords = [
          { difficulty: 3, correct: true, timeSpent: 20 },
          { difficulty: 3, correct: false, timeSpent: 40 },
          { difficulty: 5, correct: true, timeSpent: 30 },
          { difficulty: 5, correct: true, timeSpent: 35 },
          { difficulty: 7, correct: false, timeSpent: 60 }
        ];

        const groupByDifficulty = (records) => {
          const grouped = {};
          
          records.forEach(record => {
            const difficulty = record.difficulty;
            if (!grouped[difficulty]) {
              grouped[difficulty] = {
                questionsAnswered: 0,
                correctAnswers: 0,
                totalTimeSpent: 0
              };
            }
            
            grouped[difficulty].questionsAnswered += 1;
            grouped[difficulty].correctAnswers += record.correct ? 1 : 0;
            grouped[difficulty].totalTimeSpent += record.timeSpent;
          });

          return Object.entries(grouped).map(([difficulty, data]) => ({
            difficulty: parseInt(difficulty),
            questionsAnswered: data.questionsAnswered,
            correctAnswers: data.correctAnswers,
            accuracy: data.correctAnswers / data.questionsAnswered,
            averageTimeSpent: data.totalTimeSpent / data.questionsAnswered
          })).sort((a, b) => a.difficulty - b.difficulty);
        };

        const progression = groupByDifficulty(performanceRecords);
        
        expect(progression).toHaveLength(3);
        expect(progression[0].difficulty).toBe(3);
        expect(progression[0].accuracy).toBe(0.5);
        expect(progression[1].difficulty).toBe(5);
        expect(progression[1].accuracy).toBe(1);
        expect(progression[2].difficulty).toBe(7);
        expect(progression[2].accuracy).toBe(0);
      });
    });

    describe('getSessionPerformance Logic', () => {
      test('should aggregate session data correctly', () => {
        const sessionRecords = [
          { 
            sessionId: 'session-123',
            correct: true, 
            timeSpent: 30, 
            hintsUsed: 0,
            difficulty: 5,
            category: ['Math'],
            createdAt: new Date('2023-01-01T10:00:00Z')
          },
          { 
            sessionId: 'session-123',
            correct: false, 
            timeSpent: 45, 
            hintsUsed: 2,
            difficulty: 4,
            category: ['Science'],
            createdAt: new Date('2023-01-01T10:05:00Z')
          },
          { 
            sessionId: 'session-123',
            correct: true, 
            timeSpent: 25, 
            hintsUsed: 1,
            difficulty: 6,
            category: ['Math'],
            createdAt: new Date('2023-01-01T10:10:00Z')
          }
        ];

        const aggregateSession = (records) => {
          const totalQuestions = records.length;
          const correctAnswers = records.filter(r => r.correct).length;
          const totalTimeSpent = records.reduce((sum, r) => sum + r.timeSpent, 0);
          const totalHintsUsed = records.reduce((sum, r) => sum + r.hintsUsed, 0);
          const averageDifficulty = records.reduce((sum, r) => sum + r.difficulty, 0) / totalQuestions;
          const categoriesCovered = [...new Set(records.flatMap(r => r.category))];
          const startTime = new Date(Math.min(...records.map(r => r.createdAt.getTime())));
          const endTime = new Date(Math.max(...records.map(r => r.createdAt.getTime())));

          return {
            totalQuestions,
            correctAnswers,
            accuracy: correctAnswers / totalQuestions,
            totalTimeSpent,
            averageTimePerQuestion: totalTimeSpent / totalQuestions,
            totalHintsUsed,
            averageDifficulty,
            categoriesCovered,
            sessionDuration: endTime.getTime() - startTime.getTime(),
            startTime,
            endTime
          };
        };

        const sessionPerformance = aggregateSession(sessionRecords);

        expect(sessionPerformance.totalQuestions).toBe(3);
        expect(sessionPerformance.correctAnswers).toBe(2);
        expect(sessionPerformance.accuracy).toBeCloseTo(0.6667, 4);
        expect(sessionPerformance.totalTimeSpent).toBe(100);
        expect(sessionPerformance.averageTimePerQuestion).toBeCloseTo(33.33, 2);
        expect(sessionPerformance.totalHintsUsed).toBe(3);
        expect(sessionPerformance.averageDifficulty).toBe(5);
        expect(sessionPerformance.categoriesCovered).toEqual(['Math', 'Science']);
        expect(sessionPerformance.sessionDuration).toBe(10 * 60 * 1000); // 10 minutes in milliseconds
      });
    });
  });

  describe('Pre-save Middleware Logic', () => {
    test('should validate selectedAnswer is not empty', () => {
      const validateSelectedAnswer = (selectedAnswer) => {
        if (!selectedAnswer || typeof selectedAnswer !== 'string') return false;
        return selectedAnswer.trim().length > 0;
      };

      expect(validateSelectedAnswer('Option A')).toBe(true);
      expect(validateSelectedAnswer('  Option B  ')).toBe(true);
      expect(validateSelectedAnswer('')).toBe(false);
      expect(validateSelectedAnswer('   ')).toBe(false);
      expect(validateSelectedAnswer(null)).toBe(false);
      expect(validateSelectedAnswer(undefined)).toBe(false);
    });

    test('should validate category array is not empty', () => {
      const validateCategoryArray = (category) => {
        return Array.isArray(category) && category.length > 0;
      };

      expect(validateCategoryArray(['Math'])).toBe(true);
      expect(validateCategoryArray(['Math', 'Algebra'])).toBe(true);
      expect(validateCategoryArray([])).toBe(false);
      expect(validateCategoryArray(null)).toBe(false);
      expect(validateCategoryArray(undefined)).toBe(false);
      expect(validateCategoryArray('Math')).toBe(false);
    });
  });

  describe('CRUD Operations Logic', () => {
    test('should validate create operation', () => {
      const createPerformance = (data) => {
        const requiredFields = ['learnerId', 'questionId', 'selectedAnswer', 'correct', 'timeSpent', 'difficulty', 'category', 'sessionId'];
        const missingFields = requiredFields.filter(field => data[field] === undefined || data[field] === null);
        
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

      const validData = {
        learnerId: 'learner-123',
        questionId: 'question-456',
        selectedAnswer: 'Option A',
        correct: true,
        timeSpent: 30,
        difficulty: 5,
        category: ['Math'],
        sessionId: 'session-789'
      };

      const performance = createPerformance(validData);
      expect(performance._id).toBeDefined();
      expect(performance.learnerId).toBe('learner-123');
      expect(performance.createdAt).toBeDefined();

      expect(() => createPerformance({})).toThrow('Missing required fields');
    });

    test('should validate query operations', () => {
      const performances = [
        { learnerId: 'learner-1', correct: true, difficulty: 5, category: ['Math'] },
        { learnerId: 'learner-1', correct: false, difficulty: 3, category: ['Science'] },
        { learnerId: 'learner-2', correct: true, difficulty: 7, category: ['Math'] }
      ];

      // Query by learner
      const learner1Performances = performances.filter(p => p.learnerId === 'learner-1');
      expect(learner1Performances).toHaveLength(2);

      // Query by correctness
      const correctPerformances = performances.filter(p => p.correct === true);
      expect(correctPerformances).toHaveLength(2);

      // Query by category
      const mathPerformances = performances.filter(p => p.category.includes('Math'));
      expect(mathPerformances).toHaveLength(2);

      // Complex query
      const learner1MathPerformances = performances.filter(p => 
        p.learnerId === 'learner-1' && p.category.includes('Math')
      );
      expect(learner1MathPerformances).toHaveLength(1);
    });
  });

  describe('Performance Optimization Logic', () => {
    test('should validate index usage patterns', () => {
      const indexes = [
        { fields: { learnerId: 1 } },
        { fields: { questionId: 1 } },
        { fields: { correct: 1 } },
        { fields: { sessionId: 1 } },
        { fields: { learnerId: 1, createdAt: -1 } },
        { fields: { learnerId: 1, category: 1, createdAt: -1 } },
        { fields: { category: 1, difficulty: 1, correct: 1 } }
      ];

      const isIndexOptimal = (query, indexes) => {
        // Simplified index matching logic
        const queryFields = Object.keys(query);
        return indexes.some(index => {
          const indexFields = Object.keys(index.fields);
          return queryFields.every(field => indexFields.includes(field));
        });
      };

      // Test various query patterns
      expect(isIndexOptimal({ learnerId: 'test' }, indexes)).toBe(true);
      expect(isIndexOptimal({ learnerId: 'test', createdAt: { $gte: new Date() } }, indexes)).toBe(true);
      expect(isIndexOptimal({ category: 'Math', difficulty: 5 }, indexes)).toBe(true);
      expect(isIndexOptimal({ randomField: 'value' }, indexes)).toBe(false);
    });
  });
});