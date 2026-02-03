const mongoose = require('mongoose');
const ExamMaster = require('./app/Backend/models/ExamMaster');
require('dotenv').config({ path: './app/Backend/.env' });

async function checkExam() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/learning-ai');
        console.log('Connected to MongoDB');

        const code = '57Z7P8BN';
        const exam = await ExamMaster.findOne({ examCode: code });

        if (exam) {
            console.log('Exam found:');
            console.log(JSON.stringify(exam, null, 2));
        } else {
            console.log(`Exam with code ${code} NOT FOUND.`);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkExam();
