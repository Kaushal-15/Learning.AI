const express = require('express');
const router = express.Router();
const customLearningController = require('../controllers/customLearningController');
const { uploadLimiter, quizGenLimiter } = require('../middleware/customRateLimit');
const authMiddleware = require('../middleware/authMiddleware');

// Lazy-require multer middleware to avoid top-level load
const uploadSingleFile = (req, res, next) => {
    const multer = require('multer');
    const fileFilter = (r, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOCX, and TXT are allowed.'), false);
        }
    };

    const upload = multer({
        storage: multer.memoryStorage(),
        fileFilter: fileFilter,
        limits: { fileSize: 4 * 1024 * 1024 } // 4 MB — Vercel body cap is ~4.5 MB
    });

    return upload.single('file')(req, res, next);
};

// Routes
router.post('/upload',
    authMiddleware,
    uploadLimiter,
    uploadSingleFile,
    customLearningController.uploadDocument
);

router.post('/generate-quiz',
    authMiddleware,
    quizGenLimiter,
    customLearningController.generateQuiz
);

router.get('/documents',
    authMiddleware,
    customLearningController.getDocuments
);

router.delete('/documents/:documentId',
    authMiddleware,
    customLearningController.deleteDocument
);

module.exports = router;
