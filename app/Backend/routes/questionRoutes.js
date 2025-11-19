const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');

// Get questions by roadmap and difficulty
router.get('/:roadmap', authMiddleware, async (req, res) => {
  try {
    const { roadmap } = req.params;
    const { difficulty, limit } = req.query;
    
    // Map roadmap names to available question files
    const roadmapMapping = {
      'frontend-development': 'frontend',
      'backend-development': 'backend', 
      'full-stack-development': 'full-stack',
      'mobile-development': 'mobile-app',
      'ai-machine-learning': 'ai-machine-learning',
      'devops-cloud': 'devops-cloud',
      'cybersecurity': 'cybersecurity',
      'database-data-science': 'database-data-science',
      // Also support the short names from the roadmap selection
      'frontend': 'frontend',
      'backend': 'backend',
      'full-stack': 'full-stack', 
      'mobile': 'mobile-app',
      'ai-ml': 'ai-machine-learning',
      'devops': 'devops-cloud',
      'database': 'database-data-science'
    };
    
    const questionFile = roadmapMapping[roadmap] || 'frontend';
    
    // Read questions file
    const questionsPath = path.join(__dirname, '../Questions', `${questionFile}.json`);
    const questionsData = await fs.readFile(questionsPath, 'utf8');
    const { questions } = JSON.parse(questionsData);
    
    let filteredQuestions = questions;
    
    // Filter by difficulty if specified
    if (difficulty) {
      const difficulties = difficulty.split(',');
      filteredQuestions = questions.filter(q => difficulties.includes(q.difficulty));
    }
    
    // Shuffle questions for randomness using Fisher-Yates algorithm
    for (let i = filteredQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filteredQuestions[i], filteredQuestions[j]] = [filteredQuestions[j], filteredQuestions[i]];
    }
    
    // Also shuffle the options for each question
    filteredQuestions = filteredQuestions.map(question => {
      const correctAnswer = question.answer;
      const shuffledOptions = [...question.options];
      
      // Fisher-Yates shuffle for options
      for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
      }
      
      return {
        ...question,
        options: shuffledOptions,
        answer: correctAnswer // Keep the original correct answer text
      };
    });
    
    // Limit number of questions if specified
    if (limit) {
      filteredQuestions = filteredQuestions.slice(0, parseInt(limit));
    }
    
    res.json({
      success: true,
      data: filteredQuestions,
      total: filteredQuestions.length
    });
    
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions'
    });
  }
});

// Get question statistics
router.get('/:roadmap/stats', authMiddleware, async (req, res) => {
  try {
    const { roadmap } = req.params;
    
    const questionsPath = path.join(__dirname, '../Questions', `${roadmap}.json`);
    const questionsData = await fs.readFile(questionsPath, 'utf8');
    const { questions } = JSON.parse(questionsData);
    
    const stats = {
      total: questions.length,
      byDifficulty: {
        easy: questions.filter(q => q.difficulty === 'easy').length,
        medium: questions.filter(q => q.difficulty === 'medium').length,
        hard: questions.filter(q => q.difficulty === 'hard').length,
        advanced: questions.filter(q => q.difficulty === 'advanced').length
      },
      byTopic: {}
    };
    
    // Count by topic
    questions.forEach(q => {
      stats.byTopic[q.topic] = (stats.byTopic[q.topic] || 0) + 1;
    });
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error fetching question stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch question statistics'
    });
  }
});

module.exports = router;