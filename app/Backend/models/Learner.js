const mongoose = require('mongoose');

// Sub-schema for category mastery tracking
const categoryMasterySchema = new mongoose.Schema({
  level: {
    type: Number,
    min: [0, 'Mastery level cannot be negative'],
    max: [100, 'Mastery level cannot exceed 100'],
    default: 0
  },
  confidence: {
    type: Number,
    min: [0, 'Confidence cannot be negative'],
    max: [1, 'Confidence cannot exceed 1'],
    default: 0
  },
  lastAssessed: {
    type: Date,
    default: Date.now
  },
  questionsAnswered: {
    type: Number,
    default: 0,
    min: [0, 'Questions answered cannot be negative']
  },
  averageAccuracy: {
    type: Number,
    min: [0, 'Average accuracy cannot be negative'],
    max: [1, 'Average accuracy cannot exceed 1'],
    default: 0
  },
  averageTimePerQuestion: {
    type: Number,
    default: 0,
    min: [0, 'Average time cannot be negative']
  },
  streakCount: {
    type: Number,
    default: 0,
    min: [0, 'Streak count cannot be negative']
  }
}, { _id: false });

const learnerSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ]
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [1, 'Name cannot be empty'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  categoryMastery: {
    type: Map,
    of: categoryMasterySchema,
    default: new Map()
  },
  difficultyPreference: {
    type: Number,
    min: [1, 'Difficulty preference must be at least 1'],
    max: [10, 'Difficulty preference cannot exceed 10'],
    default: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Difficulty preference must be an integer'
    }
  },
  learningVelocity: {
    type: Number,
    default: 1.0,
    min: [0.1, 'Learning velocity must be at least 0.1'],
    max: [5.0, 'Learning velocity cannot exceed 5.0']
  },
  retentionRate: {
    type: Number,
    min: [0, 'Retention rate cannot be negative'],
    max: [1, 'Retention rate cannot exceed 1'],
    default: 0.8
  },
  totalQuestionsAnswered: {
    type: Number,
    default: 0,
    min: [0, 'Total questions answered cannot be negative']
  },
  totalTimeSpent: {
    type: Number,
    default: 0,
    min: [0, 'Total time spent cannot be negative']
  },
  overallAccuracy: {
    type: Number,
    min: [0, 'Overall accuracy cannot be negative'],
    max: [1, 'Overall accuracy cannot exceed 1'],
    default: 0
  },
  currentStreak: {
    type: Number,
    default: 0,
    min: [0, 'Current streak cannot be negative']
  },
  longestStreak: {
    type: Number,
    default: 0,
    min: [0, 'Longest streak cannot be negative']
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  preferences: {
    hintsEnabled: {
      type: Boolean,
      default: true
    },
    explanationsEnabled: {
      type: Boolean,
      default: true
    },
    timerEnabled: {
      type: Boolean,
      default: true
    },
    soundEnabled: {
      type: Boolean,
      default: false
    }
  },
  currentRoadmapId: {
    type: String,
    default: null
  },
  roadmapHistory: [{
    roadmapId: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed'],
      default: 'active'
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    pausedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance optimization
learnerSchema.index({ email: 1 }, { unique: true });
learnerSchema.index({ lastActive: -1 });
learnerSchema.index({ overallAccuracy: -1 });

// Virtual for weak areas (categories with mastery level < 60)
learnerSchema.virtual('weakAreas').get(function () {
  const weakAreas = [];
  for (const [category, mastery] of this.categoryMastery) {
    if (mastery.level < 60) {
      weakAreas.push(category);
    }
  }
  return weakAreas;
});

// Virtual for strong areas (categories with mastery level >= 80)
learnerSchema.virtual('strongAreas').get(function () {
  const strongAreas = [];
  for (const [category, mastery] of this.categoryMastery) {
    if (mastery.level >= 80) {
      strongAreas.push(category);
    }
  }
  return strongAreas;
});

// Virtual for average session time
learnerSchema.virtual('averageSessionTime').get(function () {
  if (this.totalQuestionsAnswered === 0) return 0;
  return this.totalTimeSpent / this.totalQuestionsAnswered;
});

// Pre-save middleware to update lastActive
learnerSchema.pre('save', function (next) {
  if (this.isModified() && !this.isModified('lastActive')) {
    this.lastActive = new Date();
  }
  next();
});

// Static method to find learners by performance level
learnerSchema.statics.findByPerformanceLevel = function (minAccuracy, maxAccuracy) {
  return this.find({
    overallAccuracy: { $gte: minAccuracy, $lte: maxAccuracy },
    totalQuestionsAnswered: { $gte: 10 } // Only include learners with sufficient data
  });
};

// Static method to get learner analytics
learnerSchema.statics.getAnalytics = function (learnerId) {
  return this.aggregate([
    { $match: { _id: mongoose.Types.ObjectId(learnerId) } },
    {
      $project: {
        name: 1,
        email: 1,
        overallAccuracy: 1,
        totalQuestionsAnswered: 1,
        totalTimeSpent: 1,
        currentStreak: 1,
        longestStreak: 1,
        categoryCount: { $size: { $objectToArray: '$categoryMastery' } },
        averageSessionTime: {
          $cond: {
            if: { $eq: ['$totalQuestionsAnswered', 0] },
            then: 0,
            else: { $divide: ['$totalTimeSpent', '$totalQuestionsAnswered'] }
          }
        }
      }
    }
  ]);
};

// Instance method to update category mastery
learnerSchema.methods.updateCategoryMastery = function (category, wasCorrect, timeSpent) {
  if (!this.categoryMastery.has(category)) {
    this.categoryMastery.set(category, {
      level: 0,
      confidence: 0,
      lastAssessed: new Date(),
      questionsAnswered: 0,
      averageAccuracy: 0,
      averageTimePerQuestion: 0,
      streakCount: 0
    });
  }

  const mastery = this.categoryMastery.get(category);

  // Update questions answered
  mastery.questionsAnswered += 1;

  // Update average accuracy
  const previousCorrect = Math.round(mastery.averageAccuracy * (mastery.questionsAnswered - 1));
  const newCorrect = previousCorrect + (wasCorrect ? 1 : 0);
  mastery.averageAccuracy = newCorrect / mastery.questionsAnswered;

  // Update average time per question
  mastery.averageTimePerQuestion = ((mastery.averageTimePerQuestion * (mastery.questionsAnswered - 1)) + timeSpent) / mastery.questionsAnswered;

  // Update streak
  if (wasCorrect) {
    mastery.streakCount += 1;
  } else {
    mastery.streakCount = 0;
  }

  // Calculate mastery level (0-100) based on accuracy, consistency, and speed
  const accuracyScore = mastery.averageAccuracy * 60; // Max 60 points for accuracy
  const consistencyScore = Math.min(mastery.streakCount * 2, 25); // Max 25 points for consistency
  const speedScore = Math.max(0, 15 - (mastery.averageTimePerQuestion / 10)); // Max 15 points for speed

  mastery.level = Math.min(100, Math.round(accuracyScore + consistencyScore + speedScore));

  // Update confidence based on recent performance and question count
  const experienceFactor = Math.min(1, mastery.questionsAnswered / 20); // Full confidence after 20 questions
  mastery.confidence = mastery.averageAccuracy * experienceFactor;

  mastery.lastAssessed = new Date();

  this.categoryMastery.set(category, mastery);
  return this.save();
};

// Instance method to update overall statistics
learnerSchema.methods.updateOverallStats = function (wasCorrect, timeSpent) {
  this.totalQuestionsAnswered += 1;
  this.totalTimeSpent += timeSpent;

  // Update overall accuracy
  const previousCorrect = Math.round(this.overallAccuracy * (this.totalQuestionsAnswered - 1));
  const newCorrect = previousCorrect + (wasCorrect ? 1 : 0);
  this.overallAccuracy = newCorrect / this.totalQuestionsAnswered;

  // Update streaks
  if (wasCorrect) {
    this.currentStreak += 1;
    this.longestStreak = Math.max(this.longestStreak, this.currentStreak);
  } else {
    this.currentStreak = 0;
  }

  return this.save();
};

// Instance method to get recommended difficulty
learnerSchema.methods.getRecommendedDifficulty = function (category) {
  if (!this.categoryMastery.has(category)) {
    return this.difficultyPreference;
  }

  const mastery = this.categoryMastery.get(category);
  const masteryLevel = mastery.level;

  // Adjust difficulty based on mastery level
  let recommendedDifficulty = this.difficultyPreference;

  if (masteryLevel < 30) {
    recommendedDifficulty = Math.max(1, this.difficultyPreference - 2);
  } else if (masteryLevel < 60) {
    recommendedDifficulty = Math.max(1, this.difficultyPreference - 1);
  } else if (masteryLevel > 80) {
    recommendedDifficulty = Math.min(10, this.difficultyPreference + 1);
  } else if (masteryLevel > 90) {
    recommendedDifficulty = Math.min(10, this.difficultyPreference + 2);
  }

  return recommendedDifficulty;
};

module.exports = mongoose.model('Learner', learnerSchema);