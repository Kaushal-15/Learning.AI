const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema({
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Learner',
    required: [true, 'Learner ID is required'],
    index: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: [true, 'Question ID is required'],
    index: true
  },
  selectedAnswer: {
    type: String,
    required: [true, 'Selected answer is required'],
    trim: true
  },
  correct: {
    type: Boolean,
    required: [true, 'Correctness indicator is required'],
    index: true
  },
  timeSpent: {
    type: Number,
    required: [true, 'Time spent is required'],
    min: [0, 'Time spent cannot be negative'],
    max: [3600, 'Time spent cannot exceed 1 hour'] // 1 hour max per question
  },
  hintsUsed: {
    type: Number,
    default: 0,
    min: [0, 'Hints used cannot be negative'],
    max: [10, 'Cannot use more than 10 hints per question']
  },
  difficulty: {
    type: Number,
    required: [true, 'Difficulty level is required'],
    min: [1, 'Difficulty must be at least 1'],
    max: [10, 'Difficulty cannot exceed 10'],
    validate: {
      validator: Number.isInteger,
      message: 'Difficulty must be an integer'
    }
  },
  category: [{
    type: String,
    required: [true, 'At least one category is required'],
    trim: true,
    minlength: [1, 'Category cannot be empty'],
    maxlength: [50, 'Category cannot exceed 50 characters']
  }],
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    trim: true,
    index: true
  },
  attemptNumber: {
    type: Number,
    default: 1,
    min: [1, 'Attempt number must be at least 1'],
    max: [5, 'Cannot exceed 5 attempts per question']
  },
  confidenceLevel: {
    type: Number,
    min: [1, 'Confidence level must be at least 1'],
    max: [5, 'Confidence level cannot exceed 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Confidence level must be an integer'
    }
  },
  deviceType: {
    type: String,
    enum: {
      values: ['desktop', 'tablet', 'mobile'],
      message: 'Device type must be desktop, tablet, or mobile'
    },
    default: 'desktop'
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    timezone: String,
    screenResolution: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for performance optimization
performanceSchema.index({ learnerId: 1, createdAt: -1 });
performanceSchema.index({ learnerId: 1, category: 1, createdAt: -1 });
performanceSchema.index({ questionId: 1, correct: 1 });
performanceSchema.index({ sessionId: 1, createdAt: 1 });
performanceSchema.index({ category: 1, difficulty: 1, correct: 1 });
performanceSchema.index({ createdAt: -1 }); // For time-based queries

// Virtual for performance score (0-100)
performanceSchema.virtual('performanceScore').get(function() {
  let score = this.correct ? 60 : 0; // Base score for correctness
  
  // Time bonus (faster = better, up to 25 points)
  const timeBonus = Math.max(0, 25 - (this.timeSpent / 10));
  score += timeBonus;
  
  // Hint penalty (fewer hints = better, up to 10 points)
  const hintPenalty = this.hintsUsed * 2;
  score = Math.max(0, score - hintPenalty);
  
  // Difficulty bonus (harder questions = more points, up to 15 points)
  const difficultyBonus = (this.difficulty - 1) * 1.5;
  score += difficultyBonus;
  
  return Math.min(100, Math.round(score));
});

// Virtual for primary category
performanceSchema.virtual('primaryCategory').get(function() {
  return this.category[0];
});

// Static method to get learner performance analytics
performanceSchema.statics.getLearnerAnalytics = function(learnerId, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  return this.aggregate([
    {
      $match: {
        learnerId: mongoose.Types.ObjectId(learnerId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalQuestions: { $sum: 1 },
        correctAnswers: { $sum: { $cond: ['$correct', 1, 0] } },
        totalTimeSpent: { $sum: '$timeSpent' },
        averageTimePerQuestion: { $avg: '$timeSpent' },
        totalHintsUsed: { $sum: '$hintsUsed' },
        averageDifficulty: { $avg: '$difficulty' },
        performanceByCategory: {
          $push: {
            category: '$category',
            correct: '$correct',
            difficulty: '$difficulty',
            timeSpent: '$timeSpent'
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalQuestions: 1,
        correctAnswers: 1,
        accuracy: {
          $cond: {
            if: { $eq: ['$totalQuestions', 0] },
            then: 0,
            else: { $divide: ['$correctAnswers', '$totalQuestions'] }
          }
        },
        totalTimeSpent: 1,
        averageTimePerQuestion: 1,
        totalHintsUsed: 1,
        averageDifficulty: 1,
        performanceByCategory: 1
      }
    }
  ]);
};

// Static method to get category performance trends
performanceSchema.statics.getCategoryTrends = function(learnerId, category, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        learnerId: mongoose.Types.ObjectId(learnerId),
        category: category,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        questionsAnswered: { $sum: 1 },
        correctAnswers: { $sum: { $cond: ['$correct', 1, 0] } },
        averageTimeSpent: { $avg: '$timeSpent' },
        averageDifficulty: { $avg: '$difficulty' }
      }
    },
    {
      $project: {
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          }
        },
        questionsAnswered: 1,
        correctAnswers: 1,
        accuracy: {
          $cond: {
            if: { $eq: ['$questionsAnswered', 0] },
            then: 0,
            else: { $divide: ['$correctAnswers', '$questionsAnswered'] }
          }
        },
        averageTimeSpent: 1,
        averageDifficulty: 1
      }
    },
    { $sort: { date: 1 } }
  ]);
};

