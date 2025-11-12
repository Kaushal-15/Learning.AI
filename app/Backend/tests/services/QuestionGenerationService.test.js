/**
 * Unit tests for QuestionGenerationService
 */

const QuestionGenerationService = require('../../services/QuestionGenerationService');

// Mock timers for testing timeout functionality
jest.useFakeTimers();

describe('QuestionGenerationService', () => {
  let service;
  let mockAIClient;

  beforeEach(() => {
    mockAIClient = {
      generateCompletion: jest.fn()
    };
    service = new QuestionGenerationService();
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      expect(service.aiClient).toBeNull();
      expect(service.promptTemplates).toBeDefined();
      expect(service.validationRules).toBeDefined();
    });

    test('should initialize with AI client', () => {
      const serviceWithAI = new QuestionGenerationService(mockAIClient);
      expect(serviceWithAI.aiClient).toBe(mockAIClient);
    });
  });

  describe('generateQuestion', () => {
    const validParams = {
      topic: 'Binary Search',
      category: ['Programming', 'Algorithms'],
      difficulty: 5,
      questionType: 'multiple-choice'
    };

    test('should generate question with valid parameters', async () => {
      const result = await service.generateQuestion(validParams);
      
      expect(result).toHaveProperty('question');
      expect(result).toHaveProperty('options');
      expect(result).toHaveProperty('correctAnswer');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('difficulty');
      expect(result).toHaveProperty('validationScore');
    });

    test('should throw error for missing topic', async () => {
      const invalidParams = { ...validParams, topic: '' };
      await expect(service.generateQuestion(invalidParams)).rejects.toThrow('Topic is required');
    });

    test('should throw error for invalid category', async () => {
      const invalidParams = { ...validParams, category: [] };
      await expect(service.generateQuestion(invalidParams)).rejects.toThrow('Category must be a non-empty array');
    });

    test('should throw error for invalid difficulty', async () => {
      const invalidParams = { ...validParams, difficulty: 15 };
      await expect(service.generateQuestion(invalidParams)).rejects.toThrow('Difficulty must be an integer between 1 and 10');
    });

    test('should throw error for unsupported question type', async () => {
      const invalidParams = { ...validParams, questionType: 'unsupported-type' };
      await expect(service.generateQuestion(invalidParams)).rejects.toThrow('Unsupported question type');
    });

    test('should default to multiple-choice when questionType not specified', async () => {
      const paramsWithoutType = { ...validParams };
      delete paramsWithoutType.questionType;
      
      const result = await service.generateQuestion(paramsWithoutType);
      expect(result.questionType).toBe('multiple-choice');
    });
  });

  describe('Prompt Template Generation', () => {
    test('should build prompt for multiple-choice questions', () => {
      const prompt = service._buildPrompt('JavaScript', ['Programming', 'Web Development'], 6, 'multiple-choice');
      
      expect(prompt).toContain('JavaScript');
      expect(prompt).toContain('Programming > Web Development');
      expect(prompt).toContain('difficulty level 6/10');
      expect(prompt).toContain('multiple-choice question');
    });

    test('should include category-specific instructions for programming', () => {
      const prompt = service._buildPrompt('Arrays', ['Programming', 'Data Structures'], 5, 'multiple-choice');
      
      expect(prompt).toContain('practical coding concepts');
    });

    test('should include category-specific instructions for mathematics', () => {
      const prompt = service._buildPrompt('Calculus', ['Mathematics', 'Derivatives'], 7, 'multiple-choice');
      
      expect(prompt).toContain('mathematical concepts');
    });

    test('should include difficulty adjustments for basic level', () => {
      const prompt = service._buildPrompt('Variables', ['Programming'], 2, 'multiple-choice');
      
      expect(prompt).toContain('Basic - Focus on fundamental concepts');
    });

    test('should include difficulty adjustments for expert level', () => {
      const prompt = service._buildPrompt('Advanced Algorithms', ['Programming'], 9, 'multiple-choice');
      
      expect(prompt).toContain('Expert - Include edge cases');
    });
  });

  describe('Content Validation', () => {
    const validContent = {
      question: "What is the time complexity of binary search?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
      correctAnswer: "O(log n)",
      explanation: "Binary search divides the search space in half with each comparison, resulting in O(log n) time complexity.",
      hints: ["Think about how the search space changes", "Consider the number of comparisons needed"]
    };

    const validParams = {
      topic: 'Binary Search',
      category: ['Programming', 'Algorithms'],
      difficulty: 5,
      questionType: 'multiple-choice'
    };

    test('should validate correct content successfully', () => {
      expect(() => {
        service._validateGeneratedContent(validContent, validParams);
      }).not.toThrow();
    });

    test('should reject content with invalid question', () => {
      const invalidContent = { ...validContent, question: 'x' };
      
      expect(() => {
        service._validateGeneratedContent(invalidContent, validParams);
      }).toThrow('Invalid question format or length');
    });

    test('should reject content with too few options', () => {
      const invalidContent = { ...validContent, options: ['A'] };
      
      expect(() => {
        service._validateGeneratedContent(invalidContent, validParams);
      }).toThrow('Invalid number of options');
    });

    test('should reject content with incorrect answer not in options', () => {
      const invalidContent = { ...validContent, correctAnswer: 'Invalid Answer' };
      
      expect(() => {
        service._validateGeneratedContent(invalidContent, validParams);
      }).toThrow('Correct answer must be one of the provided options');
    });

    test('should reject content with too short explanation', () => {
      const invalidContent = { ...validContent, explanation: 'Short' };
      
      expect(() => {
        service._validateGeneratedContent(invalidContent, validParams);
      }).toThrow('Invalid explanation format or length');
    });

    test('should reject content with too many hints', () => {
      const invalidContent = { 
        ...validContent, 
        hints: ['Hint 1', 'Hint 2', 'Hint 3', 'Hint 4'] 
      };
      
      expect(() => {
        service._validateGeneratedContent(invalidContent, validParams);
      }).toThrow('Too many hints provided');
    });

    test('should accept content without hints', () => {
      const contentWithoutHints = { ...validContent };
      delete contentWithoutHints.hints;
      
      expect(() => {
        service._validateGeneratedContent(contentWithoutHints, validParams);
      }).not.toThrow();
    });
  });

  describe('Field Validation', () => {
    test('should validate required fields correctly', () => {
      const rules = { required: true, minLength: 5 };
      
      expect(service._validateField('Valid text', rules)).toBe(true);
      expect(service._validateField('', rules)).toBe(false);
      expect(service._validateField(null, rules)).toBe(false);
      expect(service._validateField('Hi', rules)).toBe(false);
    });

    test('should validate length constraints', () => {
      const rules = { minLength: 5, maxLength: 10 };
      
      expect(service._validateField('Valid', rules)).toBe(true);
      expect(service._validateField('ValidText', rules)).toBe(true);
      expect(service._validateField('Hi', rules)).toBe(false);
      expect(service._validateField('This is too long', rules)).toBe(false);
    });

    test('should validate pattern matching', () => {
      const rules = { pattern: /^[A-Z].*[?.]$/ };
      
      expect(service._validateField('What is this?', rules)).toBe(true);
      expect(service._validateField('This is a statement.', rules)).toBe(true);
      expect(service._validateField('lowercase start?', rules)).toBe(false);
      expect(service._validateField('No ending punctuation', rules)).toBe(false);
    });
  });

  describe('Category Key Mapping', () => {
    test('should map programming categories correctly', () => {
      expect(service._getCategoryKey(['Programming', 'Algorithms'])).toBe('programming');
      expect(service._getCategoryKey(['Coding', 'JavaScript'])).toBe('programming');
      expect(service._getCategoryKey(['Data Structures', 'Arrays'])).toBe('programming');
    });

    test('should map mathematics categories correctly', () => {
      expect(service._getCategoryKey(['Mathematics', 'Algebra'])).toBe('mathematics');
      expect(service._getCategoryKey(['Math', 'Calculus'])).toBe('mathematics');
      expect(service._getCategoryKey(['Geometry', 'Triangles'])).toBe('mathematics');
    });

    test('should map science categories correctly', () => {
      expect(service._getCategoryKey(['Physics', 'Mechanics'])).toBe('science');
      expect(service._getCategoryKey(['Chemistry', 'Organic'])).toBe('science');
      expect(service._getCategoryKey(['Biology', 'Genetics'])).toBe('science');
    });

    test('should default to general for unknown categories', () => {
      expect(service._getCategoryKey(['History', 'World War'])).toBe('general');
      expect(service._getCategoryKey(['Literature', 'Poetry'])).toBe('general');
    });
  });

  describe('Validation Score Calculation', () => {
    test('should calculate higher scores for quality content', () => {
      const highQualityContent = {
        question: "This is a detailed question that provides sufficient context and information for the learner?",
        options: ["Option A with detail", "Option B with detail", "Option C with detail", "Option D with detail"],
        explanation: "This is a comprehensive explanation that provides detailed reasoning and helps the learner understand the concept thoroughly.",
        hints: ["Helpful hint 1", "Helpful hint 2"]
      };
      
      const score = service._calculateValidationScore(highQualityContent);
      expect(score).toBeGreaterThan(0.8);
    });

    test('should calculate lower scores for minimal content', () => {
      const minimalContent = {
        question: "Short question?",
        options: ["A", "B"],
        explanation: "Short explanation."
      };
      
      const score = service._calculateValidationScore(minimalContent);
      expect(score).toBeLessThan(0.8);
    });

    test('should not exceed maximum score of 1.0', () => {
      const maxContent = {
        question: "This is an extremely detailed and comprehensive question that covers all aspects?",
        options: ["Very detailed option A", "Very detailed option B", "Very detailed option C", "Very detailed option D"],
        explanation: "This is an extremely comprehensive explanation that covers every possible aspect and provides detailed reasoning for the learner.",
        hints: ["Detailed hint 1", "Detailed hint 2", "Detailed hint 3"]
      };
      
      const score = service._calculateValidationScore(maxContent);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Utility Methods', () => {
    test('should return available question types', () => {
      const types = service.getAvailableQuestionTypes();
      expect(types).toContain('multiple-choice');
      expect(types).toContain('true-false');
      expect(Array.isArray(types)).toBe(true);
    });

    test('should return prompt template for valid question type', () => {
      const template = service.getPromptTemplate('multiple-choice');
      expect(template).toBeDefined();
      expect(template).toHaveProperty('base');
      expect(template).toHaveProperty('categories');
    });

    test('should return undefined for invalid question type', () => {
      const template = service.getPromptTemplate('invalid-type');
      expect(template).toBeUndefined();
    });
  });

  describe('AI Integration', () => {
    test('should use fallback questions when no AI client provided', async () => {
      const params = {
        topic: 'Binary Search',
        category: ['Programming'],
        difficulty: 5
      };
      
      const result = await service.generateQuestion(params);
      expect(result.question).toBeDefined();
      expect(result.options).toBeDefined();
      expect(result.correctAnswer).toBeDefined();
      expect(result.explanation).toBeDefined();
    });

    test('should call AI client when provided and healthy', async () => {
      const serviceWithAI = new QuestionGenerationService(mockAIClient);
      serviceWithAI.aiServiceHealthy = true;
      
      const mockResponse = JSON.stringify({
        question: "AI generated question?",
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        explanation: "AI generated explanation with sufficient detail.",
        hints: ["AI hint"]
      });
      
      mockAIClient.generateCompletion.mockResolvedValue(mockResponse);
      mockAIClient.testConnection = jest.fn().mockResolvedValue(true);
      
      const params = {
        topic: 'AI Topic',
        category: ['Programming'],
        difficulty: 5
      };
      
      const result = await serviceWithAI.generateQuestion(params);
      expect(mockAIClient.generateCompletion).toHaveBeenCalled();
      expect(result.question).toBe("AI generated question?");
    });

    test('should fallback to curated questions on AI service errors', async () => {
      const serviceWithAI = new QuestionGenerationService(mockAIClient);
      serviceWithAI.aiServiceHealthy = true;
      
      mockAIClient.generateCompletion.mockRejectedValue(new Error('AI service unavailable'));
      mockAIClient.testConnection = jest.fn().mockResolvedValue(true);
      
      const params = {
        topic: 'Binary Search',
        category: ['Programming'],
        difficulty: 5
      };
      
      const result = await serviceWithAI.generateQuestion(params);
      expect(result.question).toBeDefined();
      expect(result.options).toBeDefined();
      expect(result.correctAnswer).toBeDefined();
      // Should be a fallback question, not the AI generated one
      expect(result.question).not.toBe("AI generated question?");
    });

    test('should handle invalid AI responses', async () => {
      const serviceWithAI = new QuestionGenerationService(mockAIClient);
      serviceWithAI.aiServiceHealthy = true;
      
      const invalidResponse = JSON.stringify({
        question: "Invalid response",
        // Missing required fields
      });
      
      mockAIClient.generateCompletion.mockResolvedValue(invalidResponse);
      mockAIClient.testConnection = jest.fn().mockResolvedValue(true);
      
      const params = {
        topic: 'Test Topic',
        category: ['Programming'],
        difficulty: 5
      };
      
      const result = await serviceWithAI.generateQuestion(params);
      // Should fallback to curated questions
      expect(result.question).toBeDefined();
      expect(result.options).toBeDefined();
      expect(result.correctAnswer).toBeDefined();
    });

    test('should mark AI service as unhealthy on temporary failures', async () => {
      const serviceWithAI = new QuestionGenerationService(mockAIClient);
      serviceWithAI.aiServiceHealthy = true;
      
      const temporaryError = new Error('Rate limit exceeded');
      temporaryError.status = 429;
      
      mockAIClient.generateCompletion.mockRejectedValue(temporaryError);
      mockAIClient.testConnection = jest.fn().mockResolvedValue(true);
      
      const params = {
        topic: 'Test Topic',
        category: ['Programming'],
        difficulty: 5
      };
      
      await serviceWithAI.generateQuestion(params);
      expect(serviceWithAI.aiServiceHealthy).toBe(false);
      
      // Clear any pending timeouts to prevent Jest warnings
      jest.clearAllTimers();
    });

    test('should adjust temperature based on difficulty', () => {
      expect(service._getTemperatureForDifficulty(1)).toBe(0.8);
      expect(service._getTemperatureForDifficulty(4)).toBe(0.7);
      expect(service._getTemperatureForDifficulty(6)).toBe(0.5);
      expect(service._getTemperatureForDifficulty(9)).toBe(0.3);
    });

    test('should validate AI response structure', () => {
      const validResponse = {
        question: "Valid question?",
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        explanation: "Valid explanation"
      };
      
      expect(service._isValidAIResponse(validResponse)).toBe(true);
      
      const invalidResponse = {
        question: "Invalid response",
        // Missing options, correctAnswer, explanation
      };
      
      expect(service._isValidAIResponse(invalidResponse)).toBe(false);
    });

    test('should identify temporary failures correctly', () => {
      const rateLimitError = new Error('Rate limited');
      rateLimitError.status = 429;
      expect(service._isTemporaryFailure(rateLimitError)).toBe(true);

      const serverError = new Error('Server error');
      serverError.status = 500;
      expect(service._isTemporaryFailure(serverError)).toBe(true);

      const timeoutError = new Error('Request timeout');
      expect(service._isTemporaryFailure(timeoutError)).toBe(true);

      const authError = new Error('Unauthorized');
      authError.status = 401;
      expect(service._isTemporaryFailure(authError)).toBe(false);
    });
  });

  describe('Fallback Mechanisms', () => {
    test('should return appropriate fallback question for programming category', () => {
      const params = {
        topic: 'Algorithms',
        category: ['Programming', 'Data Structures'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };
      
      const result = service._getFallbackQuestion(params);
      expect(result.question).toBeDefined();
      expect(result.options).toHaveLength(4);
      expect(result.correctAnswer).toBeDefined();
      expect(result.explanation).toBeDefined();
    });

    test('should return generic fallback when no suitable questions found', () => {
      const params = {
        topic: 'Obscure Topic',
        category: ['Unknown Category'],
        difficulty: 5,
        questionType: 'unsupported-type' // Use unsupported type to force generic fallback
      };
      
      const result = service._getFallbackQuestion(params);
      expect(result.question).toContain('Obscure Topic');
      expect(result.options).toHaveLength(4);
      expect(result.explanation).toContain('fallback question');
    });

    test('should adjust difficulty for generic fallback questions', () => {
      const easyParams = {
        topic: 'Test Topic',
        category: ['Unknown'],
        difficulty: 3,
        questionType: 'multiple-choice'
      };
      
      const hardParams = {
        topic: 'Test Topic',
        category: ['Unknown'],
        difficulty: 8,
        questionType: 'multiple-choice'
      };
      
      const easyResult = service._getGenericFallbackQuestion(easyParams);
      const hardResult = service._getGenericFallbackQuestion(hardParams);
      
      expect(easyResult.correctAnswer).toContain('fundamental concept');
      expect(hardResult.correctAnswer).toContain('advanced technique');
    });
  });

  describe('Service Management', () => {
    test('should initialize AI client correctly', () => {
      service.initializeAI('test-api-key', { model: 'gpt-4' });
      expect(service.aiClient).toBeDefined();
    });

    test('should handle missing API key gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      service.initializeAI(null);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No OpenAI API key'));
      consoleSpy.mockRestore();
    });

    test('should return AI service health status', () => {
      const status = service.getAIServiceStatus();
      expect(status).toHaveProperty('hasClient');
      expect(status).toHaveProperty('isHealthy');
      expect(status).toHaveProperty('lastHealthCheck');
      expect(status).toHaveProperty('fallbackQuestionsAvailable');
    });

    test('should check AI service health', async () => {
      const serviceWithAI = new QuestionGenerationService(mockAIClient);
      mockAIClient.testConnection = jest.fn().mockResolvedValue(true);
      
      const result = await serviceWithAI.checkAIServiceHealth();
      expect(result).toBe(true);
      expect(serviceWithAI.aiServiceHealthy).toBe(true);
      expect(serviceWithAI.lastHealthCheck).toBeDefined();
    });

    test('should return false for health check without AI client', async () => {
      const result = await service.checkAIServiceHealth();
      expect(result).toBe(false);
    });
  });
});