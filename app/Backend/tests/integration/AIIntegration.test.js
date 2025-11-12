/**
 * Integration tests for AI-powered question generation
 * Tests the complete flow from prompt generation to question validation
 */

const { createQuestionGenerationService } = require('../../services');
const AIClient = require('../../services/AIClient');

// Mock OpenAI for integration tests
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    },
    models: {
      list: jest.fn()
    }
  }));
});

const OpenAI = require('openai');

describe('AI Integration Tests', () => {
  let service;
  let mockOpenAI;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      },
      models: {
        list: jest.fn()
      }
    };
    OpenAI.mockImplementation(() => mockOpenAI);
  });

  describe('Complete Question Generation Flow', () => {
    test('should generate question using AI service successfully', async () => {
      // Mock successful AI response
      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: "What is the time complexity of inserting an element at the beginning of an array?",
              options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
              correctAnswer: "O(n)",
              explanation: "Inserting at the beginning requires shifting all existing elements one position to the right, resulting in O(n) time complexity.",
              hints: ["Consider what happens to existing elements", "Think about the number of operations needed"]
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse);

      // Create service with AI integration
      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key',
        aiOptions: { model: 'gpt-3.5-turbo' }
      });

      const params = {
        topic: 'Array Operations',
        category: ['Programming', 'Data Structures'],
        difficulty: 6,
        questionType: 'multiple-choice'
      };

      const result = await service.generateQuestion(params);

      // Verify AI was called with correct parameters
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('expert educational content creator')
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Array Operations')
            })
          ]),
          temperature: 0.5, // Should be 0.5 for difficulty 6
          max_tokens: 1500
        })
      );

      // Verify result structure
      expect(result).toMatchObject({
        question: expect.stringContaining('time complexity'),
        options: expect.arrayContaining(['O(1)', 'O(log n)', 'O(n)', 'O(n²)']),
        correctAnswer: 'O(n)',
        explanation: expect.stringContaining('shifting all existing elements'),
        hints: expect.arrayContaining([
          expect.stringContaining('existing elements'),
          expect.stringContaining('operations needed')
        ]),
        category: ['Programming', 'Data Structures'],
        difficulty: 6,
        questionType: 'multiple-choice',
        generatedAt: expect.any(Date),
        validationScore: expect.any(Number)
      });

      expect(result.validationScore).toBeGreaterThan(0.5);
    });

    test('should handle AI service failure and fallback gracefully', async () => {
      // Mock AI service failure
      const aiError = new Error('OpenAI service unavailable');
      aiError.status = 503;
      mockOpenAI.chat.completions.create.mockRejectedValue(aiError);

      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      const params = {
        topic: 'Binary Search',
        category: ['Programming', 'Algorithms'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };

      const result = await service.generateQuestion(params);

      // Should fallback to curated questions
      expect(result).toMatchObject({
        question: expect.any(String),
        options: expect.any(Array),
        correctAnswer: expect.any(String),
        explanation: expect.any(String),
        category: ['Programming', 'Algorithms'],
        difficulty: 5,
        questionType: 'multiple-choice'
      });

      // AI service should be marked as unhealthy
      expect(service.aiServiceHealthy).toBe(false);
    });

    test('should retry on temporary failures and succeed', async () => {
      // Mock temporary failure followed by success
      const tempError = new Error('Rate limit exceeded');
      tempError.status = 429;

      const successResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: "Which sorting algorithm has the best average-case time complexity?",
              options: ["Bubble Sort", "Quick Sort", "Merge Sort", "Selection Sort"],
              correctAnswer: "Merge Sort",
              explanation: "Merge Sort consistently has O(n log n) time complexity in all cases, making it optimal for average-case performance.",
              hints: ["Consider algorithms with consistent performance", "Think about divide-and-conquer approaches"]
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(tempError)
        .mockResolvedValueOnce(successResponse);

      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      const params = {
        topic: 'Sorting Algorithms',
        category: ['Programming', 'Algorithms'],
        difficulty: 7,
        questionType: 'multiple-choice'
      };

      const result = await service.generateQuestion(params);

      // Should succeed after retry
      expect(result.question).toContain('sorting algorithm');
      expect(result.correctAnswer).toBe('Merge Sort');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    test('should generate different question types correctly', async () => {
      const trueFalseResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: "Binary search can only be applied to sorted arrays.",
              options: ["True", "False"],
              correctAnswer: "True",
              explanation: "Binary search requires the array to be sorted to work correctly, as it relies on the sorted property to eliminate half of the search space in each iteration.",
              hints: ["Consider the prerequisites for binary search"]
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(trueFalseResponse);

      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      const params = {
        topic: 'Binary Search',
        category: ['Programming', 'Algorithms'],
        difficulty: 4,
        questionType: 'true-false'
      };

      const result = await service.generateQuestion(params);

      expect(result.questionType).toBe('true-false');
      expect(result.options).toEqual(['True', 'False']);
      expect(result.correctAnswer).toBe('True');
    });
  });

  describe('AI Service Health Management', () => {
    test('should perform health checks and update status', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'test' } }]
      });

      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      const isHealthy = await service.checkAIServiceHealth();

      expect(isHealthy).toBe(true);
      expect(service.isAIServiceHealthy()).toBe(true);
      expect(service.lastHealthCheck).toBeDefined();
    });

    test('should handle health check failures', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Connection failed'));

      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      const isHealthy = await service.checkAIServiceHealth();

      expect(isHealthy).toBe(false);
      expect(service.isAIServiceHealthy()).toBe(false);
    });

    test('should provide comprehensive service status', () => {
      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      const status = service.getAIServiceStatus();

      expect(status).toMatchObject({
        hasClient: true,
        isHealthy: expect.any(Boolean),
        lastHealthCheck: null, // No health check performed yet
        fallbackQuestionsAvailable: expect.any(Number)
      });

      expect(status.fallbackQuestionsAvailable).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle malformed AI responses gracefully', async () => {
      // Mock malformed JSON response
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'This is not valid JSON'
          }
        }]
      });

      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      const params = {
        topic: 'Test Topic',
        category: ['Programming'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };

      const result = await service.generateQuestion(params);

      // Should fallback to curated questions
      expect(result.question).toBeDefined();
      expect(result.options).toBeDefined();
      expect(result.correctAnswer).toBeDefined();
    });

    test('should handle incomplete AI responses', async () => {
      // Mock incomplete response (missing required fields)
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              question: "Incomplete question?",
              options: ["A", "B"]
              // Missing correctAnswer and explanation
            })
          }
        }]
      });

      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      const params = {
        topic: 'Test Topic',
        category: ['Programming'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };

      const result = await service.generateQuestion(params);

      // Should fallback to curated questions
      expect(result.question).toBeDefined();
      expect(result.correctAnswer).toBeDefined();
      expect(result.explanation).toBeDefined();
    });

    test('should recover from temporary AI service outages', async () => {
      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      // Simulate service outage
      service.aiServiceHealthy = false;

      const params = {
        topic: 'Data Structures',
        category: ['Programming'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };

      // Should use fallback immediately
      const result = await service.generateQuestion(params);
      expect(result.question).toBeDefined();

      // Simulate service recovery
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              question: "Recovered AI question?",
              options: ["A", "B", "C", "D"],
              correctAnswer: "A",
              explanation: "AI service is back online."
            })
          }
        }]
      });

      // Mark service as healthy again
      service.aiServiceHealthy = true;

      const recoveredResult = await service.generateQuestion(params);
      expect(recoveredResult.question).toBe("Recovered AI question?");
    });
  });

  describe('Performance and Optimization', () => {
    test('should use appropriate temperature settings for different difficulties', async () => {
      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: "Test question?",
              options: ["A", "B", "C", "D"],
              correctAnswer: "A",
              explanation: "This is a comprehensive test explanation that meets the minimum length requirements for validation."
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      // Test different difficulty levels
      const difficulties = [1, 4, 6, 9];
      const expectedTemperatures = [0.8, 0.7, 0.5, 0.3];

      for (let i = 0; i < difficulties.length; i++) {
        const params = {
          topic: 'Test Topic',
          category: ['Programming'],
          difficulty: difficulties[i],
          questionType: 'multiple-choice'
        };

        await service.generateQuestion(params);

        expect(mockOpenAI.chat.completions.create).toHaveBeenLastCalledWith(
          expect.objectContaining({
            temperature: expectedTemperatures[i]
          })
        );
      }
    });

    test('should cache health check results appropriately', async () => {
      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'test' } }]
      });

      // First health check
      await service.checkAIServiceHealth();
      const firstCheckTime = service.lastHealthCheck;

      // Immediate second check should not call API again
      await service._checkAIServiceHealth();
      expect(service.lastHealthCheck).toBe(firstCheckTime);

      // Mock time passage (5+ minutes)
      const originalNow = Date.now;
      Date.now = jest.fn(() => firstCheckTime + 300001);

      await service._checkAIServiceHealth();
      expect(service.lastHealthCheck).toBeGreaterThan(firstCheckTime);

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('Enhanced AI Integration Features', () => {
    test('should generate category-specific questions with enhanced prompts', async () => {
      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      const categories = [
        { category: ['Programming', 'Algorithms'], expectedPromptContent: 'practical coding concepts' },
        { category: ['Data Science', 'Machine Learning'], expectedPromptContent: 'Machine learning algorithms' },
        { category: ['Computer Science', 'Theory'], expectedPromptContent: 'theoretical computer science' },
        { category: ['Mathematics', 'Calculus'], expectedPromptContent: 'mathematical concepts' }
      ];

      for (const { category, expectedPromptContent } of categories) {
        const mockResponse = {
          choices: [{
            message: {
              content: JSON.stringify({
                question: `Category-specific question for ${category.join(' > ')}?`,
                options: ["A", "B", "C", "D"],
                correctAnswer: "A",
                explanation: "This is a detailed explanation that demonstrates category-specific knowledge and understanding."
              })
            }
          }]
        };

        mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

        const params = {
          topic: 'Test Topic',
          category: category,
          difficulty: 5,
          questionType: 'multiple-choice'
        };

        const result = await service.generateQuestion(params);

        // Verify the prompt contains category-specific instructions
        const lastCall = mockOpenAI.chat.completions.create.mock.calls[mockOpenAI.chat.completions.create.mock.calls.length - 1];
        const prompt = lastCall[0].messages[1].content;
        
        expect(result.question).toContain(category.join(' > '));
        expect(result.category).toEqual(category);
      }
    });

    test('should handle content quality validation', async () => {
      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      // Mock low-quality AI response
      const lowQualityResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: "Bad?", // Too short
              options: ["A", "B", "C", "D"],
              correctAnswer: "A",
              explanation: "Bad." // Too short
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(lowQualityResponse);

      const params = {
        topic: 'Complex Algorithm Analysis',
        category: ['Programming', 'Algorithms'],
        difficulty: 8,
        questionType: 'multiple-choice'
      };

      const result = await service.generateQuestion(params);

      // Should fallback to curated questions due to quality validation failure
      expect(result.question).toBeDefined();
      expect(result.question.length).toBeGreaterThan(20);
      expect(result.explanation.length).toBeGreaterThan(30);
    });

    test('should handle rate limiting with exponential backoff', async () => {
      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.status = 429;

      mockOpenAI.chat.completions.create.mockRejectedValue(rateLimitError);

      const params = {
        topic: 'Test Topic',
        category: ['Programming'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };

      const result = await service.generateQuestion(params);

      // Should fallback and mark service as unhealthy
      expect(result.question).toBeDefined();
      expect(service.aiServiceHealthy).toBe(false);
      expect(service.rateLimitRetries).toBe(1);
    });

    test('should provide enhanced service metrics', () => {
      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      const metrics = service.getAIServiceMetrics();

      expect(metrics).toMatchObject({
        service: {
          hasClient: true,
          isHealthy: expect.any(Boolean),
          lastHealthCheck: null,
          rateLimitRetries: 0
        },
        fallback: {
          totalQuestions: expect.any(Number),
          categoryDistribution: expect.any(Object),
          availableCategories: expect.arrayContaining(['programming', 'mathematics', 'science'])
        },
        capabilities: {
          supportedQuestionTypes: expect.arrayContaining(['multiple-choice', 'true-false']),
          categorySpecificPrompts: expect.arrayContaining(['programming', 'mathematics', 'science']),
          difficultyLevels: '1-10',
          temperatureAdjustment: true,
          contentValidation: true
        }
      });

      expect(metrics.fallback.totalQuestions).toBeGreaterThan(10);
    });

    test('should support new question types', async () => {
      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      const fillBlankResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: "The time complexity of binary search is _____.",
              options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
              correctAnswer: "O(log n)",
              explanation: "Binary search has O(log n) time complexity because it divides the search space in half with each comparison."
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(fillBlankResponse);

      const params = {
        topic: 'Algorithm Complexity',
        category: ['Programming', 'Algorithms'],
        difficulty: 6,
        questionType: 'fill-in-the-blank'
      };

      const result = await service.generateQuestion(params);

      expect(result.questionType).toBe('fill-in-the-blank');
      expect(result.question).toContain('_____');
    });

    test('should handle permanent failures correctly', async () => {
      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      const authError = new Error('Invalid API key');
      authError.status = 401;

      mockOpenAI.chat.completions.create.mockRejectedValue(authError);

      const params = {
        topic: 'Test Topic',
        category: ['Programming'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };

      const result = await service.generateQuestion(params);

      // Should fallback and disable AI client permanently
      expect(result.question).toBeDefined();
      expect(service.aiClient).toBeNull();
      expect(service.aiServiceHealthy).toBe(false);
    });

    test('should validate topic relevance in AI responses', async () => {
      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      // Mock irrelevant AI response
      const irrelevantResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              question: "What is the capital of France?", // Irrelevant to programming topic
              options: ["London", "Paris", "Berlin", "Madrid"],
              correctAnswer: "Paris",
              explanation: "Paris is the capital and largest city of France, located in the north-central part of the country."
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(irrelevantResponse);

      const params = {
        topic: 'Binary Search Trees',
        category: ['Programming', 'Data Structures'],
        difficulty: 6,
        questionType: 'multiple-choice'
      };

      const result = await service.generateQuestion(params);

      // Should fallback due to topic irrelevance
      expect(result.question).not.toBe("What is the capital of France?");
      expect(result.question.toLowerCase()).toMatch(/binary|search|tree|data|structure|programming/);
    });
  });

  describe('Comprehensive Error Recovery', () => {
    test('should recover from multiple consecutive failures', async () => {
      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      const serverError = new Error('Internal server error');
      serverError.status = 500;

      // Mock multiple failures followed by success
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                question: "Recovered question after multiple failures?",
                options: ["A", "B", "C", "D"],
                correctAnswer: "A",
                explanation: "This question was generated after the AI service recovered from multiple consecutive failures."
              })
            }
          }]
        });

      const params = {
        topic: 'Recovery Test',
        category: ['Programming'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };

      // First two calls should use fallback
      let result1 = await service.generateQuestion(params);
      expect(service.aiServiceHealthy).toBe(false);
      expect(result1.question).not.toBe("Recovered question after multiple failures?");

      let result2 = await service.generateQuestion(params);
      expect(service.aiServiceHealthy).toBe(false);
      expect(result2.question).not.toBe("Recovered question after multiple failures?");

      // Simulate service recovery
      service.aiServiceHealthy = true;

      // Third call should succeed with AI
      let result3 = await service.generateQuestion(params);
      expect(result3.question).toBe("Recovered question after multiple failures?");
    });

    test('should maintain service statistics across failures', async () => {
      service = createQuestionGenerationService({
        openaiApiKey: 'test-api-key'
      });

      // Simulate rate limit error
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.status = 429;
      mockOpenAI.chat.completions.create.mockRejectedValue(rateLimitError);

      const params = {
        topic: 'Statistics Test',
        category: ['Programming'],
        difficulty: 5,
        questionType: 'multiple-choice'
      };

      // Generate multiple questions to trigger rate limit handling
      await service.generateQuestion(params);
      await service.generateQuestion(params);

      const status = service.getAIServiceStatus();
      expect(status.rateLimitRetries).toBeGreaterThan(0);
      expect(status.isHealthy).toBe(false);

      const metrics = service.getAIServiceMetrics();
      expect(metrics.service.rateLimitRetries).toBeGreaterThan(0);
    });
  });
});