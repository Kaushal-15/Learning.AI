/**
 * Example usage of the Adaptive Difficulty Engine
 * This demonstrates how to integrate the engine with the existing models
 */

const AdaptiveDifficultyEngine = require('../services/AdaptiveDifficultyEngine');
const Learner = require('../models/Learner');
const Performance = require('../models/Performance');
const Question = require('../models/Question');

class AdaptiveLearningSession {
  constructor() {
    this.difficultyEngine = new AdaptiveDifficultyEngine();
  }

  /**
   * Start an adaptive learning session for a learner
   * @param {string} learnerId - The learner's ID
   * @param {string} category - The learning category
   * @param {string} sessionId - Unique session identifier
   */
  async startSession(learnerId, category, sessionId) {
    try {
      // Get learner profile
      const learner = await Learner.findById(learnerId);
      if (!learner) {
        throw new Error('Learner not found');
      }

      // Get initial difficulty based on learner's preference and category mastery
      const initialDifficulty = learner.getRecommendedDifficulty(category);
      
      console.log(`Starting adaptive session for ${learner.name}`);
      console.log(`Category: ${category}`);
      console.log(`Initial difficulty: ${initialDifficulty}`);
      
      return {
        sessionId,
        learnerId,
        category,
        currentDifficulty: initialDifficulty,
        questionsAnswered: 0
      };

    } catch (error) {
      console.error('Error starting adaptive session:', error.message);
      throw error;
    }
  }

  /**
   * Process a learner's answer and adjust difficulty for next question
   * @param {Object} sessionData - Current session data
   * @param {string} questionId - The answered question ID
   * @param {string} selectedAnswer - The learner's answer
   * @param {number} timeSpent - Time spent on the question (seconds)
   * @param {number} hintsUsed - Number of hints used
   */
  async processAnswer(sessionData, questionId, selectedAnswer, timeSpent, hintsUsed = 0) {
    try {
      // Get the question to check correctness
      const question = await Question.findById(questionId);
      if (!question) {
        throw new Error('Question not found');
      }

      const isCorrect = question.correctAnswer === selectedAnswer;

      // Record performance
      const performance = new Performance({
        learnerId: sessionData.learnerId,
        questionId: questionId,
        selectedAnswer: selectedAnswer,
        correct: isCorrect,
        timeSpent: timeSpent,
        hintsUsed: hintsUsed,
        difficulty: sessionData.currentDifficulty,
        category: [sessionData.category],
        sessionId: sessionData.sessionId
      });

      await performance.save();

      // Update question usage statistics
      await question.updateUsageStats(timeSpent, isCorrect);

      // Update learner's category mastery and overall stats
      const learner = await Learner.findById(sessionData.learnerId);
      await learner.updateCategoryMastery(sessionData.category, isCorrect, timeSpent);
      await learner.updateOverallStats(isCorrect, timeSpent);

      // Calculate next difficulty using the adaptive engine
      const difficultyResult = await this.difficultyEngine.calculateNextDifficulty(
        sessionData.learnerId,
        sessionData.category,
        sessionData.currentDifficulty,
        {
          sessionId: sessionData.sessionId,
          lookbackQuestions: 5,
          considerTimeSpent: true,
          considerHints: true
        }
      );

      // Update session data
      sessionData.currentDifficulty = difficultyResult.newDifficulty;
      sessionData.questionsAnswered += 1;

      console.log(`Question ${sessionData.questionsAnswered} processed:`);
      console.log(`  Answer: ${isCorrect ? 'Correct' : 'Incorrect'}`);
      console.log(`  Time spent: ${timeSpent}s`);
      console.log(`  Hints used: ${hintsUsed}`);
      console.log(`  Difficulty adjustment: ${difficultyResult.adjustment > 0 ? '+' : ''}${difficultyResult.adjustment}`);
      console.log(`  New difficulty: ${difficultyResult.newDifficulty}`);
      console.log(`  Reasoning: ${difficultyResult.reasoning}`);
      console.log(`  Confidence: ${(difficultyResult.confidence * 100).toFixed(1)}%`);

      return {
        sessionData,
        difficultyResult,
        performance: {
          correct: isCorrect,
          timeSpent,
          hintsUsed,
          explanation: question.explanation
        }
      };

    } catch (error) {
      console.error('Error processing answer:', error.message);
      throw error;
    }
  }

