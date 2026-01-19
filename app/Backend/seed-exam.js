const mongoose = require('mongoose');
require('dotenv').config();
const { ExamMaster, ExamQuestion, getExamConnection } = require('./config/examDatabase');
const Question = require('./models/Question');

async function seedExam() {
    try {
        // Connect to main DB to get some questions
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to main DB');

        const questions = await Question.find().lean().limit(5);
        if (questions.length === 0) {
            console.error('No questions found in main DB. Please seed main DB first.');
            process.exit(1);
        }

        // Delete existing exam if it exists
        await ExamMaster.deleteOne({ examCode: 'DEMO-2025' });

        const exam = new ExamMaster({
            title: 'Demo Certification Exam',
            description: 'A test exam to verify the Exam Engine implementation.',
            examCode: 'DEMO-2025',
            startTime: new Date(Date.now() - 3600000), // Started 1 hour ago
            endTime: new Date(Date.now() + 3600000),   // Ends in 1 hour
            duration: 30,
            totalQuestions: questions.length,
            passingScore: 40,
            status: 'active'
        });

        await exam.save();
        console.log(`Exam created: ${exam.title} (Code: ${exam.examCode})`);

        console.log(`Found ${questions.length} questions`);
        if (questions.length > 0) {
            console.log('First question sample:', JSON.stringify(questions[0], null, 2));
        }
        const examQuestions = questions.map((q, index) => {
            const qId = q._id || q.id || (q._doc && q._doc._id);
            console.log(`Mapping question ${index}: id=${qId}`);
            return {
                examId: exam._id,
                questionId: qId,
                content: q.content,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                difficulty: q.difficulty,
                category: q.category,
                order: index
            };
        });

        await ExamQuestion.insertMany(examQuestions);
        console.log(`Added ${examQuestions.length} questions to the exam.`);

        console.log('Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedExam();
