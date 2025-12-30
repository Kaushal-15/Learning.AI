const mongoose = require('mongoose');

/**
 * UserProgress Model
 * Tracks detailed user progress per roadmap including completed topics, plans, and XP earned
 */
const userProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    roadmapId: {
        type: String,
        required: [true, 'Roadmap ID is required'],
        index: true
    },
    completedTopics: [{
        type: String,
        required: true
    }],
    completedPlans: [{
        type: String,
        required: true
    }],
    completedQuestions: [{
        type: String,
        required: true
    }],
    progressPercent: {
        type: Number,
        default: 0,
        min: [0, 'Progress cannot be negative'],
        max: [100, 'Progress cannot exceed 100']
    },
    xpEarned: {
        type: Number,
        default: 0,
        min: [0, 'XP cannot be negative']
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    submittedProjects: [{
        projectId: { type: String, required: true },
        submissionUrl: { type: String, required: true },
        submittedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['completed'], default: 'completed' }
    }]
}, {
    timestamps: true
});

// Compound index for efficient queries (one progress record per user per roadmap)
userProgressSchema.index({ userId: 1, roadmapId: 1 }, { unique: true });

// Index for sorting by progress
userProgressSchema.index({ progressPercent: -1 });
userProgressSchema.index({ xpEarned: -1 });

/**
 * Check if a topic has already been completed
 * @param {String} topicId - Topic identifier
 * @returns {Boolean}
 */
userProgressSchema.methods.isTopicCompleted = function (topicId) {
    return this.completedTopics.includes(topicId);
};

/**
 * Check if a plan has already been completed
 * @param {String} planId - Plan identifier
 * @returns {Boolean}
 */
userProgressSchema.methods.isPlanCompleted = function (planId) {
    return this.completedPlans.includes(planId);
};

/**
 * Check if a question has already been completed
 * @param {String} questionId - Question identifier
 * @returns {Boolean}
 */
userProgressSchema.methods.isQuestionCompleted = function (questionId) {
    return this.completedQuestions.includes(questionId);
};

/**
 * Mark a topic as completed (idempotent)
 * @param {String} topicId - Topic identifier
 * @returns {Boolean} - True if newly added, false if already existed
 */
userProgressSchema.methods.completeTopicSafe = function (topicId) {
    if (!this.isTopicCompleted(topicId)) {
        this.completedTopics.push(topicId);
        this.lastUpdated = new Date();
        return true;
    }
    return false;
};

/**
 * Mark a plan as completed (idempotent)
 * @param {String} planId - Plan identifier
 * @returns {Boolean} - True if newly added, false if already existed
 */
userProgressSchema.methods.completePlanSafe = function (planId) {
    if (!this.isPlanCompleted(planId)) {
        this.completedPlans.push(planId);
        this.lastUpdated = new Date();
        return true;
    }
    return false;
};

/**
 * Mark a question as completed (idempotent)
 * @param {String} questionId - Question identifier
 * @returns {Boolean} - True if newly added, false if already existed
 */
userProgressSchema.methods.completeQuestionSafe = function (questionId) {
    if (!this.isQuestionCompleted(questionId)) {
        this.completedQuestions.push(questionId);
        this.lastUpdated = new Date();
        return true;
    }
    return false;
};

/**
 * Add XP to this roadmap's progress
 * @param {Number} xp - Amount of XP to add
 */
userProgressSchema.methods.addXP = function (xp) {
    this.xpEarned += xp;
    this.lastUpdated = new Date();
};

/**
 * Submit a project
 * @param {String} projectId - Project identifier
 * @param {String} submissionUrl - URL of the submission
 * @returns {Boolean} - True if newly submitted, false if already submitted
 */
userProgressSchema.methods.submitProject = function (projectId, submissionUrl) {
    const existingSubmission = this.submittedProjects.find(p => p.projectId === projectId);
    if (!existingSubmission) {
        this.submittedProjects.push({
            projectId,
            submissionUrl,
            submittedAt: new Date(),
            status: 'completed'
        });
        this.lastUpdated = new Date();
        return true;
    }
    // Update existing submission URL if needed
    if (existingSubmission.submissionUrl !== submissionUrl) {
        existingSubmission.submissionUrl = submissionUrl;
        existingSubmission.submittedAt = new Date();
        this.lastUpdated = new Date();
        return true;
    }
    return false;
};

/**
 * Submit a project
 * @param {String} projectId - Project identifier
 * @param {String} submissionUrl - URL of the submission
 * @returns {Boolean} - True if newly submitted, false if already submitted
 */
userProgressSchema.methods.submitProject = function (projectId, submissionUrl) {
    const existingSubmission = this.submittedProjects.find(p => p.projectId === projectId);
    if (!existingSubmission) {
        this.submittedProjects.push({
            projectId,
            submissionUrl,
            submittedAt: new Date(),
            status: 'completed'
        });
        this.lastUpdated = new Date();
        return true;
    }
    // Update existing submission URL if needed
    if (existingSubmission.submissionUrl !== submissionUrl) {
        existingSubmission.submissionUrl = submissionUrl;
        existingSubmission.submittedAt = new Date();
        this.lastUpdated = new Date();
        return true;
    }
    return false;
};

/**
 * Calculate progress percentage based on total topics in roadmap
 * @param {Number} totalTopics - Total number of topics in the roadmap
 */
userProgressSchema.methods.calculateProgress = function (totalTopics) {
    if (totalTopics > 0) {
        this.progressPercent = Math.round((this.completedTopics.length / totalTopics) * 100);
    } else {
        this.progressPercent = 0;
    }
    this.lastUpdated = new Date();
};

// Pre-save middleware to update lastUpdated
userProgressSchema.pre('save', function (next) {
    this.lastUpdated = new Date();
    next();
});

// Static method to get or create progress record
userProgressSchema.statics.getOrCreate = async function (userId, roadmapId) {
    let progress = await this.findOne({ userId, roadmapId });

    if (!progress) {
        progress = new this({
            userId,
            roadmapId,
            completedTopics: [],
            completedPlans: [],
            completedQuestions: [],
            progressPercent: 0,
            xpEarned: 0
        });
        await progress.save();
    }

    return progress;
};

module.exports = mongoose.model('UserProgress', userProgressSchema);
