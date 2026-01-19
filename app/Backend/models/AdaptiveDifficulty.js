const mongoose = require('mongoose');

const adaptiveDifficultySchema = new mongoose.Schema({
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
    currentDifficulty: {
        type: Number,
        default: 3,
        min: 1,
        max: 10
    },
    questionsAnswered: {
        type: Number,
        default: 0
    },
    correctAnswers: {
        type: Number,
        default: 0
    },
    waitUntil: {
        type: Date,
        default: null
    },
    lastQuestionAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for quick lookups
adaptiveDifficultySchema.index({ userId: 1, examId: 1 }, { unique: true });

module.exports = mongoose.model('AdaptiveDifficulty', adaptiveDifficultySchema);