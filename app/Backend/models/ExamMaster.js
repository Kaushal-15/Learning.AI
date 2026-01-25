const mongoose = require('mongoose');

const examMasterSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    examCode: { type: String, required: true, unique: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true }, // in minutes
    verificationDuration: { type: Number, default: 15 }, // in minutes, time before exam start for verification
    totalQuestions: { type: Number, required: true },
    passingScore: { type: Number, default: 40 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['draft', 'active', 'paused', 'completed'], default: 'draft' },
    examType: { type: String, enum: ['static', 'dynamic', 'mixed'], default: 'static' },

    // Static Exam Fields
    staticQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }], // References to Question bank

    // Dynamic Exam Fields
    dynamicConfig: {
        tags: [{ type: String }], // Filter questions by topic/category
        totalQuestions: { type: Number } // Total questions per student
    },

    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    proctoringConfig: {
        tabSwitchLimit: { type: Number, default: 3 },
        autoSubmitOnViolation: { type: Boolean, default: true }
    },
    controls: {
        tabSwitchDetection: { type: Boolean, default: true },
        autoSubmit: { type: Boolean, default: true },
        resumeSupport: { type: Boolean, default: true }
    },
    students: [{
        registerNumber: { type: String, required: true },
        name: { type: String, required: true },
        hasAttempted: { type: Boolean, default: false },
        hasCompleted: { type: Boolean, default: false }
    }],
    requireStudentVerification: { type: Boolean, default: false },
    // Adaptive Quiz Settings
    isAdaptive: { type: Boolean, default: false },
    timePerQuestion: { type: Number, default: 30 }, // seconds per question
    adaptiveSettings: {
        increaseThreshold: { type: Number, default: 60 }, // % accuracy to increase difficulty
        decreaseThreshold: { type: Number, default: 40 }, // % accuracy to decrease difficulty
        minQuestionsBeforeAdjust: { type: Number, default: 1 }, // minimum questions before adjusting difficulty
        waitTimeMin: { type: Number, default: 5 }, // minimum wait seconds
        waitTimeMax: { type: Number, default: 10 } // maximum wait seconds
    },
    currentDifficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },

    // Synchronized Adaptive Settings (all students see same question at same time)
    isSynchronized: { type: Boolean, default: false },
    currentQuestionNumber: { type: Number, default: 0 }, // Current question shown to all students
    currentQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    currentQuestionStartTime: { type: Date },
    questionTimer: { type: Number, default: 30 }, // Seconds per question
    isQuestionActive: { type: Boolean, default: false }, // Is question currently active
    isInWaitPeriod: { type: Boolean, default: false }, // Between questions (analyzing)
    waitPeriodEndTime: { type: Date },
    allowLateJoin: { type: Boolean, default: false }, // Allow join after start
    examStartedAt: { type: Date }, // When exam actually started

    // Biometric Verification Settings
    requireBiometric: { type: Boolean, default: false }, // Require biometric verification before exam

    // Camera Monitoring Settings
    requireCamera: { type: Boolean, default: false }, // Require camera to be enabled during exam
    allowRecording: { type: Boolean, default: false }, // Allow admin to record exam sessions
    autoRecord: { type: Boolean, default: false } // Automatically record all sessions
}, { timestamps: true });

// Set default routing configuration
examMasterSchema.pre('save', function (next) {
    // If adaptive exam but no routing config, set defaults
    if (this.isAdaptive && (!this.adaptiveRoutingConfig || !this.adaptiveRoutingConfig.easy)) {
        this.adaptiveRoutingConfig = {
            easy: {
                correct: ['easy', 'medium'],
                wrong: ['easy']
            },
            medium: {
                correct: ['medium', 'hard'],
                wrong: ['easy', 'medium']
            },
            hard: {
                correct: ['hard'],
                wrong: ['medium']
            }
        };
    }
    next();
});

module.exports = examMasterSchema;
