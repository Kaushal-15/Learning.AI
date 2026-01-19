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
        size: Number
    }],
    totalSize: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CameraRecording', cameraRecordingSchema);