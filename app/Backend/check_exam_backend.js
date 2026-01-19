const mongoose = require('mongoose');
const examMasterSchema = require('./models/ExamMaster');
const ExamMaster = mongoose.models.ExamMaster || mongoose.model('ExamMaster', examMasterSchema);
require('dotenv').config();

async function checkExam() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/learning-ai');
        console.log('Connected to MongoDB');

        const User = require('./models/User'); // Assuming User model exists
        const email = 'ct1@gmail.com';
        const user = await User.findOne({ email: email });

        if (user) {
            console.log('User found:');
            console.log(`Name: ${user.name}`);
            console.log(`Role: ${user.role}`);
        } else {
            console.log(`User with email ${email} NOT FOUND.`);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkExam();
