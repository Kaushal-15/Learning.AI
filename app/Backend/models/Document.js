const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    path: {
        type: String,
        required: false
    },
    storageKey: {
        type: String
    },
    status: {
        type: String,
        enum: ['uploaded', 'processing', 'processed', 'failed'],
        default: 'uploaded'
    },
    failureReason: {
        type: String
    },
    processed: {
        type: Boolean,
        default: false
    },
    chunkCount: {
        type: Number,
        default: 0
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Document', documentSchema);
