const mongoose = require('mongoose');

const spacedRepetitionSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: [true, 'Question ID is required'],
    index: true
  },
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Learner',
    required: [true, 'Learner ID is required'],
    index: true
  },
  nextReviewDate: {
    type: Date,
    required: [true, 'Next review date is required'],
    index: true
  },
  interval: {
    type: Number,
    default: 1,
    min: [0.1, 'Interval must be at least 0.1 days'],
    max: [365, 'Interval cannot exceed 365 days']
  },
  easeFactor: {
    type: Number,
    default: 2.5,
    min: [1.3, 'Ease factor must be at least 1.3'],
    max: [4.0, 'Ease factor cannot exceed 4.0']
  },
  repetitions: {
    type: Number,
    default: 0,
    min: [0, 'Repetitions cannot be negative']
  },
  lastReviewed: {
    type: Date,
    default: Date.now
  },
  quality: {
    type: Number,
    min: [0, 'Quality must be at least 0'],
    max: [5, 'Quality cannot exceed 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Quality must be an integer'
    }
  },
  category: [{
    type: String,
    required: [true, 'At least one category is required'],
    trim: true
  }],
  difficulty: {
    type: Number,
    required: [true, 'Difficulty level is required'],
    min: [1, 'Difficulty must be at least 1'],
    max: [10, 'Difficulty cannot exceed 10']
  },
  consecutiveCorrect: {
    type: Number,
    default: 0,
    min: [0, 'Consecutive correct cannot be negative']
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: [0, 'Total reviews cannot be negative']
  },
  averageResponseTime: {
    type: Number,
    default: 0,
    min: [0, 'Average response time cannot be negative']
  },
  isRetired: {
    type: Boolean,
    default: false,
    index: true
  },
  retiredAt: {
    type: Date
  },
  priority: {
    type: Number,
    default: 1,
    min: [1, 'Priority must be at least 1'],
    max: [5, 'Priority cannot exceed 5']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for performance optimization
spacedRepetitionSchema.index({ learnerId: 1, nextReviewDate: 1 });
spacedRepetitionSchema.index({ learnerId: 1, category: 1, nextReviewDate: 1 });
spacedRepetitionSchema.index({ questionId: 1, learnerId: 1 }, { unique: true });
spacedRepetitionSchema.index({ isRetired: 1, nextReviewDate: 1 });

// Virtual for days until next review
spacedRepetitionSchema.virtual('daysUntilReview').get(function() {
  const now = new Date();
  const diffTime = this.nextReviewDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for review urgency (0-1, where 1 is most urgent)
spacedRepetitionSchema.virtual('urgency').get(function() {
  const now = new Date();
  const daysPast = (now - this.nextReviewDate) / (1000 * 60 * 60 * 24);
  
  if (daysPast <= 0) return 0; // Not due yet
  
  // Urgency increases with days overdue, capped at 1
  return Math.min(1, daysPast / 7); // Full urgency after 7 days overdue
});

// Virtual for mastery level based on repetitions and ease factor
spacedRepetitionSchema.virtual('masteryLevel').get(function() {
  const repetitionScore = Math.min(this.repetitions / 10, 1); // Max score at 10 repetitions
  const easeScore = (this.easeFactor - 1.3) / (4.0 - 1.3); // Normalize ease factor
  const consistencyScore = this.consecutiveCorrect / Math.max(this.totalReviews, 1);
  
  return Math.round((repetitionScore * 0.4 + easeScore * 0.3 + consistencyScore * 0.3) * 100);
});

// Static method to get due reviews for a learner
spacedRepetitionSchema.statics.getDueReviews = function(learnerId, limit = 10) {
  const now = new Date();
  
  return this.find({
    learnerId: mongoose.Types.ObjectId(learnerId),
    nextReviewDate: { $lte: now },
    isRetired: false
  })
  .populate('questionId', 'content options correctAnswer explanation category difficulty')
  .sort({ priority: -1, nextReviewDate: 1 })
  .limit(limit);
};

// Static method to get upcoming reviews
spacedRepetitionSchema.statics.getUpcomingReviews = function(learnerId, days = 7) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    learnerId: mongoose.Types.ObjectId(learnerId),
    nextReviewDate: { $gt: now, $lte: futureDate },
    isRetired: false
  })
  .populate('questionId', 'content category difficulty')
  .sort({ nextReviewDate: 1 });
};

