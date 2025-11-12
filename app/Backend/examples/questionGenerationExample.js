/**
 * Example usage of Question Generation Service with AI Integration
 * Demonstrates how to generate questions with different parameters and AI integration
 */

const { createQuestionGenerationService } = require('../services');
require('dotenv').config();

async function demonstrateQuestionGeneration() {
  console.log('=== AI-Powered Question Generation Service Demo ===\n');

  // Initialize the service with AI integration
  const service = createQuestionGenerationService({
    openaiApiKey: process.env.OPENAI_API_KEY,
    aiOptions: {
      model: 'gpt-3.5-turbo',
      timeout: 30000,
      maxRetries: 3
    }
  });

  // Check AI service status
  console.log('AI Service Status:', service.getAIServiceStatus());
  console.log('\n');

  try {
    // Test AI service health
    if (service.isAIServiceHealthy()) {
      console.log('Testing AI service connection...');
      const isHealthy = await service.checkAIServiceHealth();
      console.log(`AI Service Health: ${isHealthy ? 'Healthy' : 'Unhealthy'}\n`);
    }

    // Example 1: AI-generated programming question
    console.log('1. Generating AI-powered programming question...');
    const aiQuestion = await service.generateQuestion({
      topic: 'Hash Tables',
      category: ['Programming', 'Data Structures'],
      difficulty: 6,
      questionType: 'multiple-choice'
    });
    
    console.log('Generated Question:');
    console.log(`Q: ${aiQuestion.question}`);
    console.log('Options:');
    aiQuestion.options.forEach((option, index) => {
      const letter = String.fromCharCode(65 + index);
      console.log(`  ${letter}. ${option}`);
    });
    console.log(`Correct Answer: ${aiQuestion.correctAnswer}`);
    console.log(`Explanation: ${aiQuestion.explanation}`);
    if (aiQuestion.hints && aiQuestion.hints.length > 0) {
      console.log('Hints:');
      aiQuestion.hints.forEach((hint, index) => {
        console.log(`  ${index + 1}. ${hint}`);
      });
    }
    console.log(`Validation Score: ${aiQuestion.validationScore}`);
    console.log(`Generated At: ${aiQuestion.generatedAt}`);
    console.log('\n' + '='.repeat(60) + '\n');

    // Example 2: Fallback demonstration (simulate AI failure)
    console.log('2. Demonstrating fallback mechanism...');
    
    // Temporarily disable AI service to show fallback
    const originalHealthy = service.aiServiceHealthy;
    service.aiServiceHealthy = false;
    
    const fallbackQuestion = await service.generateQuestion({
      topic: 'Binary Search Trees',
      category: ['Programming', 'Data Structures'],
      difficulty: 5,
      questionType: 'multiple-choice'
    });
    
    console.log('Fallback Question (AI service disabled):');
    console.log(`Q: ${fallbackQuestion.question}`);
    console.log('Options:');
    fallbackQuestion.options.forEach((option, index) => {
      const letter = String.fromCharCode(65 + index);
      console.log(`  ${letter}. ${option}`);
    });
    console.log(`Correct Answer: ${fallbackQuestion.correctAnswer}`);
    console.log(`Explanation: ${fallbackQuestion.explanation}`);
    
    // Restore AI service
    service.aiServiceHealthy = originalHealthy;
    console.log('\n' + '='.repeat(60) + '\n');

    // Example 3: Different difficulty levels
    console.log('3. Generating questions at different difficulty levels...');
    
    const difficulties = [2, 5, 8];
    const topics = ['Variables', 'Recursion', 'Dynamic Programming'];
    
    for (let i = 0; i < difficulties.length; i++) {
      console.log(`\nDifficulty ${difficulties[i]} - ${topics[i]}:`);
      
      const difficultyQuestion = await service.generateQuestion({
        topic: topics[i],
        category: ['Programming', 'Algorithms'],
        difficulty: difficulties[i],
        questionType: 'multiple-choice'
      });
      
      console.log(`Q: ${difficultyQuestion.question}`);
      console.log(`Temperature used: ${service._getTemperatureForDifficulty(difficulties[i])}`);
      console.log(`Validation Score: ${difficultyQuestion.validationScore}`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');

    // Example 4: True/False questions
    console.log('4. Generating true/false question...');
    const trueFalseQuestion = await service.generateQuestion({
      topic: 'Machine Learning',
      category: ['Computer Science', 'AI'],
      difficulty: 7,
      questionType: 'true-false'
    });
    
    console.log('Generated True/False Question:');
    console.log(`Q: ${trueFalseQuestion.question}`);
    console.log('Options:');
    trueFalseQuestion.options.forEach((option, index) => {
      console.log(`  ${index + 1}. ${option}`);
    });
    console.log(`Correct Answer: ${trueFalseQuestion.correctAnswer}`);
    console.log(`Explanation: ${trueFalseQuestion.explanation}`);
    console.log('\n' + '='.repeat(60) + '\n');

    // Example 5: Service capabilities
    console.log('5. Service Information:');
    console.log('Available Question Types:', service.getAvailableQuestionTypes());
    
    const status = service.getAIServiceStatus();
    console.log('AI Service Status:');
    console.log(`  - Has AI Client: ${status.hasClient}`);
    console.log(`  - Is Healthy: ${status.isHealthy}`);
    console.log(`  - Last Health Check: ${status.lastHealthCheck ? new Date(status.lastHealthCheck) : 'Never'}`);
    console.log(`  - Fallback Questions Available: ${status.fallbackQuestionsAvailable}`);
    
    const template = service.getPromptTemplate('multiple-choice');
    console.log('Multiple-choice template categories:', Object.keys(template.categories));
    
  } catch (error) {
    console.error('Error generating questions:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Demonstrate error handling
async function demonstrateErrorHandling() {
  console.log('\n=== Error Handling Demonstration ===\n');
  
  const service = createQuestionGenerationService({
    openaiApiKey: 'invalid-key', // Intentionally invalid
    aiOptions: { maxRetries: 1 }
  });

  try {
    console.log('Testing with invalid API key...');
    const result = await service.generateQuestion({
      topic: 'Test Topic',
      category: ['Programming'],
      difficulty: 5
    });
    
    console.log('Fallback question generated successfully:');
    console.log(`Q: ${result.question}`);
    console.log('This demonstrates graceful fallback when AI service fails.');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }

  // Test parameter validation
  console.log('\nTesting parameter validation...');
  const validService = createQuestionGenerationService();
  
  try {
    await validService.generateQuestion({
      topic: '', // Invalid empty topic
      category: ['Programming'],
      difficulty: 5
    });
  } catch (error) {
    console.log('Expected error for empty topic:', error.message);
  }
  
  try {
    await validService.generateQuestion({
      topic: 'Valid Topic',
      category: ['Programming'],
      difficulty: 15 // Invalid difficulty > 10
    });
  } catch (error) {
    console.log('Expected error for invalid difficulty:', error.message);
  }
}

// Run the demonstrations
if (require.main === module) {
  demonstrateQuestionGeneration()
    .then(() => demonstrateErrorHandling())
    .then(() => {
      console.log('\n=== Demo Complete ===');
      process.exit(0);
    })
    .catch(error => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}

module.exports = { 
  demonstrateQuestionGeneration,
  demonstrateErrorHandling
};