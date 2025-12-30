const UserProgress = require('../models/UserProgress');
const UserXP = require('../models/UserXP');
const Roadmap = require('../models/Roadmap');

/**
 * XP Rules Configuration
 * Define XP awards for different difficulty levels and activities
 */
const XP_RULES = {
    DIFFICULTY: {
        easy: 10,
        medium: 20,
        hard: 30,
        advanced: 50
    },
    STREAK_BONUS: 100, // Awarded every 7 days
    ACTIVITY_MULTIPLIERS: {
        topic: 1.0,
        plan: 1.5,
        question: 0.5
    }
};

/**
 * Roadmap Category Mapping
 * Maps roadmap IDs to their parent categories for XP pooling
 */
const ROADMAP_CATEGORIES = {
    // DSA Category
    'dsa': 'dsa',
    'data-structures-algorithms': 'dsa',
    'arrays': 'dsa',
    'strings': 'dsa',
    'linked-lists': 'dsa',
    'trees': 'dsa',
    'graphs': 'dsa',

    // Backend Category
    'backend': 'backend',
    'backend-development': 'backend',
    'nodejs': 'backend',
    'express': 'backend',
    'mongodb': 'backend',
    'api-development': 'backend',

    // Frontend Category
    'frontend': 'frontend',
    'frontend-development': 'frontend',
    'react': 'frontend',
    'vue': 'frontend',
    'angular': 'frontend',
    'html-css': 'frontend',

    // Mobile Category
    'mobile': 'mobile',
    'mobile-app-development': 'mobile',
    'ios': 'mobile',
    'android': 'mobile',
    'react-native': 'mobile',
    'flutter': 'mobile',

    // Database Category
    'database': 'database',
    'database-data-science': 'database',
    'sql': 'database',
    'nosql': 'database',
    'data-science': 'database',

    // AI Category
    'ai': 'ai',
    'ai-ml': 'ai',
    'ai-machine-learning': 'ai',
    'machine-learning': 'ai',
    'deep-learning': 'ai',
    'genai': 'ai',

    // DevOps Category
    'devops': 'devops',
    'devops-cloud': 'devops',
    'docker': 'devops',
    'kubernetes': 'devops',
    'aws': 'devops',
    'ci-cd': 'devops',

    // Cybersecurity Category
    'cybersecurity': 'cybersecurity',
    'security': 'cybersecurity',
    'ethical-hacking': 'cybersecurity',
    'penetration-testing': 'cybersecurity',

    // Full Stack (maps to both frontend and backend)
    'full-stack': 'backend',
    'full-stack-development': 'backend'
};

/**
 * Get category for a roadmap
 * @param {String} roadmapId - Roadmap identifier
 * @returns {String|null} - Category name or null
 */
function getRoadmapCategory(roadmapId) {
    const normalizedId = roadmapId.toLowerCase().trim();
    return ROADMAP_CATEGORIES[normalizedId] || null;
}

/**
 * Calculate XP for an activity
 * @param {String} difficulty - Difficulty level (easy, medium, hard, advanced)
 * @param {String} activityType - Type of activity (topic, plan, question)
 * @returns {Number} - XP amount
 */
function calculateXP(difficulty, activityType = 'topic') {
    const baseDifficulty = difficulty.toLowerCase();
    const baseXP = XP_RULES.DIFFICULTY[baseDifficulty] || XP_RULES.DIFFICULTY.medium;
    const multiplier = XP_RULES.ACTIVITY_MULTIPLIERS[activityType] || 1.0;

    return Math.round(baseXP * multiplier);
}

/**
 * Award XP for completing an activity
 * Uses MongoDB transactions to ensure atomicity
 * 
 * @param {ObjectId} userId - User's MongoDB ObjectId
 * @param {String} roadmapId - Roadmap identifier
 * @param {Object} activity - Activity details
 * @param {String} activity.type - Activity type (topic, plan, question)
 * @param {String} activity.id - Activity identifier
 * @param {String} activity.difficulty - Difficulty level
 * @param {Object} session - MongoDB session for transaction (optional)
 * @returns {Object} - { xpAwarded, totalXP, league, streakInfo, isNewCompletion }
 */
