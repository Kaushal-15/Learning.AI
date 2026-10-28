/**
 * Adaptive Exam Question Pool Rules
 * 
 * Rule: For an adaptive/dynamic exam with N questions, the question pool
 * must contain at least ceil(0.6 * N) questions in EACH difficulty tag (easy, medium, hard).
 */

const DIFFICULTIES = ['easy', 'medium', 'hard'];

/**
 * Returns required questions per difficulty for an adaptive exam with totalQuestions
 * @param {number} totalQuestions
 * @returns {{ easy: number, medium: number, hard: number, totalRequired: number }}
 */
function getRequiredPerDifficulty(totalQuestions) {
    const n = Number(totalQuestions);
    if (!Number.isInteger(n) || n <= 0) {
        throw new Error('Total questions must be a positive integer greater than 0');
    }

    const perDiff = Math.ceil(0.6 * n);
    return {
        easy: perDiff,
        medium: perDiff,
        hard: perDiff,
        totalRequired: perDiff * 3
    };
}

/**
 * Counts questions in a pool by difficulty tag ('easy', 'medium', 'hard')
 * @param {Array} questions
 * @returns {{ easy: number, medium: number, hard: number, total: number }}
 */
function countQuestionsByDifficulty(questions = []) {
    const counts = { easy: 0, medium: 0, hard: 0, total: 0 };
    if (!Array.isArray(questions)) return counts;

    for (const q of questions) {
        if (!q) continue;
        const diff = String(q.difficulty || q.difficultyLevel || '').trim().toLowerCase();
        if (diff === 'easy') {
            counts.easy++;
            counts.total++;
        } else if (diff === 'hard') {
            counts.hard++;
            counts.total++;
        } else if (diff === 'medium') {
            counts.medium++;
            counts.total++;
        } else {
            // Unspecified or unknown defaults to medium
            counts.medium++;
            counts.total++;
        }
    }

    return counts;
}

/**
 * Validates question pool against the 60% rule
 * @param {Array} questions
 * @param {number} totalQuestions
 * @returns {{ valid: boolean, requiredPerDifficulty: number, required: Object, counts: Object, deficits: Object, message: string }}
 */
function validateQuestionPool(questions = [], totalQuestions) {
    const required = getRequiredPerDifficulty(totalQuestions);
    const counts = countQuestionsByDifficulty(questions);

    const deficits = {
        easy: Math.max(0, required.easy - counts.easy),
        medium: Math.max(0, required.medium - counts.medium),
        hard: Math.max(0, required.hard - counts.hard)
    };

    const valid = deficits.easy === 0 && deficits.medium === 0 && deficits.hard === 0;

    const message = valid
        ? 'Question pool satisfies adaptive rule'
        : `Adaptive exam requires at least ${required.easy} questions for each difficulty (Easy: ${counts.easy}/${required.easy}, Medium: ${counts.medium}/${required.medium}, Hard: ${counts.hard}/${required.hard}). Shortfall: Easy -${deficits.easy}, Medium -${deficits.medium}, Hard -${deficits.hard}.`;

    return {
        valid,
        requiredPerDifficulty: required.easy,
        required,
        counts,
        deficits,
        message
    };
}

module.exports = {
    DIFFICULTIES,
    getRequiredPerDifficulty,
    countQuestionsByDifficulty,
    validateQuestionPool
};
