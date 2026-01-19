const mongoose = require('mongoose');
const examMasterSchema = require('./models/ExamMaster');
require('dotenv').config();

const ExamMaster = mongoose.models.ExamMaster || mongoose.model('ExamMaster', examMasterSchema);

async function checkExamConfig() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/learning-ai');
        console.log('✅ Connected to MongoDB\n');

        // Find the most recent exam
        const exam = await ExamMaster.findOne().sort({ createdAt: -1 });

        if (!exam) {
            console.log('❌ No exams found in database!');
            console.log('👉 CREATE AN EXAM FIRST via Admin Dashboard');
            return;
        }

        console.log('📋 Latest Exam Configuration:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Title: ${exam.title}`);
        console.log(`Exam Code: ${exam.examCode}`);
        console.log(`Exam Type: ${exam.examType}`);
        console.log(`Is Adaptive: ${exam.isAdaptive}`);
        console.log(`Is Synchronized: ${exam.isSynchronized || false}`);
        console.log('\n🔒 Security Settings:');
        console.log(`  ├─ Require Biometric: ${exam.requireBiometric || false}`);
        console.log(`  ├─ Require Camera: ${exam.requireCamera || false}`);
        console.log(`  ├─ Allow Recording: ${exam.allowRecording || false}`);
        console.log(`  └─ Auto Record: ${exam.autoRecord || false}`);

        console.log('\n⏰ Timing:');
        console.log(`  ├─ Start: ${exam.startTime}`);
        console.log(`  ├─ End: ${exam.endTime}`);
        console.log(`  └─ Duration: ${exam.duration} minutes`);

        // Check if settings are enabled
        if (!exam.requireBiometric && !exam.requireCamera) {
            console.log('\n⚠️  WARNING: Both biometric and camera are DISABLED!');
            console.log('👉 You need to create a NEW exam with these settings enabled.');
        } else if (!exam.requireBiometric) {
            console.log('\n⚠️  WARNING: Biometric is DISABLED');
        } else if (!exam.requireCamera) {
            console.log('\n⚠️  WARNING: Camera is DISABLED');
        } else {
            console.log('\n✅ Both biometric and camera are ENABLED correctly!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkExamConfig();
