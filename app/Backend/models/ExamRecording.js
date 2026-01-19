const mongoose = require('mongoose');

const examRecordingSchema = new mongoose.Schema({
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamMaster',
        required: true
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamSession',
        required: true
    },
    studentName: {
        type: String,
        required: true
    },
    registerNumber: {
        type: String,
        required: true
    },
    // Recording file information
    filePath: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number // in bytes
    },
    duration: {
        type: Number // in seconds
    },
    // Recording timing
    recordingStartTime: {
        type: Date,
        required: true
    },
    recordingEndTime: {
        type: Date
    },
    // Recording trigger
    triggeredBy: {
        type: String,
        enum: ['admin', 'auto', 'violation'],
        default: 'admin'
    },
    triggeredByAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Recording status
    status: {
        type: String,
        enum: ['recording', 'completed', 'failed'],
        default: 'recording'
    },
    // Chunks received (for tracking upload progress)
    chunksReceived: {
        type: Number,
        default: 0
    },
    // Error information if failed
    errorMessage: {
        type: String
    }
}, {
    timestamps: true
});

// Index for quick lookups
examRecordingSchema.index({ examId: 1, sessionId: 1 });
examRecordingSchema.index({ status: 1 });

module.exports = mongoose.model('ExamRecording', examRecordingSchema);
