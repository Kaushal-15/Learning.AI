const mongoose = require('mongoose');

const questionHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roadmapType: {
    type: String,
    required: true
  },
  questionId: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'advanced'],
    required: true
  },
  userAnswer: {
    type: String,
    required: true
  },
  correctAnswer: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  timeSpent: {
    type: Number, // seconds
    default: 0
  },
  attemptCount: {
    type: Number,
    default: 1
  },
  lastAttempted: {
    type: Date,
    default: Date.now
  },
  firstAttempted: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
questionHistorySchema.index({ userId: 1, roadmapType: 1, questionId: 1 }, { unique: true });
questionHistorySchema.index({ userId: 1, roadmapType: 1, topic: 1 });
questionHistorySchema.index({ userId: 1, roadmapType: 1, difficulty: 1 });

module.exports = mongoose.model('QuestionHistory', questionHistorySchema);