// Static method to get review statistics
spacedRepetitionSchema.statics.getReviewStats = function(learnerId) {
  const now = new Date();
  
  return this.aggregate([
    { $match: { learnerId: mongoose.Types.ObjectId(learnerId) } },
    {
      $group: {
        _id: null,
        totalCards: { $sum: 1 },
        dueCards: {
          $sum: {
            $cond: [
              { $and: [{ $lte: ['$nextReviewDate', now] }, { $eq: ['$isRetired', false] }] },
              1,
              0
            ]
          }
        },
        retiredCards: { $sum: { $cond: ['$isRetired', 1, 0] } },
        averageEaseFactor: { $avg: '$easeFactor' },
        averageInterval: { $avg: '$interval' },
        totalReviews: { $sum: '$totalReviews' },
        masteredCards: {
          $sum: {
            $cond: [
              { $and: [{ $gte: ['$repetitions', 5] }, { $gte: ['$easeFactor', 2.8] }] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalCards: 1,
        dueCards: 1,
        retiredCards: 1,
        activeCards: { $subtract: ['$totalCards', '$retiredCards'] },
        averageEaseFactor: { $round: ['$averageEaseFactor', 2] },
        averageInterval: { $round: ['$averageInterval', 1] },
        totalReviews: 1,
        masteredCards: 1,
        masteryRate: {
          $cond: {
            if: { $eq: ['$totalCards', 0] },
            then: 0,
            else: { $divide: ['$masteredCards', '$totalCards'] }
          }
        }
      }
    }
  ]);
};

// Static method to schedule new card
spacedRepetitionSchema.statics.scheduleNewCard = function(questionId, learnerId, category, difficulty) {
  const now = new Date();
  const nextReview = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 1 day from now
  
  return this.create({
    questionId,
    learnerId,
    category,
    difficulty,
    nextReviewDate: nextReview,
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    lastReviewed: now,
    priority: Math.max(1, 6 - difficulty) // Higher difficulty = higher priority
  });
};

// Instance method to update based on review performance
spacedRepetitionSchema.methods.updateFromReview = function(quality, responseTime) {
  this.lastReviewed = new Date();
  this.totalReviews += 1;
  this.quality = quality;
  
  // Update average response time
  this.averageResponseTime = ((this.averageResponseTime * (this.totalReviews - 1)) + responseTime) / this.totalReviews;
  
  // Update consecutive correct count
  if (quality >= 3) {
    this.consecutiveCorrect += 1;
  } else {
    this.consecutiveCorrect = 0;
  }
  
  // SM-2 Algorithm implementation
  if (quality >= 3) {
    // Correct response
    if (this.repetitions === 0) {
      this.interval = 1;
    } else if (this.repetitions === 1) {
      this.interval = 6;
    } else {
      this.interval = Math.round(this.interval * this.easeFactor);
    }
    this.repetitions += 1;
  } else {
    // Incorrect response - reset repetitions but keep some interval
    this.repetitions = 0;
    this.interval = Math.max(1, this.interval * 0.2); // Reduce interval significantly
  }
  
  // Update ease factor based on quality
  this.easeFactor = Math.max(1.3, this.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  
  // Adjust interval based on response time (faster response = slightly longer interval)
  if (responseTime < 10) { // Very fast response (< 10 seconds)
    this.interval *= 1.1;
  } else if (responseTime > 120) { // Slow response (> 2 minutes)
    this.interval *= 0.9;
  }
  
  // Set next review date
  this.nextReviewDate = new Date(Date.now() + (this.interval * 24 * 60 * 60 * 1000));
  
  // Check if card should be retired (mastered)
  if (this.repetitions >= 8 && this.easeFactor >= 3.0 && this.consecutiveCorrect >= 5) {
    this.isRetired = true;
    this.retiredAt = new Date();
  }
  
  return this.save();
};

// Instance method to reset card (for difficult questions)
spacedRepetitionSchema.methods.resetCard = function() {
  this.repetitions = 0;
  this.interval = 1;
  this.easeFactor = Math.max(1.3, this.easeFactor - 0.2);
  this.consecutiveCorrect = 0;
  this.nextReviewDate = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 1 day from now
  this.priority = Math.min(5, this.priority + 1); // Increase priority
  
  return this.save();
};

// Instance method to boost priority
spacedRepetitionSchema.methods.boostPriority = function() {
  this.priority = Math.min(5, this.priority + 1);
  return this.save();
};

// Pre-save middleware
spacedRepetitionSchema.pre('save', function(next) {
  // Ensure interval is reasonable
  if (this.interval > 365) {
    this.interval = 365; // Cap at 1 year
  }
  
  // Ensure next review date is not in the past for new cards
  if (this.isNew && this.nextReviewDate < new Date()) {
    this.nextReviewDate = new Date(Date.now() + (this.interval * 24 * 60 * 60 * 1000));
  }
  
  next();
});

module.exports = mongoose.model('SpacedRepetition', spacedRepetitionSchema);