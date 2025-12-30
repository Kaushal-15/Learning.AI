const Document = require('../models/Document');
const Quiz = require('../models/Quiz');
const Chunk = require('../models/Chunk');
const fileProcessingService = require('../services/fileProcessingService');
const quizGenerationService = require('../services/quizGenerationService');
const fs = require('fs');

exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { originalname, mimetype, size, path } = req.file;
        const userId = req.user.id || req.user._id;

        // Create Document record
        const document = new Document({
            userId,
            filename: req.file.filename,
            originalName: originalname,
            mimeType: mimetype,
            size,
            path
        });

        await document.save();

        // Process document (extract text and chunk)
        await fileProcessingService.processDocument(document._id);

        res.status(201).json({
            success: true,
            message: 'File uploaded and processed successfully',
            documentId: document._id
        });
    } catch (error) {
        console.error('Upload error:', error);
        // Clean up file if processing failed
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        res.status(500).json({ success: false, message: 'File upload failed', error: error.message });
    }
};

exports.generateQuiz = async (req, res) => {
    try {
        const { documentId, mode, questionCount, difficulty } = req.body;
        const userId = req.user.id || req.user._id;

        if (!documentId || !mode) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Verify document ownership
        const document = await Document.findOne({ _id: documentId, userId });
        if (!document) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        // Check if document has been processed
        if (!document.processed) {
            return res.status(400).json({ success: false, message: 'Document is still being processed' });
        }

        const config = {
            questionCount: parseInt(questionCount) || 5,
            difficulty: difficulty || 'medium'
        };

        const questions = await quizGenerationService.generateQuiz(documentId, mode, config);

        // Create Quiz record
        const quiz = new Quiz({
            userId,
            title: `Custom Quiz: ${document.originalName}`,
            roadmapType: 'custom', // Using 'custom' as roadmapType
            source: 'custom',
            difficulty: mode === 'dynamic' ? 'mixed' : (difficulty || 'medium'),
            isAdaptive: mode === 'dynamic',
            questions,
            totalQuestions: questions.length,
            timeLimit: questions.length * 2, // 2 minutes per question
            status: 'active'
        });

        await quiz.save();

        res.status(201).json({
            success: true,
            quizId: quiz._id,
            message: 'Quiz generated successfully'
        });
    } catch (error) {
        console.error('Quiz generation error:', error);
        res.status(500).json({ success: false, message: 'Quiz generation failed', error: error.message });
    }
};

exports.getDocuments = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const documents = await Document.find({ userId }).sort({ createdAt: -1 });
        res.json({ success: true, documents });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch documents', error: error.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const userId = req.user.id || req.user._id;

        // Find and verify ownership
        const document = await Document.findOne({ _id: documentId, userId });
        if (!document) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        // Delete associated chunks
        await Chunk.deleteMany({ documentId: document._id });

        // Delete the physical file
        if (fs.existsSync(document.path)) {
            fs.unlinkSync(document.path);
        }

        // Delete the document record
        await Document.deleteOne({ _id: document._id });

        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete document', error: error.message });
    }
};
