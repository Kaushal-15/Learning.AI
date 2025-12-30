const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    index: {
        type: Number,
        required: true
    },
    tags: [{
        type: String
    }],
    difficulty: {
        type: String,
        enum: ['basic', 'intermediate', 'advanced'],
        default: 'intermediate'
    },
    metadata: {
        type: Map,
        of: String
    }
}, {
    timestamps: true
});

// Index for efficient retrieval
chunkSchema.index({ documentId: 1, index: 1 });
chunkSchema.index({ difficulty: 1 });

module.exports = mongoose.model('Chunk', chunkSchema);
