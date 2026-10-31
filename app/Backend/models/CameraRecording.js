const mongoose = require('mongoose');

const cameraRecordingSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamSession',
        required: true
    },
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamMaster',
        required: true
    },
    startedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['recording', 'completed', 'failed'],
        default: 'recording'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date
    },
    videoChunks: [{
        chunkNumber: Number,
        uploadedAt: Date,
        size: Number,
        key: String,
        status: String
    }],
    totalSize: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound index for session telemetry
cameraRecordingSchema.index({ sessionId: 1, status: 1 });

module.exports = mongoose.model('CameraRecording', cameraRecordingSchema);
