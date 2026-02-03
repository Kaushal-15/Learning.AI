const mongoose = require('mongoose');

const syncExamStatsSchema = new mongoose.Schema({
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
    questionNumber: {
        type: Number,
        required: true
    },
    totalResponses: {
        type: Number,
        default: 0
    },
    correctResponses: {
        type: Number,
        default: 0
    },
    correctPercentage: {
        type: Number,
        default: 0
    },
    currentDifficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        required: true
    },
    nextDifficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: null
    },
    thresholdMet: {
        type: Boolean,
        default: false
    },
    adminOverride: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: null
    },
    responses: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        answer: {
            type: String,
            required: true
        },
        isCorrect: {
            type: Boolean,
            required: true
        },
        submittedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Index for quick lookups
syncExamStatsSchema.index({ examId: 1, questionNumber: 1 }, { unique: true });
syncExamStatsSchema.index({ examId: 1, questionId: 1 });

// Method to update statistics when a new response is received
syncExamStatsSchema.methods.addResponse = function(userId, answer, isCorrect) {
    // Check if user already responded
    const existingResponse = this.responses.find(r => r.userId.toString() === userId.toString());
    if (existingResponse) {
        return false; // User already responded
    }

    // Add new response
    this.responses.push({
        userId,
        answer,
        isCorrect,
        submittedAt: new Date()
    });

    // Update statistics
    this.totalResponses = this.responses.length;
    this.correctResponses = this.responses.filter(r => r.isCorrect).length;
    this.correctPercentage = this.totalResponses > 0 ? 
        Math.round((this.correctResponses / this.totalResponses) * 100) : 0;

    // Check if 60% threshold is met
    this.thresholdMet = this.correctPercentage >= 60;

    return true; // Response added successfully
};

// Method to determine next difficulty based on admin routing and threshold
syncExamStatsSchema.methods.determineNextDifficulty = function(adaptiveRouting) {
    if (this.adminOverride) {
        return this.adminOverride;
    }

    if (!this.thresholdMet || !adaptiveRouting || !adaptiveRouting[this.currentDifficulty]) {
        return this.currentDifficulty; // Stay at same difficulty
    }

    const routing = adaptiveRouting[this.currentDifficulty];
    const options = this.correctPercentage >= 60 ? routing.correct : routing.wrong;
    
    // For synchronized mode, use the first option (admin's primary choice)
    return options && options.length > 0 ? options[0] : this.currentDifficulty;
};

module.exports = mongoose.model('SyncExamStats', syncExamStatsSchema);