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
  levels: [levelSchema]
}, {
  timestamps: true
});

// Indexes for better query performance
roadmapSchema.index({ roadmapId: 1 });
roadmapSchema.index({ 'levels.lessons.lessonId': 1 });

module.exports = mongoose.model('Roadmap', roadmapSchema);