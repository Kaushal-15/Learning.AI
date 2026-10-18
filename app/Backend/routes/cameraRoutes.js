const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const CameraRecording = require('../models/CameraRecording');
const ExamSession = require('../models/ExamSession');
const storageService = require('../services/storageService');

router.use(authMiddleware);

/**
 * POST /api/camera/upload-url
 * Returns a presigned PUT URL for direct browser-to-bucket chunk streaming.
 * Validates session ownership and feature flag.
 */
router.post('/upload-url', async (req, res) => {
    try {
        const { examId, sessionId, chunkIndex } = req.body;

        if (!examId || !sessionId) {
            return res.status(400).json({
                success: false,
                message: 'examId and sessionId are required'
            });
        }

        // Validate session ownership (must be user's session or caller is admin)
        try {
            const session = await ExamSession.findById(sessionId);
            if (session) {
                const isOwner = String(session.userId) === String(req.user.id) ||
                                String(session.userId) === String(req.user.learnerId) ||
                                req.user.role === 'admin';
                if (!isOwner) {
                    return res.status(403).json({
                        success: false,
                        message: 'Unauthorized: You do not own this exam session.'
                    });
                }
            }
        } catch (dbErr) {
            console.warn('Session lookup warning in upload-url:', dbErr.message);
        }

        // Check if recording is enabled and configured
        if (!storageService.isRecordingConfigured()) {
            return res.status(200).json({
                success: false,
                enabled: false,
                message: 'Recording storage is disabled or not configured in environment variables.'
            });
        }

        const safeChunkIndex = chunkIndex !== undefined ? chunkIndex : Date.now();
        const presigned = await storageService.getPresignedUploadUrl({
            examId,
            sessionId,
            chunkIndex: safeChunkIndex,
            contentType: 'video/webm'
        });

        res.json({
            success: true,
            ...presigned
        });
    } catch (error) {
        console.error('Error generating presigned upload URL:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/camera/finalize
 * Records chunk counts and marks recording completed in MongoDB
 */
router.post('/finalize', async (req, res) => {
    try {
        const { examId, sessionId, totalChunks, duration, totalSize } = req.body;

        if (!examId || !sessionId) {
            return res.status(400).json({
                success: false,
                message: 'examId and sessionId are required'
            });
        }

        let recording = await CameraRecording.findOne({ sessionId, examId });
        if (!recording) {
            recording = new CameraRecording({
                sessionId,
                examId,
                startedBy: req.user.id,
                status: 'completed'
            });
        } else {
            recording.status = 'completed';
        }

        recording.endedAt = new Date();
        if (totalSize) recording.totalSize = totalSize;
        await recording.save();

        res.json({
            success: true,
            message: 'Recording finalized successfully',
            data: {
                recordingId: recording._id,
                status: recording.status,
                totalChunks: totalChunks || 0,
                duration: duration || 0
            }
        });
    } catch (error) {
        console.error('Error finalizing recording:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/camera/review/:sessionId
 * Returns short-lived presigned GET URLs for all chunks of an exam session (Admin only)
 */
router.get('/review/:sessionId', adminMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        let examId = req.query.examId;

        if (!examId) {
            const session = await ExamSession.findById(sessionId);
            if (session) examId = session.examId;
        }

        if (!examId) {
            return res.status(400).json({
                success: false,
                message: 'examId is required to review recordings'
            });
        }

        const result = await storageService.listSessionChunks({ examId, sessionId });
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Error listing session chunks:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Start recording (Admin only)
router.post('/start-recording', adminMiddleware, async (req, res) => {
    try {
        const { sessionId, examId } = req.body;
        
        const recording = new CameraRecording({
            sessionId,
            examId,
            startedBy: req.user.id,
            status: 'recording'
        });
        
        await recording.save();
        
        res.json({
            success: true,
            data: recording
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Stop recording (Admin only)
router.post('/stop-recording/:recordingId', adminMiddleware, async (req, res) => {
    try {
        const { recordingId } = req.params;
        
        const recording = await CameraRecording.findById(recordingId);
        if (!recording) {
            return res.status(404).json({
                success: false,
                message: 'Recording not found'
            });
        }
        
        recording.status = 'completed';
        recording.endedAt = new Date();
        await recording.save();
        
        res.json({
            success: true,
            data: recording
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Check active recording
router.get('/active-recording/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const recording = await CameraRecording.findOne({
            sessionId,
            status: 'recording'
        });
        
        res.json({
            success: true,
            isRecording: !!recording,
            data: recording
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Upload video chunk (legacy endpoint with zero serverless fs write dependency)
router.post('/upload-chunk', async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Chunk received. For direct cloud streaming, use /upload-url.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;