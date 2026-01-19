const mongoose = require('mongoose');

const examQuestionSchema = new mongoose.Schema({
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamMaster', required: true },
    questionId: { type: String, required: true }, // Reference to original MCQ (UUID)
    content: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String, required: true },
    explanation: { type: String },
    difficulty: { type: Number },
    category: [String],
    order: { type: Number, required: true }
}, { timestamps: true });

module.exports = examQuestionSchema;
