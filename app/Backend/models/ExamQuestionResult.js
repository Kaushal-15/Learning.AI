const mongoose = require('mongoose');

const examQuestionResultSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamMaster',
        required: true
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
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
        type: Number,
        default: 0
    },
    difficulty: {
        type: Number,
        default: 5
    },
    questionNumber: {
        type: Number
    },
    // For synchronized adaptive exams
    totalAttempts: {
        type: Number,
        default: 0
    },
    correctAttempts: {
        type: Number,
        default: 0
    },
    correctPercentage: {
        type: Number,
        default: 0
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for quick lookups
examQuestionResultSchema.index({ userId: 1, examId: 1 });
examQuestionResultSchema.index({ examId: 1, questionNumber: 1 });

module.exports = mongoose.model('ExamQuestionResult', examQuestionResultSchema);