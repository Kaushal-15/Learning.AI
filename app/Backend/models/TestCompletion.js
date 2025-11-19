const mongoose = require('mongoose');

const testCompletionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roadmapType: {
    type: String,
    required: true
  },
  testCategory: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    required: true
  },
  isCompleted: {
    type: Boolean,
    default: true
  },
  bestScore: {
    type: Number,
    required: true
  },
  attemptCount: {
    type: Number,
    default: 1
  },
  lastAttemptDate: {
    type: Date,
    default: Date.now
  },
  firstCompletionDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one record per user-roadmap-category-difficulty combination
testCompletionSchema.index({ userId: 1, roadmapType: 1, testCategory: 1, difficulty: 1 }, { unique: true });

module.exports = mongoose.model('TestCompletion', testCompletionSchema);