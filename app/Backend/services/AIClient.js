/**
 * AI Client for OpenAI Integration
 * Handles communication with OpenAI API for question generation
 */

const OpenAI = require('openai');

class AIClient {
  constructor(apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
      timeout: options.timeout || 30000,
    });

    this.defaultModel = options.model || 'gpt-3.5-turbo';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Generate completion using OpenAI API
   * @param {string} prompt - The prompt to send to the AI
   * @param {Object} options - Additional options for the API call
   * @returns {Promise<string>} The generated completion
   */
  async generateCompletion(prompt, options = {}) {
    const requestOptions = {
      model: options.model || this.defaultModel,
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator. Generate high-quality, accurate educational questions with detailed explanations. Always respond with valid JSON format as requested.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1500,
      top_p: options.topP || 1,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0
    };

    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.openai.chat.completions.create(requestOptions);
        
        if (!response.choices || response.choices.length === 0) {
          throw new Error('No completion choices returned from OpenAI');
        }

        const content = response.choices[0].message.content;
        
        if (!content) {
          throw new Error('Empty content returned from OpenAI');
        }

        // Validate that the response is valid JSON
        try {
          JSON.parse(content);
          return content;
        } catch (parseError) {
          throw new Error(`Invalid JSON response from OpenAI: ${parseError.message}`);
        }

      } catch (error) {
        lastError = error;
        
        // Don't retry for certain types of errors
        if (this._isNonRetryableError(error)) {
          throw new Error(`OpenAI API error: ${error.message}`);
        }

        // If this isn't the last attempt, wait before retrying
        if (attempt < this.maxRetries) {
          await this._delay(this.retryDelay * attempt);
          console.warn(`OpenAI API attempt ${attempt} failed, retrying: ${error.message}`);
        }
      }
    }

    throw new Error(`OpenAI API failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Check if an error should not be retried
   * @private
   */
  _isNonRetryableError(error) {
    // Don't retry for authentication, permission, or invalid request errors
    if (error.status) {
      return error.status === 401 || error.status === 403 || error.status === 400;
    }
    
    // Don't retry for JSON parsing errors
    if (error.message.includes('Invalid JSON')) {
      return true;
    }

    return false;
  }

  /**
   * Delay execution for retry logic
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test the connection to OpenAI API
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 10
      });
      
      return response.choices && response.choices.length > 0;
    } catch (error) {
      console.error('OpenAI connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get available models (for future use)
   * @returns {Promise<Array>} List of available models
   */
  async getAvailableModels() {
    try {
      const response = await this.openai.models.list();
      return response.data.map(model => model.id);
    } catch (error) {
      console.error('Failed to fetch available models:', error.message);
      return [];
    }
  }
}

module.exports = AIClient;