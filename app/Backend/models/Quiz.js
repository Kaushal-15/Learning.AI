const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  roadmapType: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'advanced', 'mixed'],
    required: true
  },
  isAdaptive: {
    type: Boolean,
    default: false
  },
  adaptiveSettings: {
    currentDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'advanced'],
      default: 'easy'
    },
    consecutiveCorrect: { type: Number, default: 0 },
    consecutiveIncorrect: { type: Number, default: 0 },
    difficultyChanges: [{
      questionIndex: Number,
      fromDifficulty: String,
      toDifficulty: String,
      reason: String,
      timestamp: { type: Date, default: Date.now }
    }],
    fastAnswerThreshold: { type: Number, default: 10 }, // seconds
    confidenceBoostThreshold: { type: Number, default: 2 }, // consecutive correct answers
    difficultyDropThreshold: { type: Number, default: 1 } // consecutive incorrect answers
  },
  questions: [{
    questionId: String,
    question: String,
    options: [String],
    correctAnswer: String,
    topic: String,
    difficulty: String,
    explanation: String,
    userAnswer: String,
    isCorrect: Boolean,
    timeSpent: Number, // seconds spent on this question
    wasAdaptivelySelected: { type: Boolean, default: false },
    adaptiveDifficultyAtTime: String, // difficulty level when this question was presented
    status: {
      type: String,
      enum: ['unanswered', 'answered', 'skipped', 'flagged'],
      default: 'unanswered'
    }
  }],
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  accuracy: {
    type: Number,
    default: 0
  },
  points: {
    type: Number,
    default: 0
  },
  timeLimit: {
    type: Number, // in minutes
    required: true
  },
  timeSpent: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused'],
    default: 'active'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Method to adjust difficulty based on real-time performance
quizSchema.methods.adjustAdaptiveDifficulty = function(questionIndex, isCorrect, timeSpent) {
  if (!this.isAdaptive) return null;
  
  const settings = this.adaptiveSettings;
  const currentDifficulty = settings.currentDifficulty;
  const difficultyLevels = ['easy', 'medium', 'hard', 'advanced'];
  const currentIndex = difficultyLevels.indexOf(currentDifficulty);
  
  let newDifficulty = currentDifficulty;
  let reason = '';
  
  if (isCorrect) {
    settings.consecutiveCorrect++;
    settings.consecutiveIncorrect = 0;
    
    // Check for fast, confident answers (increase difficulty)
    const isFastAnswer = timeSpent <= settings.fastAnswerThreshold;
    const hasConsecutiveCorrect = settings.consecutiveCorrect >= settings.confidenceBoostThreshold;
    
    if (isFastAnswer && hasConsecutiveCorrect && currentIndex < difficultyLevels.length - 1) {
      newDifficulty = difficultyLevels[currentIndex + 1];
      reason = `Fast and confident: ${settings.consecutiveCorrect} correct in ${timeSpent}s`;
      settings.consecutiveCorrect = 0; // Reset after difficulty increase
    }
  } else {
    settings.consecutiveIncorrect++;
    settings.consecutiveCorrect = 0;
    
    // Immediate difficulty drop after incorrect answer (if not at easiest level)
    if (settings.consecutiveIncorrect >= settings.difficultyDropThreshold && currentIndex > 0) {
      newDifficulty = difficultyLevels[currentIndex - 1];
      reason = `Incorrect answer - dropping difficulty for better learning curve`;
      settings.consecutiveIncorrect = 0; // Reset after difficulty decrease
    }
  }
  
  // Record difficulty change if it occurred
  if (newDifficulty !== currentDifficulty) {
    settings.difficultyChanges.push({
      questionIndex,
      fromDifficulty: currentDifficulty,
      toDifficulty: newDifficulty,
      reason,
      timestamp: new Date()
    });
    
    settings.currentDifficulty = newDifficulty;
    
    return {
      changed: true,
      from: currentDifficulty,
      to: newDifficulty,
      reason
    };
  }
  
  return { changed: false, current: currentDifficulty };
};

// Method to update quiz statistics in real-time
quizSchema.methods.updateStats = function() {
  const answeredQuestions = this.questions.filter(q => q.status === 'answered');
  const correctCount = answeredQuestions.filter(q => q.isCorrect).length;
  
  this.correctAnswers = correctCount;
  this.accuracy = answeredQuestions.length > 0 ? Math.round((correctCount / answeredQuestions.length) * 100) : 0;
  
  // Calculate points (correct answers get points based on difficulty)
  this.points = this.questions.reduce((total, q) => {
    if (q.isCorrect) {
      const difficultyPoints = {
        'easy': 1,
        'medium': 2,
        'hard': 3,
        'advanced': 5
      };
      return total + (difficultyPoints[q.difficulty] || 1);
    }
    return total;
  }, 0);
};

// Calculate accuracy and points before saving
quizSchema.pre('save', function(next) {
  this.updateStats();
  next();
});

module.exports = mongoose.model('Quiz', quizSchema);