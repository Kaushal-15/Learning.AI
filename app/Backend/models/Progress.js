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
progressSchema.methods.completeLesson = function(lessonId, timeSpent = 0, quizScore = 0) {
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
progressSchema.methods.calculateProgress = async function() {
  const Roadmap = require('./Roadmap');
  const roadmap = await Roadmap.findOne({ roadmapId: this.roadmapId });
  
  if (!roadmap) return 0;
  
  let totalLessons = 0;
  roadmap.levels.forEach(level => {
    totalLessons += level.lessons.length;
  });
  
  this.overallProgress = Math.round((this.completedLessons.length / totalLessons) * 100);
  
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