async function awardXP(userId, roadmapId, activity, session = null) {
    const { type, id, difficulty } = activity;

    // Start a session if not provided
    const sessionProvided = !!session;
    if (!sessionProvided) {
        session = await UserProgress.startSession();
        session.startTransaction();
    }

    try {
        // Get or create user progress for this roadmap
        const userProgress = await UserProgress.getOrCreate(userId, roadmapId);

        // Check if activity was already completed (idempotent check)
        let isNewCompletion = false;

        if (type === 'topic') {
            isNewCompletion = userProgress.completeTopicSafe(id);
        } else if (type === 'plan') {
            isNewCompletion = userProgress.completePlanSafe(id);
        } else if (type === 'question') {
            isNewCompletion = userProgress.completeQuestionSafe(id);
        }

        // If not a new completion, return early (no XP awarded)
        if (!isNewCompletion) {
            if (!sessionProvided) {
                await session.abortTransaction();
                session.endSession();
            }

            const userXP = await UserXP.getOrCreate(userId);
            return {
                xpAwarded: 0,
                totalXP: userXP.totalXP,
                league: userXP.league,
                streakInfo: userXP.streak,
                isNewCompletion: false,
                message: 'Activity already completed - no XP awarded'
            };
        }

        // Calculate XP for this activity
        const xpAmount = calculateXP(difficulty, type);

        // Add XP to roadmap progress
        userProgress.addXP(xpAmount);

        // Get roadmap category for XP pooling
        const category = getRoadmapCategory(roadmapId);

        // Get or create user's global XP record
        const userXP = await UserXP.getOrCreate(userId);

        // Add XP to total and category
        userXP.addXP(xpAmount, category);

        // Update streak and check for bonus
        const streakInfo = userXP.updateStreak();

        // Calculate progress percentage (if roadmap has totalTopics)
        const roadmap = await Roadmap.findOne({ roadmapId });
        if (roadmap && roadmap.totalTopics > 0) {
            userProgress.calculateProgress(roadmap.totalTopics);
        }

        // Save both documents
        await userProgress.save({ session });
        await userXP.save({ session });

        // Commit transaction if we created it
        if (!sessionProvided) {
            await session.commitTransaction();
            session.endSession();
        }

        return {
            xpAwarded: xpAmount,
            totalXP: userXP.totalXP,
            league: userXP.league,
            streakInfo: {
                count: userXP.streak.count,
                longestStreak: userXP.streak.longestStreak,
                bonusAwarded: streakInfo.bonusAwarded,
                bonusXP: streakInfo.bonusXP
            },
            isNewCompletion: true,
            progressPercent: userProgress.progressPercent,
            roadmapXP: userProgress.xpEarned,
            categoryXP: category ? userXP.categoryXP[category] : null
        };

    } catch (error) {
        // Rollback transaction on error
        if (!sessionProvided) {
            await session.abortTransaction();
            session.endSession();
        }
        throw error;
    }
}

/**
 * Get user's progress for a specific roadmap
 * @param {ObjectId} userId - User's MongoDB ObjectId
 * @param {String} roadmapId - Roadmap identifier
 * @returns {Object} - Progress data
 */
async function getUserProgress(userId, roadmapId) {
    const progress = await UserProgress.getOrCreate(userId, roadmapId);
    const userXP = await UserXP.getOrCreate(userId);

    const category = getRoadmapCategory(roadmapId);

    return {
        roadmapId,
        completedTopics: progress.completedTopics.length,
        completedPlans: progress.completedPlans.length,
        completedQuestions: progress.completedQuestions.length,
        progressPercent: progress.progressPercent,
        xpEarned: progress.xpEarned,
        categoryXP: category ? userXP.categoryXP[category] : null,
        lastUpdated: progress.lastUpdated
    };
}

/**
 * Get all user progress across all roadmaps
 * @param {ObjectId} userId - User's MongoDB ObjectId
 * @returns {Array} - Array of progress objects
 */
async function getAllUserProgress(userId) {
    const allProgress = await UserProgress.find({ userId }).lean();
    const userXP = await UserXP.getOrCreate(userId);

    return allProgress.map(progress => {
        const category = getRoadmapCategory(progress.roadmapId);
        return {
            roadmapId: progress.roadmapId,
            completedTopics: progress.completedTopics.length,
            completedPlans: progress.completedPlans.length,
            completedQuestions: progress.completedQuestions.length,
            progressPercent: progress.progressPercent,
            xpEarned: progress.xpEarned,
            categoryXP: category ? userXP.categoryXP[category] : null,
            lastUpdated: progress.lastUpdated
        };
    });
}

module.exports = {
    awardXP,
    getUserProgress,
    getAllUserProgress,
    calculateXP,
    getRoadmapCategory,
    XP_RULES,
    ROADMAP_CATEGORIES
};
