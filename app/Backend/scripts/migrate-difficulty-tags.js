/**
 * Migration Script: Add difficultyTag to existing questions
 * 
 * This script migrates existing Question documents to add the required difficultyTag field
 * based on their numeric difficulty value.
 * 
 * Mapping:
 * - difficulty 1-3 → 'easy'
 * - difficulty 4-7 → 'medium'  
 * - difficulty 8-10 → 'hard'
 */

const mongoose = require('mongoose');
const Question = require('../models/Question');

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learning-ai', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB connected');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    }
};

const migrateDifficultyTags = async () => {
    try {
        console.log('\n🚀 Starting difficulty tag migration...\n');

        // Find all questions without difficultyTag
        const questionsToMigrate = await Question.find({
            $or: [
                { difficultyTag: { $exists: false } },
                { difficultyTag: null }
            ]
        });

        console.log(`📊 Found ${questionsToMigrate.length} questions to migrate\n`);

        let easyCount = 0;
        let mediumCount = 0;
        let hardCount = 0;
        let errorCount = 0;

        for (const question of questionsToMigrate) {
            try {
                // Determine difficultyTag based on numeric difficulty
                let difficultyTag;
                if (question.difficulty <= 3) {
                    difficultyTag = 'easy';
                    easyCount++;
                } else if (question.difficulty <= 7) {
                    difficultyTag = 'medium';
                    mediumCount++;
                } else {
                    difficultyTag = 'hard';
                    hardCount++;
                }

                // Update the question
                question.difficultyTag = difficultyTag;

                // Set adminApproved to true for existing questions (they were already in use)
                if (question.adminApproved === undefined) {
                    question.adminApproved = true;
                }

                await question.save();

                console.log(`✅ Migrated question ${question._id}: difficulty=${question.difficulty} → difficultyTag='${difficultyTag}'`);
            } catch (err) {
                console.error(`❌ Error migrating question ${question._id}:`, err.message);
                errorCount++;
            }
        }

        console.log('\n📈 Migration Summary:');
        console.log(`   Easy questions: ${easyCount}`);
        console.log(`   Medium questions: ${mediumCount}`);
        console.log(`   Hard questions: ${hardCount}`);
        console.log(`   Errors: ${errorCount}`);
        console.log(`   Total migrated: ${easyCount + mediumCount + hardCount}`);

        console.log('\n✅ Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
};

// Run migration
(async () => {
    await connectDB();
    await migrateDifficultyTags();
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
})();
