const mongoose = require('mongoose');
const Quiz = require('./models/Quiz');
const fs = require('fs').promises;
const path = require('path');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/learning_ai';

async function testQuizCreation() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Load questions from JSON
        const questionsPath = path.join(__dirname, 'Questions', 'full-stack.json');
        const questionsData = await fs.readFile(questionsPath, 'utf8');
        const { questions: allQuestions } = JSON.parse(questionsData);

        console.log(`\n📚 Loaded ${allQuestions.length} questions from JSON\n`);

        // Take first 5 questions
        const selectedQuestions = allQuestions.slice(0, 5).map(q => {
            // Handle answer format
            let correctAnswer = q.answer;
            let shuffledOptions = [...q.options];

            // Check if answer is letter-based (A, B, C, D)
            if (/^[A-D]$/.test(q.answer)) {
                const matchingOption = q.options.find(option =>
                    option.startsWith(q.answer + '.')
                );
                if (matchingOption) {
                    correctAnswer = matchingOption;
                } else {
                    const letterIndex = q.answer.charCodeAt(0) - 65;
                    if (letterIndex >= 0 && letterIndex < q.options.length) {
                        correctAnswer = q.options[letterIndex];
                    }
                }
            }

            shuffledOptions = shuffledOptions.sort(() => Math.random() - 0.5);

            return {
                questionId: q.questionId,
                question: q.question,
                options: shuffledOptions,
                correctAnswer: correctAnswer,
                originalAnswer: q.answer,
                topic: q.topic,
                difficulty: q.difficulty,
                explanation: q.explanation,
                userAnswer: '',
                isCorrect: false,
                timeSpent: 0,
                status: 'unanswered'
            };
        });

        console.log('First question structure:', JSON.stringify(selectedQuestions[0], null, 2));

        // Create quiz
        const quiz = new Quiz({
            userId: new mongoose.Types.ObjectId(), // Dummy user ID
            title: 'Test Quiz - Medium',
            roadmapType: 'full-stack',
            difficulty: 'medium',
            questions: selectedQuestions,
            totalQuestions: selectedQuestions.length,
            timeLimit: 15,
            isAdaptive: true,
            adaptiveSettings: {
                currentDifficulty: 'medium',
                consecutiveCorrect: 0,
                consecutiveIncorrect: 0,
                difficultyChanges: [],
                fastAnswerThreshold: 10,
                confidenceBoostThreshold: 2,
                difficultyDropThreshold: 1
            }
        });

        console.log('\n🔄 Attempting to save quiz...\n');

        await quiz.save();

        console.log(`\n✅ SUCCESS! Quiz saved with ID: ${quiz._id}`);
        console.log(`   Total questions: ${quiz.totalQuestions}`);
        console.log(`   Questions array length: ${quiz.questions.length}`);

    } catch (error) {
        console.error('\n❌ ERROR saving quiz:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if (error.errors) {
            console.error('\nValidation errors:');
            Object.keys(error.errors).forEach(key => {
                console.error(`  - ${key}: ${error.errors[key].message}`);
            });
        }
        console.error('\nFull error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ MongoDB connection closed');
    }
}

// Run the test
testQuizCreation();
