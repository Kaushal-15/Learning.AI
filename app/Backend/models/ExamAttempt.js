const mongoose = require('mongoose');

const examAttemptSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamMaster', required: true },
    studentName: { type: String },
    registerNumber: { type: String },
    answers: {
        type: Map,
        of: String
    },
    score: { type: Number },
    accuracy: { type: Number },
    totalQuestions: { type: Number },
    correctAnswers: { type: Number },
    timeTaken: { type: Number }, // in seconds
    submittedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['completed', 'terminated'], default: 'completed' }
}, { timestamps: true });

module.exports = examAttemptSchema;
