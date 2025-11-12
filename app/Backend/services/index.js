/**
 * Services Index
 * Exports all service classes and factory functions for easy importing
 */

const AdaptiveDifficultyEngine = require('./AdaptiveDifficultyEngine');
const QuestionGenerationService = require('./QuestionGenerationService');
const AIClient = require('./AIClient');
const AssessmentEngine = require('./AssessmentEngine');
const PersonalizedQuestionSetService = require('./PersonalizedQuestionSetService');

/**
 * Create a configured QuestionGenerationService instance
 * @param {Object} config - Configuration options
 * @param {string} config.openaiApiKey - OpenAI API key
 * @param {Object} config.aiOptions - Additional AI client options
 * @returns {QuestionGenerationService} Configured service instance
 */
function createQuestionGenerationService(config = {}) {
  const service = new QuestionGenerationService();
  
  if (config.openaiApiKey) {
    service.initializeAI(config.openaiApiKey, config.aiOptions);
  }
  
  return service;
}

/**
 * Create a configured PersonalizedQuestionSetService instance
 * @returns {PersonalizedQuestionSetService} Configured service instance
 */
function createPersonalizedQuestionSetService() {
  return new PersonalizedQuestionSetService();
}

module.exports = {
  AdaptiveDifficultyEngine,
  QuestionGenerationService,
  AIClient,
  AssessmentEngine,
  PersonalizedQuestionSetService,
  createQuestionGenerationService,
  createPersonalizedQuestionSetService
};