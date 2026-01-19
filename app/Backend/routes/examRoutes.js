const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const examController = require('../controllers/examController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        const fs = require('fs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'application/csv'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOCX, TXT, and CSV are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.use(authMiddleware);

router.post('/create', examController.createExam);
router.post('/validate-entry', examController.validateEntry);
router.get('/:examId/details', examController.getExamDetails);
router.get('/:examId/session', examController.startSession);
router.post('/:examId/session', examController.startSession);
router.put('/:examId/session', examController.updateSession);
router.post('/:examId/log', examController.logEvent);
router.post('/:examId/submit', examController.submitExam);

// Admin Routes
router.get('/admin/list', adminMiddleware, examController.getAdminExams);
router.delete('/admin/:examId', adminMiddleware, examController.deleteExam);
router.get('/admin/:examId/candidates', adminMiddleware, examController.getExamCandidates);
router.post('/admin/:examId/regenerate-code', adminMiddleware, examController.regenerateExamCode);
router.put('/admin/:examId/status', adminMiddleware, examController.updateExamStatus);
router.put('/admin/:examId/config', adminMiddleware, examController.updateExamConfig);
router.get('/admin/:examId/results', adminMiddleware, examController.getExamResults);
router.get('/admin/:examId/analytics', adminMiddleware, examController.getExamAnalytics);
router.get('/admin/questions', adminMiddleware, examController.getQuestions);
router.post('/admin/upload-questions', adminMiddleware, upload.single('file'), examController.uploadQuestions);

// Student Management Routes
router.get('/admin/:examId/students', adminMiddleware, examController.getExamStudents);
router.post('/admin/:examId/students', adminMiddleware, examController.addStudent);
router.delete('/admin/:examId/students/:registerNumber', adminMiddleware, examController.removeStudent);
router.put('/admin/:examId/student-verification', adminMiddleware, examController.updateStudentVerification);

// Adaptive Quiz Routes
router.get('/:examId/adaptive/next-question', examController.getNextQuestion);
router.post('/:examId/adaptive/submit-answer', examController.submitAdaptiveAnswer);
router.get('/:examId/adaptive/wait-status', examController.getWaitStatus);

// Synchronized Adaptive Exam Routes
router.post('/admin/:examId/start-synchronized', adminMiddleware, examController.startSynchronizedExam);
router.get('/:examId/synchronized/current-question', examController.getSynchronizedQuestion);
router.post('/:examId/synchronized/submit-answer', examController.submitSynchronizedAnswer);

module.exports = router;

