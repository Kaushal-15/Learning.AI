const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const Question = require('./models/Question');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/learning_ai';

async function importQuestions() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const questionsDir = path.join(__dirname, 'Questions');
        const files = await fs.readdir(questionsDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        console.log(`\n📚 Found ${jsonFiles.length} question files to import\n`);

        let totalImported = 0;
        let totalSkipped = 0;

        for (const file of jsonFiles) {
            const filePath = path.join(questionsDir, file);
            const fileContent = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(fileContent);

            // Extract roadmap name from filename (e.g., 'full-stack.json' -> 'full-stack-development')
            const roadmapName = file.replace('.json', '');
            const roadmapIdMap = {
                'full-stack': 'full-stack-development',
                'frontend': 'frontend-development',
                'backend': 'backend-development',
                'mobile-app': 'mobile-app-development',
                'ai-machine-learning': 'ai-machine-learning',
                'devops-cloud': 'devops-cloud',
                'database-data-science': 'database-data-science',
                'cybersecurity': 'cybersecurity'
            };

            const roadmapId = roadmapIdMap[roadmapName] || roadmapName;
            const questions = data.questions || [];

            console.log(`📝 Processing ${file} (${questions.length} questions)...`);

            let imported = 0;
            let skipped = 0;

            for (const q of questions) {
                try {
                    // Check if question already exists
                    const existing = await Question.findOne({
                        roadmapId: roadmapId,
                        questionId: q.questionId
                    });

                    if (existing) {
                        skipped++;
                        continue;
                    }

                    // Create new question
                    await Question.create({
                        roadmapId: roadmapId,
                        questionId: q.questionId,
                        question: q.question,
                        options: q.options,
                        answer: q.answer,
                        topic: q.topic,
                        difficulty: q.difficulty,
                        explanation: q.explanation
                    });

                    imported++;
                } catch (err) {
                    console.error(`   ❌ Error importing question ${q.questionId}:`, err.message);
                }
            }

            totalImported += imported;
            totalSkipped += skipped;

            console.log(`   ✅ Imported: ${imported}, Skipped: ${skipped}`);
        }

        console.log(`\n🎉 Import Complete!`);
        console.log(`   Total Imported: ${totalImported}`);
        console.log(`   Total Skipped: ${totalSkipped}`);
        console.log(`   Total Questions in DB: ${totalImported + totalSkipped}\n`);

    } catch (error) {
        console.error('❌ Import failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
    }
}

// Run the import
importQuestions();
