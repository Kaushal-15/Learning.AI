// Script to enable security features on existing exam
const mongoose = require('mongoose');
require('dotenv').config();

const ExamMaster = mongoose.model('ExamMaster', require('./app/Backend/models/ExamMaster'));

async function enableSecurityOnAllExams() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Update ALL exams to have security features enabled
        const result = await ExamMaster.updateMany(
            {},
            {
                $set: {
                    requireBiometric: true,
                    requireCamera: true,
                    allowRecording: true,
                    autoRecord: true
                }
            }
        );

        console.log('\n✅ Security features enabled on all exams!');
        console.log(`Modified ${result.modifiedCount} exams`);
        
        // Show updated exams
        const exams = await ExamMaster.find().select('examCode title requireBiometric requireCamera');
        console.log('\n📋 Current exam settings:');
        exams.forEach(exam => {
            console.log(`\n  Code: ${exam.examCode}`);
            console.log(`  Title: ${exam.title}`);
            console.log(`  Biometric: ${exam.requireBiometric ? '✅ ON' : '❌ OFF'}`);
            console.log(`  Camera: ${exam.requireCamera ? '✅ ON' : '❌ OFF'}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

enableSecurityOnAllExams();
