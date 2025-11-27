const mongoose = require('mongoose');

const userPerformanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roadmapType: {
    type: String,
    required: true
  },
  topicPerformance: [{
    topic: String,
    totalQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    averageTimePerQuestion: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }],
  difficultyPerformance: [{
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'advanced']
    },
    totalQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    averageTimePerQuestion: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }],
  overallStats: {
    totalQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    overallAccuracy: { type: Number, default: 0 },
    averageTimePerQuestion: { type: Number, default: 0 },
    strongTopics: [String], // Topics with >80% accuracy
    weakTopics: [String], // Topics with <60% accuracy
    recommendedDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'advanced'],
      default: 'easy'
    },
    currentStreak: { type: Number, default: 0 }, // Current correct answer streak
    longestStreak: { type: Number, default: 0 }, // Best streak ever
    lastActivityDate: { type: Date, default: Date.now },
    dailyGoal: { type: Number, default: 10 }, // Questions per day goal
    questionsToday: { type: Number, default: 0 }
  },
  adaptiveSettings: {
    currentDifficultyLevel: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'advanced'],
      default: 'easy'
    },
    consecutiveCorrect: { type: Number, default: 0 },
    consecutiveIncorrect: { type: Number, default: 0 },
    lastDifficultyAdjustment: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
userPerformanceSchema.index({ userId: 1, roadmapType: 1 }, { unique: true });

// Method to update performance after each question
userPerformanceSchema.methods.updatePerformance = function(questionData) {
  const { topic, difficulty, isCorrect, timeSpent } = questionData;
  
  // Update topic performance
  let topicPerf = this.topicPerformance.find(t => t.topic === topic);
  if (!topicPerf) {
    topicPerf = { topic, totalQuestions: 0, correctAnswers: 0, accuracy: 0, averageTimePerQuestion: 0 };
    this.topicPerformance.push(topicPerf);
  }
  
  topicPerf.totalQuestions++;
  if (isCorrect) topicPerf.correctAnswers++;
  topicPerf.accuracy = Math.round((topicPerf.correctAnswers / topicPerf.totalQuestions) * 100);
  topicPerf.averageTimePerQuestion = Math.round(
    ((topicPerf.averageTimePerQuestion * (topicPerf.totalQuestions - 1)) + timeSpent) / topicPerf.totalQuestions
  );
  topicPerf.lastUpdated = new Date();
  
  // Update difficulty performance
  let diffPerf = this.difficultyPerformance.find(d => d.difficulty === difficulty);
  if (!diffPerf) {
    diffPerf = { difficulty, totalQuestions: 0, correctAnswers: 0, accuracy: 0, averageTimePerQuestion: 0 };
    this.difficultyPerformance.push(diffPerf);
  }
  
  diffPerf.totalQuestions++;
  if (isCorrect) diffPerf.correctAnswers++;
  diffPerf.accuracy = Math.round((diffPerf.correctAnswers / diffPerf.totalQuestions) * 100);
  diffPerf.averageTimePerQuestion = Math.round(
    ((diffPerf.averageTimePerQuestion * (diffPerf.totalQuestions - 1)) + timeSpent) / diffPerf.totalQuestions
  );
  diffPerf.lastUpdated = new Date();
  
  // Update overall stats
  this.overallStats.totalQuestions++;
  if (isCorrect) this.overallStats.correctAnswers++;
  this.overallStats.overallAccuracy = Math.round(
    (this.overallStats.correctAnswers / this.overallStats.totalQuestions) * 100
  );
  this.overallStats.averageTimePerQuestion = Math.round(
    ((this.overallStats.averageTimePerQuestion * (this.overallStats.totalQuestions - 1)) + timeSpent) / this.overallStats.totalQuestions
  );
  
  // Update strong/weak topics
  this.overallStats.strongTopics = this.topicPerformance
    .filter(t => t.accuracy >= 80 && t.totalQuestions >= 5)
    .map(t => t.topic);
  
  this.overallStats.weakTopics = this.topicPerformance
    .filter(t => t.accuracy < 60 && t.totalQuestions >= 3)
    .map(t => t.topic);
  
  // Update streaks and daily progress
  const today = new Date();
  const lastActivity = new Date(this.overallStats.lastActivityDate);
  const isToday = today.toDateString() === lastActivity.toDateString();
  
  if (!isToday) {
    this.overallStats.questionsToday = 0;
  }
  this.overallStats.questionsToday++;
  this.overallStats.lastActivityDate = today;
  
  if (isCorrect) {
    this.overallStats.currentStreak++;
    if (this.overallStats.currentStreak > this.overallStats.longestStreak) {
      this.overallStats.longestStreak = this.overallStats.currentStreak;
    }
  } else {
    this.overallStats.currentStreak = 0;
  }
  
  // Update adaptive settings
  if (isCorrect) {
    this.adaptiveSettings.consecutiveCorrect++;
    this.adaptiveSettings.consecutiveIncorrect = 0;
  } else {
    this.adaptiveSettings.consecutiveIncorrect++;
    this.adaptiveSettings.consecutiveCorrect = 0;
  }
  
  // Adjust difficulty based on performance
  this.adjustDifficulty();
};

// Method to adjust difficulty based on performance
userPerformanceSchema.methods.adjustDifficulty = function() {
  const { consecutiveCorrect, consecutiveIncorrect, currentDifficultyLevel } = this.adaptiveSettings;
  const overallAccuracy = this.overallStats.overallAccuracy;
  
  let newDifficulty = currentDifficultyLevel;
  
  // Increase difficulty if performing well
  if (consecutiveCorrect >= 5 && overallAccuracy >= 80) {
    if (currentDifficultyLevel === 'easy') newDifficulty = 'medium';
    else if (currentDifficultyLevel === 'medium') newDifficulty = 'hard';
    else if (currentDifficultyLevel === 'hard') newDifficulty = 'advanced';
  }
  
  // Decrease difficulty if struggling
  if (consecutiveIncorrect >= 3 || overallAccuracy < 50) {
    if (currentDifficultyLevel === 'advanced') newDifficulty = 'hard';
    else if (currentDifficultyLevel === 'hard') newDifficulty = 'medium';
    else if (currentDifficultyLevel === 'medium') newDifficulty = 'easy';
  }
  
  if (newDifficulty !== currentDifficultyLevel) {
    this.adaptiveSettings.currentDifficultyLevel = newDifficulty;
    this.adaptiveSettings.lastDifficultyAdjustment = new Date();
    this.adaptiveSettings.consecutiveCorrect = 0;
    this.adaptiveSettings.consecutiveIncorrect = 0;
  }
  
  this.overallStats.recommendedDifficulty = newDifficulty;
};

module.exports = mongoose.model('UserPerformance', userPerformanceSchema);