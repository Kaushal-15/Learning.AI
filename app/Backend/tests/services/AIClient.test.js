/**
 * Integration tests for AIClient
 */

const AIClient = require('../../services/AIClient');

// Mock OpenAI module
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

describe('AIClient', () => {
  let aiClient;
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

  describe('Constructor', () => {
    test('should initialize with API key', () => {
      aiClient = new AIClient('test-api-key');
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        timeout: 30000
      });
    });

    test('should throw error without API key', () => {
      expect(() => new AIClient()).toThrow('OpenAI API key is required');
    });

    test('should accept custom options', () => {
      const options = {
        model: 'gpt-4',
        timeout: 60000,
        maxRetries: 5
      };
      
      aiClient = new AIClient('test-api-key', options);
      
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        timeout: 60000
      });
      expect(aiClient.defaultModel).toBe('gpt-4');
      expect(aiClient.maxRetries).toBe(5);
    });
  });

  describe('generateCompletion', () => {
    beforeEach(() => {
      aiClient = new AIClient('test-api-key');
    });

    test('should generate completion successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"question": "Test question?", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "explanation": "Test explanation"}'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await aiClient.generateCompletion('Test prompt');
      
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('expert educational content creator')
          },
          {
            role: 'user',
            content: 'Test prompt'
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });
      
      expect(result).toBe(mockResponse.choices[0].message.content);
    });

    test('should handle custom options', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '{"test": "response"}'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      const options = {
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 2000
      };
      
      await aiClient.generateCompletion('Test prompt', options);
      
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          temperature: 0.5,
          max_tokens: 2000
        })
      );
    });

    test('should throw error for invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      await expect(aiClient.generateCompletion('Test prompt'))
        .rejects.toThrow('Invalid JSON response from OpenAI');
    });

    test('should throw error for empty response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: null
          }
        }]
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      await expect(aiClient.generateCompletion('Test prompt'))
        .rejects.toThrow('Empty content returned from OpenAI');
    });

    test('should throw error for no choices', async () => {
      const mockResponse = {
        choices: []
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      
      await expect(aiClient.generateCompletion('Test prompt'))
        .rejects.toThrow('No completion choices returned from OpenAI');
    });

    test('should retry on temporary failures', async () => {
      const error = new Error('Rate limit exceeded');
      error.status = 429;
      
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({
          choices: [{
            message: {
              content: '{"success": true}'
            }
          }]
        });
      
      const result = await aiClient.generateCompletion('Test prompt');
      
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
      expect(result).toBe('{"success": true}');
    });

    test('should not retry on authentication errors', async () => {
      const error = new Error('Invalid API key');
      error.status = 401;
      
      mockOpenAI.chat.completions.create.mockRejectedValue(error);
      
      await expect(aiClient.generateCompletion('Test prompt'))
        .rejects.toThrow('OpenAI API error: Invalid API key');
      
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    test('should fail after max retries', async () => {
      const error = new Error('Server error');
      error.status = 500;
      
      mockOpenAI.chat.completions.create.mockRejectedValue(error);
      
      await expect(aiClient.generateCompletion('Test prompt'))
        .rejects.toThrow('OpenAI API failed after 3 attempts');
      
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('testConnection', () => {
    beforeEach(() => {
      aiClient = new AIClient('test-api-key');
    });

    test('should return true for successful connection', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'test' } }]
      });
      
      const result = await aiClient.testConnection();
      
      expect(result).toBe(true);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 10
      });
    });

    test('should return false for failed connection', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Connection failed'));
      
      const result = await aiClient.testConnection();
      
      expect(result).toBe(false);
    });

    test('should return false for empty response', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: []
      });
      
      const result = await aiClient.testConnection();
      
      expect(result).toBe(false);
    });
  });

  describe('getAvailableModels', () => {
    beforeEach(() => {
      aiClient = new AIClient('test-api-key');
    });

    test('should return list of model IDs', async () => {
      const mockModels = {
        data: [
          { id: 'gpt-3.5-turbo' },
          { id: 'gpt-4' },
          { id: 'text-davinci-003' }
        ]
      };
      
      mockOpenAI.models.list.mockResolvedValue(mockModels);
      
      const result = await aiClient.getAvailableModels();
      
      expect(result).toEqual(['gpt-3.5-turbo', 'gpt-4', 'text-davinci-003']);
    });

    test('should return empty array on error', async () => {
      mockOpenAI.models.list.mockRejectedValue(new Error('API error'));
      
      const result = await aiClient.getAvailableModels();
      
      expect(result).toEqual([]);
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      aiClient = new AIClient('test-api-key');
    });

    test('should identify non-retryable errors correctly', () => {
      const authError = new Error('Unauthorized');
      authError.status = 401;
      expect(aiClient._isNonRetryableError(authError)).toBe(true);

      const forbiddenError = new Error('Forbidden');
      forbiddenError.status = 403;
      expect(aiClient._isNonRetryableError(forbiddenError)).toBe(true);

      const badRequestError = new Error('Bad Request');
      badRequestError.status = 400;
      expect(aiClient._isNonRetryableError(badRequestError)).toBe(true);

      const jsonError = new Error('Invalid JSON response');
      expect(aiClient._isNonRetryableError(jsonError)).toBe(true);

      const serverError = new Error('Server Error');
      serverError.status = 500;
      expect(aiClient._isNonRetryableError(serverError)).toBe(false);

      const rateLimitError = new Error('Rate Limited');
      rateLimitError.status = 429;
      expect(aiClient._isNonRetryableError(rateLimitError)).toBe(false);
    });

    test('should implement delay correctly', async () => {
      const startTime = Date.now();
      await aiClient._delay(100);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some variance
    });
  });
});