  /**
   * Get the next question for the learner based on current difficulty
   * @param {Object} sessionData - Current session data
   * @param {Array} excludeQuestionIds - Questions to exclude
   */
  async getNextQuestion(sessionData, excludeQuestionIds = []) {
    try {
      // Find questions matching the current difficulty and category
      const questions = await Question.findByCategoryAndDifficulty(
        [sessionData.category],
        Math.max(1, sessionData.currentDifficulty - 1),
        Math.min(10, sessionData.currentDifficulty + 1),
        10
      );

      // Filter out excluded questions
      const availableQuestions = questions.filter(
        q => !excludeQuestionIds.includes(q._id.toString())
      );

      if (availableQuestions.length === 0) {
        throw new Error('No suitable questions found for current difficulty level');
      }

      // Select question with lowest usage count (to ensure variety)
      const selectedQuestion = availableQuestions.reduce((prev, current) => 
        (prev.timesUsed < current.timesUsed) ? prev : current
      );

      return {
        questionId: selectedQuestion._id,
        content: selectedQuestion.content,
        options: selectedQuestion.options,
        category: selectedQuestion.category,
        difficulty: selectedQuestion.difficulty,
        hints: selectedQuestion.hints
      };

    } catch (error) {
      console.error('Error getting next question:', error.message);
      throw error;
    }
  }

  /**
   * End the learning session and provide summary
   * @param {Object} sessionData - Current session data
   */
  async endSession(sessionData) {
    try {
      // Get session performance summary
      const sessionPerformance = await Performance.getSessionPerformance(sessionData.sessionId);
      
      if (sessionPerformance.length > 0) {
        const summary = sessionPerformance[0];
        
        console.log(`\nSession Summary for ${sessionData.sessionId}:`);
        console.log(`  Questions answered: ${summary.totalQuestions}`);
        console.log(`  Accuracy: ${(summary.accuracy * 100).toFixed(1)}%`);
        console.log(`  Average time per question: ${summary.averageTimePerQuestion.toFixed(1)}s`);
        console.log(`  Total hints used: ${summary.totalHintsUsed}`);
        console.log(`  Average difficulty: ${summary.averageDifficulty.toFixed(1)}`);
        console.log(`  Session duration: ${Math.round(summary.sessionDuration / 1000 / 60)} minutes`);
        
        return summary;
      }

      return null;

    } catch (error) {
      console.error('Error ending session:', error.message);
      throw error;
    }
  }
}

// Example usage demonstration
async function demonstrateAdaptiveLearning() {
  console.log('=== Adaptive Difficulty Engine Demonstration ===\n');
  
  const session = new AdaptiveLearningSession();
  
  // This would normally use real database IDs
  const mockLearnerId = '507f1f77bcf86cd799439011';
  const mockQuestionId = '507f1f77bcf86cd799439012';
  const category = 'Mathematics';
  const sessionId = `session_${Date.now()}`;

  try {
    // Start session
    const sessionData = await session.startSession(mockLearnerId, category, sessionId);
    
    // Simulate answering several questions with different performance patterns
    const questionAnswers = [
      { correct: true, timeSpent: 30, hintsUsed: 0 },   // Good performance
      { correct: true, timeSpent: 25, hintsUsed: 0 },   // Good performance
      { correct: true, timeSpent: 20, hintsUsed: 0 },   // Excellent performance
      { correct: false, timeSpent: 90, hintsUsed: 2 },  // Poor performance
      { correct: true, timeSpent: 35, hintsUsed: 1 },   // Moderate performance
    ];

    for (let i = 0; i < questionAnswers.length; i++) {
      const answer = questionAnswers[i];
      
      // This would normally process a real question answer
      console.log(`\n--- Processing Question ${i + 1} ---`);
      
      // In a real implementation, you would:
      // 1. Get next question using getNextQuestion()
      // 2. Present question to learner
      // 3. Process their answer using processAnswer()
      
      // For demonstration, we'll simulate the difficulty adjustment
      const difficultyResult = await session.difficultyEngine.calculateNextDifficulty(
        mockLearnerId,
        category,
        sessionData.currentDifficulty,
        { sessionId: sessionId }
      );
      
      sessionData.currentDifficulty = difficultyResult.newDifficulty;
      sessionData.questionsAnswered += 1;
      
      console.log(`Simulated answer: ${answer.correct ? 'Correct' : 'Incorrect'}`);
      console.log(`Time: ${answer.timeSpent}s, Hints: ${answer.hintsUsed}`);
      console.log(`Difficulty: ${difficultyResult.previousDifficulty} → ${difficultyResult.newDifficulty}`);
      console.log(`Reasoning: ${difficultyResult.reasoning}`);
    }
    
    console.log('\n=== Demonstration Complete ===');
    
  } catch (error) {
    console.error('Demonstration error:', error.message);
  }
}

module.exports = { AdaptiveLearningSession, demonstrateAdaptiveLearning };

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateAdaptiveLearning();
}