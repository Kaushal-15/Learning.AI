const mongoose = require('mongoose');
const examMasterSchema = require('./models/ExamMaster');
require('dotenv').config();

const ExamMaster = mongoose.models.ExamMaster || mongoose.model('ExamMaster', examMasterSchema);

async function checkExam() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/learning-ai');
        console.log('✅ Connected\n');

        const exam = await ExamMaster.findOne({ examCode: 'LCNV58MF' });

        if (!exam) {
            console.log('❌ Exam LCNV58MF NOT FOUND');
            return;
        }

        console.log('📋 Exam: ' + exam.title);
        console.log('\n🔒 Security Settings:');
        console.log(`requireBiometric: ${exam.requireBiometric}`);
        console.log(`requireCamera: ${exam.requireCamera}`);
        console.log(`autoRecord: ${exam.autoRecord}`);

        if (!exam.requireBiometric) {
            console.log('\n❌ PROBLEM: requireBiometric is FALSE');
            console.log('👉 You need to recreate this exam with biometric ENABLED');
        } else {
            console.log('\n✅ Biometric is enabled - bypass is a code bug');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

checkExam();
