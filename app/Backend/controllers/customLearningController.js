const Document = require('../models/Document');
const Quiz = require('../models/Quiz');
const Chunk = require('../models/Chunk');
const fileProcessingService = require('../services/fileProcessingService');
const quizGenerationService = require('../services/quizGenerationService');
const storageService = require('../services/storageService');

const sanitizeFilename = (filename) => {
    return (filename || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
};

const validateFileContent = (buffer, mimetype, originalname) => {
    if (!buffer) {
        return { valid: false, message: 'The uploaded file is empty.' };
    }

    const name = (originalname || '').toLowerCase();
    const isPdf = mimetype === 'application/pdf' || name.endsWith('.pdf');
    const isDocx = mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx');
    const isTxt = mimetype === 'text/plain' || name.endsWith('.txt');

    if (!isPdf && !isDocx && !isTxt) {
        return { valid: false, message: 'Invalid file type. Only PDF, DOCX, and TXT are allowed.' };
    }

    if (isPdf) {
        // PDF magic bytes: %PDF (0x25 0x50 0x44 0x46)
        if (buffer.length < 4 || buffer.slice(0, 4).toString('ascii') !== '%PDF') {
            return { valid: false, message: 'Invalid file type or corrupted PDF file.' };
        }
    } else if (isDocx) {
        // DOCX ZIP container magic bytes: PK (0x50 0x4B 0x03 0x04 or standard zip signatures)
        if (
            buffer.length < 4 ||
            buffer[0] !== 0x50 ||
            buffer[1] !== 0x4B ||
            (buffer[2] !== 0x03 && buffer[2] !== 0x05 && buffer[2] !== 0x07)
        ) {
            return { valid: false, message: 'Invalid file type or corrupted DOCX file.' };
        }
    } else if (isTxt) {
        try {
            const decoder = new TextDecoder('utf-8', { fatal: true });
            decoder.decode(buffer);
        } catch {
            return { valid: false, message: 'Invalid TXT file: content must be valid UTF-8 encoded text.' };
        }
    }

    return { valid: true };
};

exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { originalname, mimetype, size, buffer } = req.file;
        const userId = req.user.id || req.user._id;

        // Content & magic bytes validation
        const validation = validateFileContent(buffer, mimetype, originalname);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.message });
        }

        const sanitized = sanitizeFilename(originalname);

        // Create the Document record (never store file bytes in MongoDB)
        const document = new Document({
            userId,
            filename: `${Date.now()}-${sanitized}`,
            originalName: originalname,
            mimeType: mimetype,
            size,
            path: null,
            status: 'processing',
            processed: false,
            chunkCount: 0
        });

        await document.save();

        // Upload original to S3 at documents/<userId>/<documentId>/<sanitizedFilename>
        const s3Key = `documents/${userId}/${document._id}/${sanitized}`;
        try {
            const s3Result = await storageService.uploadObject({
                key: s3Key,
                body: buffer,
                contentType: mimetype
            });
            if (s3Result && s3Result.success) {
                document.storageKey = s3Key;
                await document.save();
            }
        } catch (s3Error) {
            // S3 upload failure or S3 not configured must NOT fail the upload
            console.warn('S3 upload skipped or failed:', s3Error.message);
        }

        // Process document in memory directly from req.file.buffer
        let processResult;
        try {
            processResult = await fileProcessingService.processDocument(document._id, buffer);
        } catch (procError) {
            // Extraction threw an unhandled error (e.g. corrupt structure)
            return res.status(422).json({
                success: false,
                message: 'We could not read any text from this file. If it is a scanned PDF, upload a text-based PDF or a DOCX.'
            });
        }

        if (!processResult.success || processResult.chunkCount === 0) {
            return res.status(422).json({
                success: false,
                message: processResult.message || 'We could not read any text from this file. If it is a scanned PDF, upload a text-based PDF or a DOCX.'
            });
        }

        return res.status(201).json({
            success: true,
            message: 'File uploaded and processed successfully',
            documentId: document._id
        });
    } catch (error) {
        console.error('Upload error:', error.message);
        const isProd = process.env.NODE_ENV === 'production';
        return res.status(500).json({
            success: false,
            message: isProd ? 'File upload failed' : (error.message || 'File upload failed')
        });
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
        if (!document.processed || document.status === 'failed') {
            return res.status(400).json({
                success: false,
                message: document.status === 'failed' ? 'Cannot generate quiz from a failed document' : 'Document is still being processed'
            });
        }

        const config = {
            questionCount: parseInt(questionCount, 10) || 5,
            difficulty: difficulty || 'medium'
        };

        const questions = await quizGenerationService.generateQuiz(documentId, mode, config);

        // Create Quiz record
        const quiz = new Quiz({
            userId,
            title: `Custom Quiz: ${document.originalName}`,
            roadmapType: 'custom',
            source: 'custom',
            difficulty: mode === 'dynamic' ? 'mixed' : (difficulty || 'medium'),
            isAdaptive: mode === 'dynamic',
            questions,
            totalQuestions: questions.length,
            timeLimit: questions.length * 2,
            status: 'active'
        });

        await quiz.save();

        return res.status(201).json({
            success: true,
            quizId: quiz._id,
            message: 'Quiz generated successfully'
        });
    } catch (error) {
        console.error('Quiz generation error:', error.message);
        const isProd = process.env.NODE_ENV === 'production';
        return res.status(500).json({
            success: false,
            message: isProd ? 'Quiz generation failed' : (error.message || 'Quiz generation failed')
        });
    }
};

exports.getDocuments = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const documents = await Document.find({ userId }).sort({ createdAt: -1 });
        return res.json({ success: true, documents });
    } catch (error) {
        console.error('Get documents error:', error.message);
        const isProd = process.env.NODE_ENV === 'production';
        return res.status(500).json({
            success: false,
            message: isProd ? 'Failed to fetch documents' : (error.message || 'Failed to fetch documents')
        });
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

        // Delete the S3 object if storageKey exists (ignore not-found)
        if (document.storageKey) {
            try {
                await storageService.deleteObject(document.storageKey);
            } catch (s3Err) {
                console.warn('S3 object deletion skipped or failed (ignoring):', s3Err.message);
            }
        }

        // Delete the document record
        await Document.deleteOne({ _id: document._id });

        return res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Delete document error:', error.message);
        const isProd = process.env.NODE_ENV === 'production';
        return res.status(500).json({
            success: false,
            message: isProd ? 'Failed to delete document' : (error.message || 'Failed to delete document')
        });
    }
};
