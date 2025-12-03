const mongoose = require('mongoose');

/**
 * ContentCache Schema
 * Stores AI-generated content to reduce API calls and improve response times
 */
const contentCacheSchema = new mongoose.Schema({
    roadmap: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    day: {
        type: Number,
        required: true,
        min: 1,
        index: true
    },
    topic: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    subtopic: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    content_type: {
        type: String,
        required: true,
        enum: ['text', 'video', 'audio', 'image'],
        index: true
    },
    generatedContent: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    expiresAt: {
        type: Date,
        default: () => {
            const ttlDays = parseInt(process.env.CONTENT_CACHE_TTL_DAYS) || 30;
            return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
        },
        index: true
    }
}, {
    timestamps: true
});

// Compound index for efficient cache lookups
contentCacheSchema.index(
    { roadmap: 1, day: 1, topic: 1, subtopic: 1, content_type: 1 },
    { unique: true }
);

// TTL index - automatically delete expired documents
contentCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Find cached content
 */
contentCacheSchema.statics.findCached = function (params) {
    const { roadmap, day, topic, subtopic, content_type } = params;
    return this.findOne({
        roadmap,
        day,
        topic,
        subtopic,
        content_type,
        expiresAt: { $gt: new Date() } // Only return non-expired content
    });
};

/**
 * Save generated content to cache
 */
contentCacheSchema.statics.cacheContent = async function (params, content) {
    const { roadmap, day, topic, subtopic, content_type } = params;

    // Use findOneAndUpdate with upsert to avoid duplicate key errors
    return this.findOneAndUpdate(
        { roadmap, day, topic, subtopic, content_type },
        {
            $set: {
                generatedContent: content,
                expiresAt: new Date(Date.now() + (parseInt(process.env.CONTENT_CACHE_TTL_DAYS) || 30) * 24 * 60 * 60 * 1000)
            }
        },
        { upsert: true, new: true }
    );
};

module.exports = mongoose.model('ContentCache', contentCacheSchema);
