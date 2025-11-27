const Question = require('../models/Question');

/**
 * Quiz Service - Handles MCQ selection, randomization, and scoring
 */
class QuizService {
    /**
     * Get questions for a quiz based on filters
     * @param {Object} filters - { category, difficulty, limit, excludeIds }
     * @returns {Promise<Array>} Array of questions (without correct answers)
     */
    async getQuizQuestions(filters = {}) {
        const {
            category = null,
            difficulty = null,
            limit = 10,
            excludeIds = [],
            randomize = true
        } = filters;

        const query = {
            _id: { $nin: excludeIds }
        };

        // Category filtering (supports array or string)
        // Note: category in Question model is an array, so we use $in
        if (category) {
            if (Array.isArray(category)) {
                // If multiple categories provided, match any
                query.category = { $in: category };
            } else {
                // Single category - check if it exists in the category array
                query.category = { $in: [category] };
            }
        }

        // Difficulty filtering (supports exact, range, or difficulty name)
        if (difficulty !== null) {
            if (typeof difficulty === 'object') {
                // Range: { min: 1, max: 5 }
                query.difficulty = {
                    $gte: difficulty.min || 1,
                    $lte: difficulty.max || 10
                };
            } else if (typeof difficulty === 'string') {
                // Named difficulty: 'easy', 'medium', 'hard'
                const difficultyMap = {
                    'easy': { min: 1, max: 3 },
                    'medium': { min: 4, max: 7 },
                    'hard': { min: 8, max: 10 }
                };
                const range = difficultyMap[difficulty.toLowerCase()];
                if (range) {
                    query.difficulty = { $gte: range.min, $lte: range.max };
                }
            } else {
                // Exact difficulty number
                query.difficulty = difficulty;
            }
        }

        let questions;

        if (randomize) {
            // Use MongoDB $sample aggregation for true randomness
            questions = await Question.aggregate([
                { $match: query },
                { $sample: { size: limit } }
            ]);
        } else {
            questions = await Question.find(query)
                .sort({ createdAt: -1 })
                .limit(limit);
        }

        // Remove correctAnswer from response (client should not see it)
        return questions.map(q => ({
            _id: q._id,
            content: q.content,
            options: q.options,
            category: q.category,
            difficulty: q.difficulty,
            hints: q.hints,
            tags: q.tags
        }));
    }

    /**
     * Get adaptive questions based on learner profile
     * @param {String} userId - User ID
     * @param {Object} learnerProfile - { weakAreas, difficultyPreference }
     * @param {Number} limit - Number of questions
     * @returns {Promise<Array>} Array of adaptive questions
     */
    async getAdaptiveQuestions(userId, learnerProfile, limit = 5) {
        // Get user's recent question IDs to avoid repetition
        const TestResult = require('../models/TestResult');
        const recentTests = await TestResult.find({ userId })
            .sort({ createdAt: -1 })
            .limit(5);

        const excludeIds = recentTests.flatMap(t => t.questions || []);

        const questions = await Question.getAdaptiveQuestions(
            learnerProfile,
            excludeIds,
            limit
        );

        // Remove correctAnswer from response
        return questions.map(q => ({
            _id: q._id,
            content: q.content,
            options: q.options,
            category: q.category,
            difficulty: q.difficulty,
            hints: q.hints
        }));
    }

    /**
     * Submit quiz and calculate score
     * @param {Array} answers - [{ questionId, selectedOption }]
     * @returns {Promise<Object>} { score, total, results: [...] }
     */
    async submitQuiz(answers) {
        const questionIds = answers.map(a => a.questionId);
        const questions = await Question.find({ _id: { $in: questionIds } });

        const questionMap = {};
        questions.forEach(q => {
            questionMap[q._id.toString()] = q;
        });

        let score = 0;
        const results = [];

        for (const answer of answers) {
            const question = questionMap[answer.questionId];
            if (!question) {
                results.push({
                    questionId: answer.questionId,
                    isCorrect: false,
                    error: 'Question not found'
                });
                continue;
            }

            const isCorrect = answer.selectedOption === question.correctAnswer;
            if (isCorrect) score++;

            results.push({
                questionId: answer.questionId,
                selectedOption: answer.selectedOption,
                correctAnswer: question.correctAnswer,
                isCorrect,
                explanation: question.explanation,
                content: question.content
            });

            // Update question usage statistics (if timeSpent is provided)
            if (answer.timeSpent) {
                await question.updateUsageStats(answer.timeSpent, isCorrect);
            }
        }

        return {
            score,
            total: answers.length,
            percentage: Math.round((score / answers.length) * 100),
            results
        };
    }

    /**
     * Get available categories
     * @returns {Promise<Array>} Array of unique categories
     */
    async getCategories() {
        const categories = await Question.distinct('category');
        return [...new Set(categories.flat())].sort();
    }

    /**
     * Get questions by topic with pagination
     * @param {String} topic - Topic name
     * @param {Number} page - Page number
     * @param {Number} limit - Items per page
     * @returns {Promise<Object>} { questions, total, page, pages }
     */
    async getQuestionsByTopic(topic, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const query = { category: topic };

        const [questions, total] = await Promise.all([
            Question.find(query)
                .select('-correctAnswer')
                .skip(skip)
                .limit(limit)
                .sort({ difficulty: 1 }),
            Question.countDocuments(query)
        ]);

        return {
            questions,
            total,
            page,
            pages: Math.ceil(total / limit)
        };
    }
}

module.exports = new QuizService();
