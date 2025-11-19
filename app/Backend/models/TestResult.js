const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
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
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  timeSpent: {
    type: Number, // in seconds
    required: true
  },
  timeTaken: {
    type: Number, // in seconds
    required: true
  },
  detailedResults: [{
    questionId: String,
    question: String,
    userAnswer: String,
    correctAnswer: String,
    isCorrect: Boolean,
    topic: String,
    difficulty: String,
    explanation: String
  }],
  completedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
testResultSchema.index({ userId: 1, completedAt: -1 });
testResultSchema.index({ userId: 1, roadmapType: 1 });

module.exports = mongoose.model('TestResult', testResultSchema);