const AssessmentEngine = require('../../services/AssessmentEngine');
const Question = require('../../models/Question');
const Learner = require('../../models/Learner');
const Performance = require('../../models/Performance');
const AdaptiveDifficultyEngine = require('../../services/AdaptiveDifficultyEngine');
const mongoose = require('mongoose');

// Mock the models and services
jest.mock('../../models/Question');
jest.mock('../../models/Learner');
jest.mock('../../models/Performance');
jest.mock('../../services/AdaptiveDifficultyEngine');

describe('AssessmentEngine', () => {
  let assessmentEngine;
  let mockQuestionId;
  let mockLearnerId;
  let mockSessionId;
  let mockQuestion;
  let mockLearner;
  let mockPerformance;

  beforeEach(() => {
    assessmentEngine = new AssessmentEngine();
    mockQuestionId = new mongoose.Types.ObjectId().toString();
    mockLearnerId = new mongoose.Types.ObjectId().toString();
    mockSessionId = 'test-session-123';

    // Mock question data
    mockQuestion = {
      _id: mockQuestionId,
      content: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: '4',
      explanation: 'Two plus two equals four.',
      category: ['Mathematics', 'Arithmetic', 'Addition'],
      difficulty: 3,
      hints: ['Think about basic addition', 'Count on your fingers if needed'],
      updateUsageStats: jest.fn().mockResolvedValue(true)
    };

    // Mock learner data
    mockLearner = {
      _id: mockLearnerId,
      email: 'test@example.com',
      name: 'Test Learner',
      difficultyPreference: 5,
      learningVelocity: 1.0,
      overallAccuracy: 0.75,
      currentStreak: 3,
      longestStreak: 8,
      categoryMastery: new Map([
        ['Mathematics', {
          level: 70,
          confidence: 0.8,
          questionsAnswered: 20,
          averageAccuracy: 0.75
        }]
      ]),
      preferences: {
        hintsEnabled: true,
        explanationsEnabled: true,
        timerEnabled: true
      },
      weakAreas: [],
      updateCategoryMastery: jest.fn().mockResolvedValue(true),
      updateOverallStats: jest.fn().mockResolvedValue(true)
    };

    // Mock performance data
    mockPerformance = {
      _id: new mongoose.Types.ObjectId().toString(),
      learnerId: mockLearnerId,
      questionId: mockQuestionId,
      correct: true,
      timeSpent: 45,
      save: jest.fn().mockResolvedValue(true)
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('processAnswerSubmission', () => {
    let validSubmission;

    beforeEach(() => {
      validSubmission = {
        questionId: mockQuestionId,
        learnerId: mockLearnerId,
        selectedAnswer: '4',
        timeSpent: 45,
        sessionId: mockSessionId,
        hintsUsed: 1,
        confidenceLevel: 4
      };

      Question.findById.mockResolvedValue(mockQuestion);
      Learner.findById.mockResolvedValue(mockLearner);
      Performance.mockImplementation(() => mockPerformance);

      // Mock AdaptiveDifficultyEngine
      const mockDifficultyResult = {
        newDifficulty: 4,
        previousDifficulty: 3,
        adjustment: 1,
        reasoning: 'Good performance',
        confidence: 0.8
      };
      AdaptiveDifficultyEngine.prototype.calculateNextDifficulty = jest.fn()
        .mockResolvedValue(mockDifficultyResult);
    });

    it('should process correct answer submission successfully', async () => {
      const result = await assessmentEngine.processAnswerSubmission(validSubmission);

      expect(result).toHaveProperty('correct', true);
      expect(result).toHaveProperty('feedback');
      expect(result).toHaveProperty('performanceId');
      expect(result).toHaveProperty('difficultyAdjustment');
      expect(result).toHaveProperty('learnerProgress');
      expect(result).toHaveProperty('recommendations');

      expect(Question.findById).toHaveBeenCalledWith(mockQuestionId);
      expect(Learner.findById).toHaveBeenCalledWith(mockLearnerId);
      expect(mockLearner.updateCategoryMastery).toHaveBeenCalled();
      expect(mockLearner.updateOverallStats).toHaveBeenCalled();
      expect(mockQuestion.updateUsageStats).toHaveBeenCalled();
    });

    it('should process incorrect answer submission successfully', async () => {
      const incorrectSubmission = { ...validSubmission, selectedAnswer: '5' };

      const result = await assessmentEngine.processAnswerSubmission(incorrectSubmission);

      expect(result.correct).toBe(false);
      expect(result.feedback).toHaveProperty('relatedConcepts');
      expect(result.feedback).toHaveProperty('commonMistakes');
      expect(result.feedback.nextSteps).toContain('Review the explanation carefully');
    });

    it('should throw error for missing question', async () => {
      Question.findById.mockResolvedValue(null);

      await expect(assessmentEngine.processAnswerSubmission(validSubmission))
        .rejects.toThrow('Question not found');
    });

    it('should throw error for missing learner', async () => {
      Learner.findById.mockResolvedValue(null);

      await expect(assessmentEngine.processAnswerSubmission(validSubmission))
        .rejects.toThrow('Learner not found');
    });

    it('should validate submission data', async () => {
      const invalidSubmission = { ...validSubmission };
      delete invalidSubmission.questionId;

      await expect(assessmentEngine.processAnswerSubmission(invalidSubmission))
        .rejects.toThrow('Missing required field: questionId');
    });
  });

  describe('generateFeedback', () => {
    const submission = {
      selectedAnswer: '4',
      timeSpent: 45,
      hintsUsed: 1
    };

    it('should generate comprehensive feedback for correct answer', async () => {
      const feedback = await assessmentEngine.generateFeedback(
        mockQuestion,
        submission,
        true,
        mockLearner
      );

      expect(feedback).toHaveProperty('correct', true);
      expect(feedback).toHaveProperty('selectedAnswer', '4');
      expect(feedback).toHaveProperty('correctAnswer', '4');
      expect(feedback).toHaveProperty('explanation');
      expect(feedback).toHaveProperty('message');
      expect(feedback).toHaveProperty('performanceContext');
      expect(feedback).toHaveProperty('encouragement');
      expect(feedback).toHaveProperty('nextSteps');
    });

    it('should generate feedback with related concepts for incorrect answer', async () => {
      const feedback = await assessmentEngine.generateFeedback(
        mockQuestion,
        { ...submission, selectedAnswer: '5' },
        false,
        mockLearner
      );

      expect(feedback.correct).toBe(false);
      expect(feedback).toHaveProperty('relatedConcepts');
      expect(feedback).toHaveProperty('commonMistakes');
      expect(feedback.relatedConcepts).toContain('Mathematics');
    });

    it('should generate appropriate encouragement based on streak', async () => {
      const highStreakLearner = {
        ...mockLearner,
        currentStreak: 6,
        overallAccuracy: 0.95
      };

      const feedback = await assessmentEngine.generateFeedback(
        mockQuestion,
        submission,
        true,
        highStreakLearner
      );

      expect(feedback.encouragement).toContain('6-question streak');
    });
  });

  describe('generateHint', () => {
    beforeEach(() => {
      Question.findById.mockResolvedValue(mockQuestion);
      Learner.findById.mockResolvedValue(mockLearner);
    });

    it('should generate first hint successfully', async () => {
      const result = await assessmentEngine.generateHint(mockQuestionId, mockLearnerId, 0);

      expect(result).toHaveProperty('available', true);
      expect(result).toHaveProperty('hint');
      expect(result).toHaveProperty('hintLevel', 1);
      expect(result).toHaveProperty('maxHints');
      expect(result.hint).toBe('Think about basic addition');
    });

    it('should generate second hint', async () => {
      const result = await assessmentEngine.generateHint(mockQuestionId, mockLearnerId, 1);

      expect(result.available).toBe(true);
      expect(result.hintLevel).toBe(2);
      expect(result.hint).toBe('Count on your fingers if needed');
    });

    it('should return unavailable when max hints reached', async () => {
      const result = await assessmentEngine.generateHint(mockQuestionId, mockLearnerId, 3);

      expect(result.available).toBe(false);
      expect(result.message).toContain('Maximum hints reached');
    });

    it('should return unavailable when hints are disabled', async () => {
      const learnerWithDisabledHints = {
        ...mockLearner,
        preferences: { ...mockLearner.preferences, hintsEnabled: false }
      };
      Learner.findById.mockResolvedValue(learnerWithDisabledHints);

      const result = await assessmentEngine.generateHint(mockQuestionId, mockLearnerId, 0);

      expect(result.available).toBe(false);
      expect(result.message).toContain('Hints are disabled');
    });

    it('should generate dynamic hint when predefined hints are not available', async () => {
      const questionWithoutHints = { ...mockQuestion, hints: [] };
      Question.findById.mockResolvedValue(questionWithoutHints);

      const result = await assessmentEngine.generateHint(mockQuestionId, mockLearnerId, 0);

      expect(result.available).toBe(true);
      expect(result.hint).toContain('key concepts');
    });
  });

  describe('evaluateAnswer', () => {
    it('should correctly evaluate correct answer', () => {
      const result = assessmentEngine.evaluateAnswer(mockQuestion, '4');
      expect(result).toBe(true);
    });

    it('should correctly evaluate incorrect answer', () => {
      const result = assessmentEngine.evaluateAnswer(mockQuestion, '5');
      expect(result).toBe(false);
    });

    it('should handle case-insensitive comparison', () => {
      const questionWithTextAnswer = {
        ...mockQuestion,
        correctAnswer: 'Paris',
        options: ['London', 'Paris', 'Berlin', 'Madrid']
      };

      const result = assessmentEngine.evaluateAnswer(questionWithTextAnswer, 'paris');
      expect(result).toBe(true);
    });

    it('should handle whitespace in answers', () => {
      const result = assessmentEngine.evaluateAnswer(mockQuestion, ' 4 ');
      expect(result).toBe(true);
    });
  });

  describe('recordPerformance', () => {
    let submission;

    it('should record performance data correctly', async () => {
      submission = {
        learnerId: mockLearnerId,
        questionId: mockQuestionId,
        selectedAnswer: '4',
        timeSpent: 45,
        hintsUsed: 1,
        sessionId: mockSessionId,
        confidenceLevel: 4
      };

      Performance.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue({ _id: 'performance-id', ...data })
      }));

      const result = await assessmentEngine.recordPerformance(submission, mockQuestion, true);

      expect(Performance).toHaveBeenCalledWith({
        learnerId: mockLearnerId,
        questionId: mockQuestionId,
        selectedAnswer: '4',
        correct: true,
        timeSpent: 45,
        hintsUsed: 1,
        difficulty: 3,
        category: ['Mathematics', 'Arithmetic', 'Addition'],
        sessionId: mockSessionId,
        confidenceLevel: 4,
        deviceType: 'desktop',
        metadata: {}
      });
    });
  });

  describe('validateSubmission', () => {
    let validSubmission;

    it('should pass validation for valid submission', () => {
      validSubmission = {
        questionId: mockQuestionId,
        learnerId: mockLearnerId,
        selectedAnswer: '4',
        timeSpent: 45,
        sessionId: mockSessionId
      };
      expect(() => assessmentEngine.validateSubmission(validSubmission)).not.toThrow();
    });

    it('should throw error for missing required fields', () => {
      validSubmission = {
        questionId: mockQuestionId,
        learnerId: mockLearnerId,
        selectedAnswer: '4',
        timeSpent: 45,
        sessionId: mockSessionId
      };
      const invalidSubmission = { ...validSubmission };
      delete invalidSubmission.questionId;

      expect(() => assessmentEngine.validateSubmission(invalidSubmission))
        .toThrow('Missing required field: questionId');
    });

    it('should throw error for invalid timeSpent', () => {
      validSubmission = {
        questionId: mockQuestionId,
        learnerId: mockLearnerId,
        selectedAnswer: '4',
        timeSpent: 45,
        sessionId: mockSessionId
      };
      const invalidSubmission = { ...validSubmission, timeSpent: -5 };

      expect(() => assessmentEngine.validateSubmission(invalidSubmission))
        .toThrow('Invalid timeSpent value');
    });

    it('should throw error for invalid hintsUsed', () => {
      validSubmission = {
        questionId: mockQuestionId,
        learnerId: mockLearnerId,
        selectedAnswer: '4',
        timeSpent: 45,
        sessionId: mockSessionId
      };
      const invalidSubmission = { ...validSubmission, hintsUsed: -1 };

      expect(() => assessmentEngine.validateSubmission(invalidSubmission))
        .toThrow('Invalid hintsUsed value');
    });

    it('should throw error for invalid confidenceLevel', () => {
      validSubmission = {
        questionId: mockQuestionId,
        learnerId: mockLearnerId,
        selectedAnswer: '4',
        timeSpent: 45,
        sessionId: mockSessionId
      };
      const invalidSubmission = { ...validSubmission, confidenceLevel: 6 };

      expect(() => assessmentEngine.validateSubmission(invalidSubmission))
        .toThrow('Invalid confidenceLevel value');
    });
  });

  describe('generatePersonalizedMessage', () => {
    it('should generate excellent message for fast correct answer without hints', () => {
      const message = assessmentEngine.generatePersonalizedMessage(true, 25, 0, mockLearner);
      expect(message).toContain('Excellent! You answered quickly and confidently.');
    });

    it('should generate correct message for correct answer with hints', () => {
      const message = assessmentEngine.generatePersonalizedMessage(true, 45, 2, mockLearner);
      expect(message).toContain('The hints helped guide you');
    });

    it('should generate appropriate message for incorrect answer with hints', () => {
      const message = assessmentEngine.generatePersonalizedMessage(false, 45, 2, mockLearner);
      expect(message).toContain('Not quite right, even with the hints');
    });

    it('should generate message for slow incorrect answer', () => {
      const message = assessmentEngine.generatePersonalizedMessage(false, 150, 0, mockLearner);
      expect(message).toContain('Take your time to review');
    });
  });

  describe('generatePerformanceContext', () => {
    it('should categorize fast answer correctly', () => {
      const context = assessmentEngine.generatePerformanceContext(25, 0, 5);
      expect(context.timeCategory).toBe('fast');
      expect(context.timeMessage).toContain('quickly');
    });

    it('should categorize slow answer correctly', () => {
      const context = assessmentEngine.generatePerformanceContext(150, 0, 5);
      expect(context.timeCategory).toBe('slow');
      expect(context.timeMessage).toContain('took your time');
    });

    it('should categorize hint usage correctly', () => {
      const context = assessmentEngine.generatePerformanceContext(45, 3, 5);
      expect(context.hintUsage).toBe('heavy');
      expect(context.hintMessage).toContain('relied on several hints');
    });

    it('should categorize difficulty level correctly', () => {
      const beginnerContext = assessmentEngine.generatePerformanceContext(45, 0, 2);
      expect(beginnerContext.difficultyLevel).toBe('beginner');

      const advancedContext = assessmentEngine.generatePerformanceContext(45, 0, 8);
      expect(advancedContext.difficultyLevel).toBe('advanced');
    });
  });

  describe('generateEncouragement', () => {
    it('should generate streak encouragement for high streak', () => {
      const highStreakLearner = { ...mockLearner, currentStreak: 7 };
      const encouragement = assessmentEngine.generateEncouragement(true, highStreakLearner, mockQuestion);
      expect(encouragement).toContain('7-question streak');
    });

    it('should generate excellence encouragement for high accuracy', () => {
      const highAccuracyLearner = { ...mockLearner, overallAccuracy: 0.95, currentStreak: 2 };
      const encouragement = assessmentEngine.generateEncouragement(true, highAccuracyLearner, mockQuestion);
      expect(encouragement).toContain('excellent work');
    });

    it('should generate supportive message for struggling learner', () => {
      const strugglingLearner = { ...mockLearner, currentStreak: -4 };
      const encouragement = assessmentEngine.generateEncouragement(false, strugglingLearner, mockQuestion);
      expect(encouragement).toContain('everyone learns at their own pace');
    });

    it('should acknowledge difficulty for hard questions', () => {
      const hardQuestion = { ...mockQuestion, difficulty: 9 };
      const encouragement = assessmentEngine.generateEncouragement(false, mockLearner, hardQuestion);
      expect(encouragement).toContain('challenging question');
    });
  });

  describe('generateRecommendations', () => {
    it('should generate review recommendation for incorrect answer', async () => {
      const recommendations = await assessmentEngine.generateRecommendations(mockLearner, mockQuestion, false);

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].type).toBe('review');
      expect(recommendations[0].priority).toBe('high');
    });

    it('should generate practice recommendation for weak areas', async () => {
      const weakLearner = {
        ...mockLearner,
        weakAreas: ['Mathematics']
      };

      const recommendations = await assessmentEngine.generateRecommendations(weakLearner, mockQuestion, false);

      expect(recommendations).toHaveLength(2);
      expect(recommendations.some(r => r.type === 'practice')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      Question.findById.mockRejectedValue(new Error('Database error'));

      const validSubmission = {
        questionId: mockQuestionId,
        learnerId: mockLearnerId,
        selectedAnswer: '4',
        timeSpent: 45,
        sessionId: mockSessionId
      };

      await expect(assessmentEngine.processAnswerSubmission(validSubmission))
        .rejects.toThrow('Failed to process answer submission: Database error');
    });

    it('should handle hint generation errors', async () => {
      Question.findById.mockRejectedValue(new Error('Question not found'));

      await expect(assessmentEngine.generateHint(mockQuestionId, mockLearnerId, 0))
        .rejects.toThrow('Failed to generate hint: Question not found');
    });
  });
});