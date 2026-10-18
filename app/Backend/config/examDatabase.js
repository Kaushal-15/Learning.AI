const mongoose = require('mongoose');
const examMasterSchema = require('../models/ExamMaster');
const examQuestionSchema = require('../models/ExamQuestion');
const examSessionSchema = require('../models/ExamSession');
const examAttemptSchema = require('../models/ExamAttempt');
const examLogSchema = require('../models/ExamLog');

let examConn;

const getExamConnection = () => {
    if (!examConn) {
        const primaryURI = (process.env.MONGODB_URI || process.env.MONGODB_TEST_URI || '').replace(/^["']|["']$/g, '').trim();
        let examMongoURI = (process.env.EXAM_MONGODB_URI || primaryURI || 'mongodb://localhost:27017/learning-ai').replace(/^["']|["']$/g, '').trim();
        if (examMongoURI.startsWith('mongodb+srv://') && !examMongoURI.includes('authSource=')) {
            examMongoURI += (examMongoURI.includes('?') ? '&' : '?') + 'authSource=admin';
        }
        examConn = mongoose.createConnection(examMongoURI, {
            dbName: 'learning-ai',
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 8000,
            socketTimeoutMS: 45000,
        });

        examConn.on('connected', () => {
            console.log(`✅ Exam MongoDB Connected: ${examConn.host}`);
        });

        examConn.on('error', (err) => {
            console.error('❌ Exam MongoDB connection error:', err);
        });
    }
    return examConn;
};

const conn = getExamConnection();

const ExamMaster = conn.model('ExamMaster', examMasterSchema);
const ExamQuestion = conn.model('ExamQuestion', examQuestionSchema);
const ExamSession = conn.model('ExamSession', examSessionSchema);
const ExamAttempt = conn.model('ExamAttempt', examAttemptSchema);
const ExamLog = conn.model('ExamLog', examLogSchema);

// Import the new models directly since they export the model
const AdaptiveDifficulty = require('../models/AdaptiveDifficulty');
const ExamQuestionResult = require('../models/ExamQuestionResult');

module.exports = {
    ExamMaster,
    ExamQuestion,
    ExamSession,
    ExamAttempt,
    ExamLog,
    AdaptiveDifficulty,
    ExamQuestionResult,
    getExamConnection
};
