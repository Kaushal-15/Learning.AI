const express = require('express');
const router = express.Router();
const adaptiveExamController = require('../controllers/adaptiveExamController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Individual Adaptive Exam Routes
router.get('/:examId/adaptive/next-question', adaptiveExamController.getNextAdaptiveQuestion);
router.post('/:examId/adaptive/submit-answer', adaptiveExamController.submitAdaptiveAnswer);

// Synchronized Adaptive Exam Routes
router.get('/:examId/synchronized/current-question', adaptiveExamController.getCurrentSynchronizedQuestion);
router.post('/:examId/synchronized/submit-answer', adaptiveExamController.submitSynchronizedAnswer);

// Admin Routes for Synchronized Exams
router.post('/:examId/synchronized/advance', adaptiveExamController.advanceSynchronizedExam);

module.exports = router;