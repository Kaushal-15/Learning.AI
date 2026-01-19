const mongoose = require('mongoose');

const examLogSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamMaster', required: true },
    eventType: { type: String, required: true }, // 'tab_switch', 'blur', 'refresh', 'dev_tools'
    details: { type: String },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = examLogSchema;
