const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const customLearningController = require('../controllers/customLearningController');
const { uploadLimiter, quizGenLimiter } = require('../middleware/customRateLimit');
const authMiddleware = require('../middleware/authMiddleware');

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        // Ensure directory exists (create if not)
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
        'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOCX, and TXT are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Routes
router.post('/upload',
    authMiddleware,
    uploadLimiter,
    upload.single('file'),
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
