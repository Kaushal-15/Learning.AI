# AI Integration for Question Generation

This document explains how to use the AI-powered question generation system with OpenAI integration and fallback mechanisms.

## Overview

The Dynamic MCQ System integrates with OpenAI's GPT models to generate high-quality, contextual questions. The system includes robust fallback mechanisms to ensure continuous operation even when the AI service is unavailable.

## Features

- **Real-time AI Question Generation**: Uses OpenAI GPT models to generate unique questions
- **Intelligent Fallback System**: Automatically falls back to curated questions when AI service fails
- **Health Monitoring**: Continuous monitoring of AI service health with automatic recovery
- **Retry Logic**: Intelligent retry mechanisms for temporary failures
- **Content Validation**: Multi-layer validation of AI-generated content
- **Temperature Control**: Difficulty-based temperature adjustment for better question quality

## Setup

### 1. Install Dependencies

```bash
npm install openai
```

### 2. Environment Configuration

Add your OpenAI API key to your `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
AI_SERVICE_TIMEOUT=30000
```

### 3. Initialize the Service

```javascript
const { createQuestionGenerationService } = require('./services');

// Initialize with AI integration
const service = createQuestionGenerationService({
  openaiApiKey: process.env.OPENAI_API_KEY,
  aiOptions: {
    model: 'gpt-3.5-turbo',
    timeout: 30000,
    maxRetries: 3
  }
});
```

## Usage

### Basic Question Generation

```javascript
const question = await service.generateQuestion({
  topic: 'Binary Search Trees',
  category: ['Programming', 'Data Structures'],
  difficulty: 6,
  questionType: 'multiple-choice'
});

console.log(question);
// Output:
// {
//   question: "What is the average time complexity...",
//   options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
//   correctAnswer: "O(log n)",
//   explanation: "Binary search trees provide...",
//   hints: ["Consider the tree structure", "Think about balanced trees"],
//   category: ['Programming', 'Data Structures'],
//   difficulty: 6,
//   questionType: 'multiple-choice',
//   generatedAt: Date,
//   validationScore: 0.85
// }
```

### Health Monitoring

```javascript
// Check AI service health
const isHealthy = await service.checkAIServiceHealth();
console.log('AI Service Health:', isHealthy);

// Get detailed status
const status = service.getAIServiceStatus();
console.log('Status:', status);
// Output:
// {
//   hasClient: true,
//   isHealthy: true,
//   lastHealthCheck: 1697123456789,
//   fallbackQuestionsAvailable: 4
// }
```

## AI Integration Details

### Prompt Engineering

The system uses sophisticated prompt templates that include:

- **Context Setting**: Establishes the AI as an educational content creator
- **Category-Specific Instructions**: Tailored prompts for different subject areas
- **Difficulty Adjustments**: Dynamic prompt modifications based on difficulty level
- **Format Requirements**: Strict JSON format requirements for consistent parsing

### Temperature Control

Temperature is automatically adjusted based on difficulty level:

- **Difficulty 1-3**: Temperature 0.8 (more creative for basic concepts)
- **Difficulty 4-5**: Temperature 0.7 (balanced creativity and accuracy)
- **Difficulty 6-7**: Temperature 0.5 (more focused for intermediate concepts)
- **Difficulty 8-10**: Temperature 0.3 (highly focused for advanced concepts)

### Content Validation

All AI-generated content goes through multiple validation layers:

1. **Structure Validation**: Ensures required fields are present
2. **Content Quality**: Validates question and explanation length
3. **Answer Consistency**: Verifies correct answer is in options
4. **Educational Value**: Calculates validation score based on content quality

## Fallback Mechanisms

### Curated Question Bank

The system maintains a curated collection of high-quality questions organized by category:

- **Programming**: Data structures, algorithms, complexity analysis
- **Mathematics**: Calculus, algebra, geometry
- **Science**: Physics, chemistry, biology
- **General**: Cross-disciplinary topics

### Fallback Triggers

The system automatically falls back to curated questions when:

- AI service is unavailable or unhealthy
- API key is invalid or expired
- Rate limits are exceeded
- Generated content fails validation
- Network timeouts occur

### Recovery Mechanisms

- **Health Check Caching**: Avoids excessive health checks (5-minute intervals)
- **Automatic Recovery**: AI service is automatically re-enabled after temporary failures
- **Graceful Degradation**: System continues operating with reduced functionality

## Error Handling

### Retry Logic

The system implements intelligent retry logic:

```javascript
// Retryable errors (temporary failures)
- Rate limiting (429)
- Server errors (5xx)
- Network timeouts
- Connection resets

// Non-retryable errors (permanent failures)
- Authentication errors (401)
- Permission errors (403)
- Invalid requests (400)
- JSON parsing errors
```

### Error Recovery

```javascript
try {
  const question = await service.generateQuestion(params);
  // Use AI-generated question
} catch (error) {
  // System automatically falls back to curated questions
  // No additional error handling needed
}
```

## Performance Considerations

### Caching

- Health check results are cached for 5 minutes
- Frequently accessed prompts are optimized
- Fallback questions are pre-loaded in memory

### Optimization

- Connection pooling for API requests
- Timeout management to prevent hanging requests
- Efficient prompt templates to minimize token usage

## Testing

### Unit Tests

```bash
npm test tests/services/AIClient.test.js
npm test tests/services/QuestionGenerationService.test.js
```

### Integration Tests

```bash
npm test tests/integration/AIIntegration.test.js
```

### Example Usage

```bash
node examples/questionGenerationExample.js
```

## Monitoring and Debugging

### Logging

The system provides comprehensive logging:

- AI service health status
- Fallback triggers and reasons
- Content validation failures
- Performance metrics

### Debug Information

```javascript
// Enable debug logging
process.env.NODE_ENV = 'development';

// Check service status
console.log(service.getAIServiceStatus());

// Monitor health checks
await service.checkAIServiceHealth();
```

## Best Practices

1. **API Key Security**: Store API keys securely in environment variables
2. **Rate Limiting**: Implement application-level rate limiting for high-volume usage
3. **Monitoring**: Set up monitoring for AI service health and fallback usage
4. **Content Review**: Periodically review AI-generated content quality
5. **Fallback Maintenance**: Keep curated question bank updated and relevant

## Troubleshooting

### Common Issues

1. **Invalid API Key**: Check environment variable and OpenAI account
2. **Rate Limiting**: Implement exponential backoff or upgrade OpenAI plan
3. **Content Validation Failures**: Review prompt templates and validation rules
4. **Network Issues**: Check connectivity and firewall settings

### Debug Steps

1. Check AI service status: `service.getAIServiceStatus()`
2. Test connection: `await service.checkAIServiceHealth()`
3. Review logs for error patterns
4. Verify environment configuration
5. Test with fallback mode: `service.aiServiceHealthy = false`

## Future Enhancements

- Support for additional AI providers (Anthropic, Cohere)
- Fine-tuned models for educational content
- Advanced prompt optimization
- Real-time content quality scoring
- Automated prompt A/B testing