// Static method to get difficulty progression
performanceSchema.statics.getDifficultyProgression = function(learnerId, category) {
  return this.aggregate([
    {
      $match: {
        learnerId: mongoose.Types.ObjectId(learnerId),
        category: category
      }
    },
    {
      $group: {
        _id: '$difficulty',
        questionsAnswered: { $sum: 1 },
        correctAnswers: { $sum: { $cond: ['$correct', 1, 0] } },
        averageTimeSpent: { $avg: '$timeSpent' }
      }
    },
    {
      $project: {
        difficulty: '$_id',
        questionsAnswered: 1,
        correctAnswers: 1,
        accuracy: {
          $cond: {
            if: { $eq: ['$questionsAnswered', 0] },
            then: 0,
            else: { $divide: ['$correctAnswers', '$questionsAnswered'] }
          }
        },
        averageTimeSpent: 1
      }
    },
    { $sort: { difficulty: 1 } }
  ]);
};

// Static method to get session performance
performanceSchema.statics.getSessionPerformance = function(sessionId) {
  return this.aggregate([
    { $match: { sessionId: sessionId } },
    {
      $group: {
        _id: null,
        totalQuestions: { $sum: 1 },
        correctAnswers: { $sum: { $cond: ['$correct', 1, 0] } },
        totalTimeSpent: { $sum: '$timeSpent' },
        totalHintsUsed: { $sum: '$hintsUsed' },
        averageDifficulty: { $avg: '$difficulty' },
        categoriesCovered: { $addToSet: '$category' },
        startTime: { $min: '$createdAt' },
        endTime: { $max: '$createdAt' }
      }
    },
    {
      $project: {
        _id: 0,
        totalQuestions: 1,
        correctAnswers: 1,
        accuracy: {
          $cond: {
            if: { $eq: ['$totalQuestions', 0] },
            then: 0,
            else: { $divide: ['$correctAnswers', '$totalQuestions'] }
          }
        },
        totalTimeSpent: 1,
        averageTimePerQuestion: {
          $cond: {
            if: { $eq: ['$totalQuestions', 0] },
            then: 0,
            else: { $divide: ['$totalTimeSpent', '$totalQuestions'] }
          }
        },
        totalHintsUsed: 1,
        averageDifficulty: 1,
        categoriesCovered: 1,
        sessionDuration: {
          $subtract: ['$endTime', '$startTime']
        },
        startTime: 1,
        endTime: 1
      }
    }
  ]);
};

// Instance method to calculate performance metrics
performanceSchema.methods.getPerformanceMetrics = function() {
  return {
    performanceScore: this.performanceScore,
    efficiency: this.correct ? (60 / Math.max(this.timeSpent, 1)) : 0,
    difficultyAdjustedScore: this.performanceScore * (this.difficulty / 5),
    hintDependency: this.hintsUsed / Math.max(1, this.timeSpent / 30), // hints per 30 seconds
    categoryMastery: this.correct && this.hintsUsed === 0 && this.timeSpent < 60
  };
};

// Pre-save middleware for validation
performanceSchema.pre('save', function(next) {
  // Validate that selectedAnswer is not empty
  if (!this.selectedAnswer || this.selectedAnswer.trim().length === 0) {
    return next(new Error('Selected answer cannot be empty'));
  }
  
  // Validate category array
  if (!this.category || this.category.length === 0) {
    return next(new Error('At least one category is required'));
  }
  
  next();
});

module.exports = mongoose.model('Performance', performanceSchema);