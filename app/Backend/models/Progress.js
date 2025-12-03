const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roadmapId: {
    type: String,
    required: true
  },
  completedLessons: [{
    lessonId: { type: String, required: true },
    completedAt: { type: Date, default: Date.now },
    timeSpent: { type: Number, default: 0 }, // in minutes
    quizScore: { type: Number, default: 0 } // percentage
  }],
  currentLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  overallProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
progressSchema.index({ userId: 1, roadmapId: 1 }, { unique: true });
progressSchema.index({ userId: 1 });
progressSchema.index({ roadmapId: 1 });

// Method to mark lesson as completed
progressSchema.methods.completeLesson = function (lessonId, timeSpent = 0, quizScore = 0) {
  const existingLesson = this.completedLessons.find(l => l.lessonId === lessonId);

  if (existingLesson) {
    // Update existing completion
    existingLesson.completedAt = new Date();
    existingLesson.timeSpent = timeSpent;
    existingLesson.quizScore = quizScore;
  } else {
    // Add new completion
    this.completedLessons.push({
      lessonId,
      timeSpent,
      quizScore
    });
  }

  this.lastAccessedAt = new Date();
  return this.save();
};

// Method to calculate overall progress
progressSchema.methods.calculateProgress = async function () {
  const Roadmap = require('./Roadmap');
  const DailyLearningPlan = require('./DailyLearningPlan');

  // Try to find static roadmap first
  const roadmap = await Roadmap.findOne({ roadmapId: this.roadmapId });

  let totalLessons = 0;

  if (roadmap && roadmap.levels && roadmap.levels.length > 0) {
    // Use static roadmap structure
    roadmap.levels.forEach(level => {
      totalLessons += level.lessons.length;
    });
  } else {
    // Fallback to dynamic learning plan
    // We need to normalize the roadmapId first as stored in DailyLearningPlan
    const normalizeRoadmapId = (id) => {
      const mapping = {
        'full-stack': 'full-stack-development',
        'frontend': 'frontend-development',
        'backend': 'backend-development',
        'mobile': 'mobile-app-development',
        'database': 'database-data-science',
        'cybersecurity': 'cybersecurity',
        'devops': 'devops-cloud',
        'ai-ml': 'ai-machine-learning'
      };
      return mapping[id] || id;
    };

    const normalizedId = normalizeRoadmapId(this.roadmapId);
    totalLessons = await DailyLearningPlan.countDocuments({ roadmapId: normalizedId });
  }

  if (totalLessons === 0) {
    // Avoid division by zero, default to 100 if no lessons found (or 0 depending on logic)
    // If no lessons exist, progress is 0
    this.overallProgress = 0;
  } else {
    this.overallProgress = Math.round((this.completedLessons.length / totalLessons) * 100);
  }

  // Update current level based on progress
  if (this.overallProgress >= 80) {
    this.currentLevel = 'Advanced';
  } else if (this.overallProgress >= 40) {
    this.currentLevel = 'Intermediate';
  } else {
    this.currentLevel = 'Beginner';
  }

  return this.save();
};

module.exports = mongoose.model('Progress', progressSchema);