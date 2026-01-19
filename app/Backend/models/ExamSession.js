const mongoose = require('mongoose');

const examSessionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamMaster', required: true },
    studentName: { type: String },
    registerNumber: { type: String },
    currentQuestionIndex: { type: Number, default: 0 },
    answers: {
        type: Map,
        of: String,
        default: {}
    },
    timeRemaining: { type: Number, required: true }, // in seconds
    status: { type: String, enum: ['active', 'paused', 'submitted'], default: 'active' },
    lastHeartbeat: { type: Date, default: Date.now },
    violations: { type: Number, default: 0 },
    // Dynamic Exam Support
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }], // Generated questions for this session

    // Timer Logic
    startTime: { type: Date, default: Date.now }, // Actual start time
    expiryTime: { type: Date, required: true }, // When the exam auto-submits

    // Adaptive Quiz Fields
    currentQuestionNumber: { type: Number, default: 0 }, // 1-based question number
    questionStartTime: { type: Date }, // when current question was shown
    isWaiting: { type: Boolean, default: false }, // true during wait period
    waitEndTime: { type: Date }, // when wait period ends
    currentDifficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },

    // Individual Performance Tracking
    correctAnswersCount: { type: Number, default: 0 }, // total correct answers
    totalAnsweredCount: { type: Number, default: 0 }, // total questions answered
    consecutiveCorrect: { type: Number, default: 0 }, // consecutive correct answers
    consecutiveIncorrect: { type: Number, default: 0 }, // consecutive incorrect answers
    difficultyHistory: [{
        questionNumber: Number,
        fromDifficulty: String,
        toDifficulty: String,
        reason: String,
        accuracy: Number, // accuracy at time of change
        timestamp: { type: Date, default: Date.now }
    }],

    // Synchronized Exam Fields
    joinedAt: { type: Date, default: Date.now },
    lastSeenQuestionNumber: { type: Number, default: 0 },
    isActiveInExam: { type: Boolean, default: true },

    // Biometric Verification
    biometricVerified: { type: Boolean, default: false },
    biometricAttempts: { type: Number, default: 0 },

    // Camera Monitoring
    cameraEnabled: { type: Boolean, default: false },
    cameraPermissionGranted: { type: Boolean, default: false },
    isBeingRecorded: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = examSessionSchema;
