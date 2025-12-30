#!/usr/bin/env node
/**
 * Schema Migration Script
 * Migrates old schema data to new schema for Questions and DailyLearningPlans
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`),
    subheader: (msg) => console.log(`${colors.bright}${msg}${colors.reset}`)
};

// Connect to MongoDB
async function connectDB() {
    try {
        const mongoURI = process.env.MONGODB_URI;
        if (!mongoURI) {
            throw new Error('MONGODB_URI not found in environment variables');
        }
        await mongoose.connect(mongoURI);
        log.success('Connected to MongoDB');
        return true;
    } catch (error) {
        log.error(`Failed to connect to MongoDB: ${error.message}`);
        return false;
    }
}

// Helper function to convert difficulty string to number
function convertDifficulty(difficultyStr) {
    const difficulty = difficultyStr?.toLowerCase();
    if (difficulty === 'easy') return 2; // Middle of 1-3 range
    if (difficulty === 'medium') return 5; // Middle of 4-6 range
    if (difficulty === 'hard') return 8; // Middle of 7-10 range
    return 5; // Default to medium
}

// Helper function to extract category from roadmapName and topic
function extractCategory(roadmapName, topic) {
    const categories = [];
    if (roadmapName) categories.push(roadmapName);
    if (topic) categories.push(topic);
    return categories.length > 0 ? categories : ['General'];
}

// Migrate Questions
async function migrateQuestions() {
    log.header();
    log.subheader('MIGRATING QUESTIONS');
    log.header();

    try {
        const db = mongoose.connection.db;
        const questionsCollection = db.collection('questions');
        const roadmapsCollection = db.collection('roadmaps');

        // Get all roadmaps for mapping roadmapName to roadmapId
        const roadmaps = await roadmapsCollection.find({}).toArray();
        const roadmapMap = {};
        roadmaps.forEach(r => {
            if (r.title) roadmapMap[r.title] = r._id.toString();
        });

        log.info(`Found ${roadmaps.length} roadmaps for mapping`);

        // Get all questions
        const questions = await questionsCollection.find({}).toArray();
        log.info(`Found ${questions.length} questions to migrate`);

        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const q of questions) {
            try {
                // Check if already migrated (has 'content' field)
                if (q.content) {
                    skipped++;
                    continue;
                }

                // Build update object
                const update = {
                    $set: {},
                    $unset: {}
                };

                // Rename fields
                if (q.question) {
                    update.$set.content = q.question;
                    update.$unset.question = '';
                }

                if (q.answer) {
                    update.$set.correctAnswer = q.answer;
                    update.$unset.answer = '';
                }

                // Convert difficulty
                if (q.difficulty) {
                    update.$set.difficulty = convertDifficulty(q.difficulty);
                }

                // Map roadmapName to roadmapId
                if (q.roadmapName) {
                    const roadmapId = roadmapMap[q.roadmapName];
                    if (roadmapId) {
                        update.$set.roadmapId = roadmapId;
                    }
                    update.$unset.roadmapName = '';
                }

                // Add category
                const category = extractCategory(q.roadmapName, q.topicId);
                update.$set.category = category;

                // Add generatedBy
                update.$set.generatedBy = 'AI';

                // Add default values for new fields
                if (!q.validationScore) update.$set.validationScore = 0.8;
                if (!q.timesUsed) update.$set.timesUsed = 0;
                if (!q.averageTimeSpent) update.$set.averageTimeSpent = 0;
                if (!q.successRate) update.$set.successRate = 0;

                // Perform update
                await questionsCollection.updateOne(
                    { _id: q._id },
                    update
                );

                migrated++;
            } catch (error) {
                log.error(`Failed to migrate question ${q._id}: ${error.message}`);
                errors++;
            }
        }

        log.success(`Migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
        return { migrated, skipped, errors };

    } catch (error) {
        log.error(`Failed to migrate questions: ${error.message}`);
        throw error;
    }
}

// Migrate Daily Learning Plans
async function migrateDailyLearningPlans() {
    log.header();
    log.subheader('MIGRATING DAILY LEARNING PLANS');
    log.header();

    try {
        const db = mongoose.connection.db;
        const plansCollection = db.collection('dailylearningplans');
        const roadmapsCollection = db.collection('roadmaps');

        // Get all roadmaps for mapping
        const roadmaps = await roadmapsCollection.find({}).toArray();
        const roadmapMap = {};
        roadmaps.forEach(r => {
            if (r.title) roadmapMap[r.title] = r._id.toString();
        });

        log.info(`Found ${roadmaps.length} roadmaps for mapping`);

        // Get all plans
        const plans = await plansCollection.find({}).toArray();
        log.info(`Found ${plans.length} daily learning plans to migrate`);

        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const plan of plans) {
            try {
                // Check if already migrated (has 'topic' as string)
                if (plan.topic && typeof plan.topic === 'string') {
                    skipped++;
                    continue;
                }

                const update = {
                    $set: {},
                    $unset: {}
                };

                // Map roadmapName to roadmapId
                if (plan.roadmapName) {
                    const roadmapId = roadmapMap[plan.roadmapName];
                    if (roadmapId) {
                        update.$set.roadmapId = roadmapId;
                    }
                    update.$unset.roadmapName = '';
                }

                // Convert topics array to single topic string
                if (plan.topics && Array.isArray(plan.topics) && plan.topics.length > 0) {
                    update.$set.topic = plan.topics[0].title || plan.topics[0].topicId || 'Unknown Topic';
                    update.$unset.topics = '';
                }

                // Rename summary to miniRecap
                if (plan.summary) {
                    update.$set.miniRecap = plan.summary;
                    update.$unset.summary = '';
                }

                // Calculate week from day
                if (plan.day) {
                    update.$set.week = Math.ceil(plan.day / 7);
                }

                // Set default difficultyLevel
                if (!plan.difficultyLevel) {
                    update.$set.difficultyLevel = 'Beginner';
                }

                // Create learningGoals from tasks if available
                if (plan.tasks && Array.isArray(plan.tasks)) {
                    update.$set.learningGoals = plan.tasks;
                    update.$unset.tasks = '';
                } else {
                    update.$set.learningGoals = ['Complete the daily learning objectives'];
                }

                // Create basic learningOptions structure
                if (!plan.learningOptions) {
                    update.$set.learningOptions = {
                        text: {
                            sources: ['notebooklm'],
                            conceptExplanation: plan.summary || 'Learn the topic concepts',
                            codeExamples: [],
                            keyPoints: plan.tasks || ['Study the topic', 'Practice exercises']
                        },
                        video: {
                            links: []
                        },
                        audio: {
                            script: `Today's topic: ${plan.topics?.[0]?.title || 'Learning'}. ${plan.summary || ''}`,
                            estimatedDuration: '3-5 minutes'
                        },
                        images: {
                            mindmap: {
                                mainConcept: plan.topics?.[0]?.title || 'Topic',
                                subConcepts: [],
                                useCases: [],
                                commonMistakes: []
                            }
                        }
                    };
                }

                // Add practiceSuggestions
                if (!plan.practiceSuggestions) {
                    update.$set.practiceSuggestions = [
                        'Review the key concepts',
                        'Complete practice exercises',
                        'Build a small project'
                    ];
                }

                // Perform update
                await plansCollection.updateOne(
                    { _id: plan._id },
                    update
                );

                migrated++;
            } catch (error) {
                log.error(`Failed to migrate plan ${plan._id}: ${error.message}`);
                errors++;
            }
        }

        log.success(`Migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
        return { migrated, skipped, errors };

    } catch (error) {
        log.error(`Failed to migrate daily learning plans: ${error.message}`);
        throw error;
    }
}

// Main migration function
async function main() {
    log.header();
    log.subheader('DATABASE SCHEMA MIGRATION');
    log.header();

    try {
        // Connect to database
        const connected = await connectDB();
        if (!connected) {
            process.exit(1);
        }

        // Migrate Questions
        const questionResults = await migrateQuestions();

        // Migrate Daily Learning Plans
        const planResults = await migrateDailyLearningPlans();

        // Summary
        log.header();
        log.subheader('MIGRATION SUMMARY');
        log.header();

        log.info('Questions:');
        log.info(`  Migrated: ${questionResults.migrated}`);
        log.info(`  Skipped: ${questionResults.skipped}`);
        log.info(`  Errors: ${questionResults.errors}`);

        log.info('\nDaily Learning Plans:');
        log.info(`  Migrated: ${planResults.migrated}`);
        log.info(`  Skipped: ${planResults.skipped}`);
        log.info(`  Errors: ${planResults.errors}`);

        const totalErrors = questionResults.errors + planResults.errors;
        if (totalErrors === 0) {
            log.success('\n✨ Migration completed successfully!');
        } else {
            log.warning(`\n⚠️  Migration completed with ${totalErrors} errors`);
        }

        log.info('\nNext step: Run verification script to check data integrity');
        log.info('  node verify-db.js');

    } catch (error) {
        log.error(`Migration failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        log.info('\nDatabase connection closed');
    }
}

// Run migration
main();
