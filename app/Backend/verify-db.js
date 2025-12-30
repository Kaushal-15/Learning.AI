#!/usr/bin/env node
/**
 * Database Verification Script
 * Checks MongoDB connection and validates data integrity for:
 * - Questions (MCQs)
 * - Daily Learning Paths
 * - Overall data storage
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Question = require('./models/Question');
const DailyLearningPlan = require('./models/DailyLearningPlan');
const Roadmap = require('./models/Roadmap');
const Learner = require('./models/Learner');
const Progress = require('./models/Progress');

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

async function verifyDatabaseConnection() {
    log.header();
    log.subheader('DATABASE CONNECTION VERIFICATION');
    log.header();

    try {
        const mongoUri = process.env.MONGODB_URI;

        if (!mongoUri) {
            log.error('MONGODB_URI not found in environment variables');
            return false;
        }

        log.info(`Connecting to MongoDB...`);
        await mongoose.connect(mongoUri);

        log.success('Successfully connected to MongoDB');
        log.info(`Database: ${mongoose.connection.name}`);
        log.info(`Host: ${mongoose.connection.host}`);
        log.info(`Port: ${mongoose.connection.port}`);

        return true;
    } catch (error) {
        log.error(`Failed to connect to MongoDB: ${error.message}`);
        return false;
    }
}

async function verifyQuestions() {
    log.header();
    log.subheader('QUESTIONS (MCQs) VERIFICATION');
    log.header();

    try {
        const totalQuestions = await Question.countDocuments();
        log.info(`Total Questions in database: ${totalQuestions}`);

        if (totalQuestions === 0) {
            log.warning('No questions found in database');
            return { success: true, count: 0, issues: ['No questions found'] };
        }

        // Check questions by difficulty (1-10 scale)
        const difficultyRanges = [
            { label: 'Easy (1-3)', min: 1, max: 3 },
            { label: 'Medium (4-6)', min: 4, max: 6 },
            { label: 'Hard (7-10)', min: 7, max: 10 }
        ];
        const difficultyStats = {};

        for (const range of difficultyRanges) {
            const count = await Question.countDocuments({
                difficulty: { $gte: range.min, $lte: range.max }
            });
            difficultyStats[range.label] = count;
            log.info(`  ${range.label}: ${count} questions`);
        }

        // Check questions by roadmap
        const questionsByRoadmap = await Question.aggregate([
            { $group: { _id: '$roadmapId', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        log.info('\nQuestions by Roadmap:');
        for (const item of questionsByRoadmap) {
            const roadmap = await Roadmap.findById(item._id);
            const roadmapName = roadmap ? roadmap.title : 'Unknown';
            log.info(`  ${roadmapName}: ${item.count} questions`);
        }

        // Sample a few questions to check data integrity
        const sampleQuestions = await Question.find().limit(3);
        const issues = [];

        log.info('\nSample Questions Validation:');
        for (const q of sampleQuestions) {
            const questionIssues = [];

            if (!q.content || q.content.trim() === '') {
                questionIssues.push('Empty question content');
            }

            if (!q.options || q.options.length !== 4) {
                questionIssues.push(`Invalid options count: ${q.options?.length || 0}`);
            }

            if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
                questionIssues.push(`Invalid correct answer: ${q.correctAnswer}`);
            }

            if (!q.explanation || q.explanation.trim() === '') {
                questionIssues.push('Missing explanation');
            }

            if (!q.category || q.category.length === 0) {
                questionIssues.push('Missing category');
            }

            if (typeof q.difficulty !== 'number' || q.difficulty < 1 || q.difficulty > 10) {
                questionIssues.push(`Invalid difficulty: ${q.difficulty}`);
            }

            if (questionIssues.length > 0) {
                log.warning(`  Question ID ${q._id}: ${questionIssues.join(', ')}`);
                issues.push(...questionIssues);
            } else {
                log.success(`  Question ID ${q._id}: Valid`);
            }
        }

        if (issues.length === 0) {
            log.success('\nAll sampled questions are valid!');
        } else {
            log.warning(`\nFound ${issues.length} issues in sampled questions`);
        }

        return {
            success: true,
            count: totalQuestions,
            difficultyStats,
            roadmapStats: questionsByRoadmap.length,
            issues
        };

    } catch (error) {
        log.error(`Failed to verify questions: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function verifyDailyLearningPlans() {
    log.header();
    log.subheader('DAILY LEARNING PLANS VERIFICATION');
    log.header();

    try {
        const totalPaths = await DailyLearningPlan.countDocuments();
        log.info(`Total Daily Learning Plans: ${totalPaths}`);

        if (totalPaths === 0) {
            log.warning('No daily learning plans found in database');
            return { success: true, count: 0, issues: ['No daily learning plans found'] };
        }

        // Check paths by roadmap
        const pathsByRoadmap = await DailyLearningPlan.aggregate([
            { $group: { _id: '$roadmapId', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        log.info('\nDaily Learning Plans by Roadmap:');
        for (const item of pathsByRoadmap) {
            const roadmap = await Roadmap.findById(item._id);
            const roadmapName = roadmap ? roadmap.title : 'Unknown';
            log.info(`  ${roadmapName}: ${item.count} days`);
        }

        // Sample a few paths to check data integrity
        const samplePaths = await DailyLearningPlan.find().limit(3);
        const issues = [];

        log.info('\nSample Daily Learning Plans Validation:');
        for (const path of samplePaths) {
            const pathIssues = [];

            if (!path.day || path.day < 1) {
                pathIssues.push(`Invalid day: ${path.day}`);
            }

            if (!path.topic || path.topic.trim() === '') {
                pathIssues.push('Empty topic');
            }


            if (!path.miniRecap || path.miniRecap.trim() === '') {
                pathIssues.push('Missing miniRecap');
            }

            if (!path.roadmapId) {
                pathIssues.push('Missing roadmapId');
            }

            if (!path.learningOptions || Object.keys(path.learningOptions).length === 0) {
                pathIssues.push('Missing or empty learningOptions');
            } else {
                // Check learning options structure
                const requiredOptions = ['text', 'video', 'audio', 'images'];
                for (const option of requiredOptions) {
                    if (!path.learningOptions[option]) {
                        pathIssues.push(`Missing ${option} learning option`);
                    }
                }
            }
            if (pathIssues.length > 0) {
                log.warning(`  Day ${path.day} (${path.topic}): ${pathIssues.join(', ')}`);
                issues.push(...pathIssues);
            } else {
                log.success(`  Day ${path.day} (${path.topic}): Valid`);
            }
        }

        if (issues.length === 0) {
            log.success('\nAll sampled daily learning plans are valid!');
        } else {
            log.warning(`\nFound ${issues.length} issues in sampled plans`);
        }

        return {
            success: true,
            count: totalPaths,
            roadmapStats: pathsByRoadmap.length,
            issues
        };

    } catch (error) {
        log.error(`Failed to verify daily learning plans: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function verifyOverallStorage() {
    log.header();
    log.subheader('OVERALL DATA STORAGE VERIFICATION');
    log.header();

    try {
        const stats = {
            users: await Learner.countDocuments(),
            roadmaps: await Roadmap.countDocuments(),
            questions: await Question.countDocuments(),
            dailyPaths: await DailyLearningPlan.countDocuments(),
            progress: await Progress.countDocuments()
        };

        log.info('Database Collection Statistics:');
        log.info(`  Learners: ${stats.users}`);
        log.info(`  Roadmaps: ${stats.roadmaps}`);
        log.info(`  Questions: ${stats.questions}`);
        log.info(`  Daily Learning Plans: ${stats.dailyPaths}`);
        log.info(`  Progress Records: ${stats.progress}`);

        // Check for orphaned data
        log.info('\nChecking for data integrity issues...');

        // Check if all questions reference valid roadmaps
        const questionsWithInvalidRoadmap = await Question.aggregate([
            {
                $lookup: {
                    from: 'roadmaps',
                    localField: 'roadmapId',
                    foreignField: '_id',
                    as: 'roadmap'
                }
            },
            {
                $match: { roadmap: { $size: 0 } }
            },
            {
                $count: 'count'
            }
        ]);

        const orphanedQuestions = questionsWithInvalidRoadmap[0]?.count || 0;
        if (orphanedQuestions > 0) {
            log.warning(`Found ${orphanedQuestions} questions with invalid roadmap references`);
        } else {
            log.success('All questions have valid roadmap references');
        }

        // Check if all daily paths reference valid roadmaps
        const pathsWithInvalidRoadmap = await DailyLearningPlan.aggregate([
            {
                $lookup: {
                    from: 'roadmaps',
                    localField: 'roadmapId',
                    foreignField: '_id',
                    as: 'roadmap'
                }
            },
            {
                $match: { roadmap: { $size: 0 } }
            },
            {
                $count: 'count'
            }
        ]);

        const orphanedPaths = pathsWithInvalidRoadmap[0]?.count || 0;
        if (orphanedPaths > 0) {
            log.warning(`Found ${orphanedPaths} daily plans with invalid roadmap references`);
        } else {
            log.success('All daily learning plans have valid roadmap references');
        }

        // Check database size
        const dbStats = await mongoose.connection.db.stats();
        log.info('\nDatabase Size Information:');
        log.info(`  Data Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
        log.info(`  Storage Size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
        log.info(`  Index Size: ${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`);
        log.info(`  Collections: ${dbStats.collections}`);

        return {
            success: true,
            stats,
            orphanedQuestions,
            orphanedPaths,
            dbStats: {
                dataSizeMB: (dbStats.dataSize / 1024 / 1024).toFixed(2),
                storageSizeMB: (dbStats.storageSize / 1024 / 1024).toFixed(2),
                indexSizeMB: (dbStats.indexSize / 1024 / 1024).toFixed(2),
                collections: dbStats.collections
            }
        };

    } catch (error) {
        log.error(`Failed to verify overall storage: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function generateReport(results) {
    log.header();
    log.subheader('VERIFICATION SUMMARY REPORT');
    log.header();

    const allSuccess = results.connection &&
        results.questions.success &&
        results.dailyPaths.success &&
        results.overall.success;

    if (allSuccess) {
        log.success('DATABASE VERIFICATION PASSED!');
    } else {
        log.error('DATABASE VERIFICATION FAILED!');
    }

    log.info('\nSummary:');
    log.info(`  Connection: ${results.connection ? '✅' : '❌'}`);
    log.info(`  Questions: ${results.questions.success ? '✅' : '❌'} (${results.questions.count || 0} total)`);
    log.info(`  Daily Plans: ${results.dailyPaths.success ? '✅' : '❌'} (${results.dailyPaths.count || 0} total)`);
    log.info(`  Overall Storage: ${results.overall.success ? '✅' : '❌'}`);

    const totalIssues = (results.questions.issues?.length || 0) +
        (results.dailyPaths.issues?.length || 0);

    if (totalIssues > 0) {
        log.warning(`\nTotal Issues Found: ${totalIssues}`);
    } else {
        log.success('\nNo issues found!');
    }

    log.header();
}

async function main() {
    const results = {
        connection: false,
        questions: { success: false },
        dailyPaths: { success: false },
        overall: { success: false }
    };

    try {
        // Step 1: Verify connection
        results.connection = await verifyDatabaseConnection();

        if (!results.connection) {
            log.error('Cannot proceed without database connection');
            process.exit(1);
        }

        // Step 2: Verify Questions
        results.questions = await verifyQuestions();

        // Step 3: Verify Daily Learning Plans
        results.dailyPaths = await verifyDailyLearningPlans();

        // Step 4: Verify Overall Storage
        results.overall = await verifyOverallStorage();

        // Step 5: Generate Report
        await generateReport(results);

    } catch (error) {
        log.error(`Verification failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        log.info('\nDatabase connection closed');
    }
}

// Run the verification
main();
