// Quick script to check your exam's security settings
const mongoose = require('mongoose');
require('dotenv').config();

const ExamMaster = mongoose.model('ExamMaster', require('./app/Backend/models/ExamMaster'));

async function checkExamSettings() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get the most recent exam
        const exam = await ExamMaster.findOne().sort({ createdAt: -1 });

        if (!exam) {
            console.log('No exams found in database!');
            return;
        }

        console.log('\n=== EXAM SECURITY SETTINGS ===');
        console.log('Exam Code:', exam.examCode);
        console.log('Title:', exam.title);
        console.log('\nSecurity Features:');
        console.log('  - Require Biometric:', exam.requireBiometric ? '✅ ENABLED' : '❌ DISABLED');
        console.log('  - Require Camera:', exam.requireCamera ? '✅ ENABLED' : '❌ DISABLED');
        console.log('  - Allow Recording:', exam.allowRecording ? '✅ YES' : '❌ NO');
        console.log('  - Auto Record:', exam.autoRecord ? '✅ YES' : '❌ NO');
        console.log('\nOther Settings:');
        console.log('  - Require Student Verification:', exam.requireStudentVerification ? '✅ YES' : '❌ NO');
        console.log('  - Is Adaptive:', exam.isAdaptive ? '✅ YES' : '❌ NO');

        if (!exam.requireBiometric && !exam.requireCamera) {
            console.log('\n⚠️  WARNING: This exam has NO security features enabled!');
            console.log('To enable them, update the exam with:');
            console.log('  requireBiometric: true');
            console.log('  requireCamera: true');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkExamSettings();
