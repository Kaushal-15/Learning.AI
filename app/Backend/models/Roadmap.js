const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  answer: { type: String, required: true },
  explanation: { type: String, required: true }
});

const lessonSchema = new mongoose.Schema({
  lessonId: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  summary: [{ type: String, required: true }],
  quiz: [quizSchema]
});

const levelSchema = new mongoose.Schema({
  levelName: { type: String, required: true },
  overview: { type: String, required: true },
  lessons: [lessonSchema]
});

const roadmapSchema = new mongoose.Schema({
  roadmapId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  skills: [{ type: String, required: true }],
  levels: [levelSchema],
  category: {
    type: String,
    enum: ['dsa', 'backend', 'frontend', 'mobile', 'database', 'ai', 'devops', 'cybersecurity'],
    default: null
  },
  totalTopics: {
    type: Number,
    default: 0,
    min: [0, 'Total topics cannot be negative']
  },
  projects: [{
    id: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    exampleUrl: { type: String, required: true },
    requirements: [String],
    implementationGuide: { type: String },
    techStack: [String],
    learningOutcomes: [String],
    estimatedTime: { type: String },
    difficultyLevel: { type: Number, min: 1, max: 10 },
    features: [String],
    bonusChallenges: [String]
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
roadmapSchema.index({ roadmapId: 1 });
roadmapSchema.index({ 'levels.lessons.lessonId': 1 });

module.exports = mongoose.model('Roadmap', roadmapSchema);