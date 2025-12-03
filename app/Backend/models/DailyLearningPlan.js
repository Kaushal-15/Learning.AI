const mongoose = require('mongoose');

// Video link sub-schema
const videoLinkSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    duration: {
        type: String,
        trim: true
    }
}, { _id: false });

// Mindmap sub-schema
const mindmapSchema = new mongoose.Schema({
    mainConcept: {
        type: String,
        required: true,
        trim: true
    },
    subConcepts: [{
        type: String,
        required: true,
        trim: true
    }],
    useCases: [{
        type: String,
        trim: true
    }],
    commonMistakes: [{
        type: String,
        trim: true
    }]
}, { _id: false });

// Text learning sub-schema
const textLearningSchema = new mongoose.Schema({
    sources: [{
        type: String,
        enum: ['w3schools', 'geeksforgeeks', 'notebooklm'],
        required: true
    }],
    conceptExplanation: {
        type: String,
        required: true,
        trim: true
    },
    codeExamples: [{
        type: String,
        trim: true
    }],
    realWorldAnalogy: {
        type: String,
        trim: true
    },
    keyPoints: [{
        type: String,
        required: true,
        trim: true
    }]
}, { _id: false });

// Audio learning sub-schema
const audioLearningSchema = new mongoose.Schema({
    script: {
        type: String,
        required: true,
        trim: true
    },
    estimatedDuration: {
        type: String,
        required: true,
        default: '3-5 minutes'
    }
}, { _id: false });

// Video learning sub-schema
const videoLearningSchema = new mongoose.Schema({
    links: [videoLinkSchema]
}, { _id: false });

// Image learning sub-schema
const imageLearningSchema = new mongoose.Schema({
    mindmap: mindmapSchema
}, { _id: false });

// Learning options schema
const learningOptionsSchema = new mongoose.Schema({
    text: textLearningSchema,
    video: videoLearningSchema,
    audio: audioLearningSchema,
    images: imageLearningSchema
}, { _id: false });

// Main Daily Learning Plan schema
const dailyLearningPlanSchema = new mongoose.Schema({
    roadmapId: {
        type: String,
        required: true,
        index: true
    },
    week: {
        type: Number,
        required: true,
        min: 1
    },
    day: {
        type: Number,
        required: true,
        min: 1
    },
    topic: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    difficultyLevel: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Beginner'
    },
    learningGoals: [{
        type: String,
        required: true,
        trim: true
    }],
    learningOptions: {
        type: learningOptionsSchema,
        required: true
    },
    miniRecap: {
        type: String,
        required: true,
        trim: true
    },
    practiceSuggestions: [{
        type: String,
        required: true,
        trim: true
    }],
    optionalChallenge: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
dailyLearningPlanSchema.index({ roadmapId: 1, day: 1 }, { unique: true });
dailyLearningPlanSchema.index({ roadmapId: 1, week: 1 });
dailyLearningPlanSchema.index({ roadmapId: 1, topic: 1 });
dailyLearningPlanSchema.index({ difficultyLevel: 1 });

// Static method to get all days for a roadmap
dailyLearningPlanSchema.statics.getByRoadmap = function (roadmapId) {
    return this.find({ roadmapId }).sort({ day: 1 });
};

// Static method to get specific day
dailyLearningPlanSchema.statics.getDay = function (roadmapId, day) {
    return this.findOne({ roadmapId, day });
};

// Static method to get week content
dailyLearningPlanSchema.statics.getWeek = function (roadmapId, week) {
    return this.find({ roadmapId, week }).sort({ day: 1 });
};

// Static method to get content by difficulty
dailyLearningPlanSchema.statics.getByDifficulty = function (roadmapId, difficultyLevel) {
    return this.find({ roadmapId, difficultyLevel }).sort({ day: 1 });
};

module.exports = mongoose.model('DailyLearningPlan', dailyLearningPlanSchema);
