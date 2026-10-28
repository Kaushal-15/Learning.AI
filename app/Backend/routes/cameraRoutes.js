const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const CameraRecording = require('../models/CameraRecording');
const ExamRecording = require('../models/ExamRecording');
const ExamSession = require('../models/ExamSession');
const storageService = require('../services/storageService');

// All camera routes require authentication
router.use(authMiddleware);

/**
 * POST /api/camera/upload-url
 * Returns a short-lived (5 min) presigned PUT URL for direct browser-to-bucket chunk streaming.
 * Validates session ownership, active session status, chunkIndex bounds, and video/webm content type.
 */
router.post('/upload-url', async (req, res) => {
    try {
        const { examId, sessionId, chunkIndex, contentType } = req.body;

        if (!examId || !sessionId) {
            return res.status(400).json({
                success: false,
                message: 'examId and sessionId are required'
            });
        }

        // Validate chunkIndex is a bounded integer
        const chunk = Number(chunkIndex);
        if (!Number.isInteger(chunk) || chunk < 0 || chunk > 1000000) {
            return res.status(400).json({
                success: false,
                message: 'chunkIndex must be an integer between 0 and 1000000'
            });
        }

        // Allow only video/webm content type
        if (contentType && contentType !== 'video/webm') {
            return res.status(400).json({
                success: false,
                message: 'Only video/webm content type is allowed'
            });
        }

        // Verify that examId and sessionId exist and belong to the authenticated user
        const session = await ExamSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Exam session not found'
            });
        }

        if (String(session.examId) !== String(examId)) {
            return res.status(400).json({
                success: false,
                message: 'Session does not belong to the specified exam'
            });
        }

        const currentUserId = req.user.id || req.user._id;
        const isOwner = String(session.userId) === String(currentUserId) ||
                        String(session.userId) === String(req.user.learnerId) ||
                        req.user.role === 'admin';

        if (!isOwner) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You do not own this exam session.'
            });
        }

        // Verify session is active
        if (session.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Exam session is not active'
            });
        }

        // Check if recording is enabled and configured in storageService
        if (!storageService.isRecordingConfigured()) {
            return res.status(200).json({
                success: false,
                enabled: false,
                message: 'Recording storage is disabled or not configured in environment variables.'
            });
        }

        const presigned = await storageService.getPresignedUploadUrl({
            examId,
            userId: session.userId || currentUserId,
            sessionId,
            chunkIndex: chunk,
            contentType: 'video/webm'
        });

        if (!presigned.enabled) {
            return res.status(200).json({
                success: false,
                enabled: false,
                message: presigned.message
            });
        }

        // Store chunk tracking record in CameraRecording
        try {
            await CameraRecording.findOneAndUpdate(
                { sessionId, examId },
                {
                    $setOnInsert: {
                        startedBy: currentUserId,
                        status: 'recording',
                        startedAt: new Date()
                    },
                    $push: {
                        videoChunks: {
                            chunkNumber: chunk,
                            uploadedAt: new Date()
                        }
                    }
                },
                { upsert: true, new: true, runValidators: false }
            );
        } catch (dbErr) {
            console.warn('CameraRecording update warning in upload-url:', dbErr.message);
        }

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
 * Records chunk counts and marks recording completed in CameraRecording & ExamRecording
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

        const session = await ExamSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, message: 'Exam session not found' });
        }

        const currentUserId = req.user.id || req.user._id;
        const isOwner = String(session.userId) === String(currentUserId) ||
                        String(session.userId) === String(req.user.learnerId) ||
                        req.user.role === 'admin';

        if (!isOwner) {
            return res.status(403).json({ success: false, message: 'Forbidden: You do not own this exam session.' });
        }

        // Update CameraRecording
        let recording = await CameraRecording.findOne({ sessionId, examId });
        if (!recording) {
            recording = new CameraRecording({
                sessionId,
                examId,
                startedBy: currentUserId,
                status: 'completed'
            });
        } else {
            recording.status = 'completed';
        }

        recording.endedAt = new Date();
        if (totalSize) recording.totalSize = totalSize;
        await recording.save();

        // Update or create ExamRecording entry
        try {
            const recordingKeyPrefix = `recordings/${examId}/${session.userId || currentUserId}/${sessionId}/`;
            let examRec = await ExamRecording.findOne({ sessionId, examId });
            if (!examRec) {
                examRec = new ExamRecording({
                    examId,
                    sessionId,
                    studentName: session.studentName || req.user.name || 'Student',
                    registerNumber: session.registerNumber || req.user.learnerId || 'N/A',
                    filePath: recordingKeyPrefix,
                    fileName: `${sessionId}.webm`,
                    fileSize: totalSize || 0,
                    duration: duration || 0,
                    recordingStartTime: session.startTime || new Date(),
                    recordingEndTime: new Date(),
                    triggeredBy: 'auto',
                    status: 'completed'
                });
                await examRec.save();
            } else {
                examRec.status = 'completed';
                examRec.recordingEndTime = new Date();
                if (totalSize) examRec.fileSize = totalSize;
                if (duration) examRec.duration = duration;
                await examRec.save();
            }
        } catch (examRecErr) {
            console.warn('ExamRecording finalize warning (non-fatal):', examRecErr.message);
        }

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
 * Returns short-lived presigned GET URLs for all chunks of an exam session (Admin only).
 * Never returns permanent or public URLs.
 */
router.get('/review/:sessionId', adminMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        let examId = req.query.examId;
        let userId = req.query.userId;

        const session = await ExamSession.findById(sessionId);
        if (session) {
            if (!examId) examId = session.examId;
            if (!userId) userId = session.userId;
        }

        if (!examId) {
            return res.status(400).json({
                success: false,
                message: 'examId is required to review recordings'
            });
        }

        const result = await storageService.listSessionChunks({ examId, userId, sessionId });
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

/**
 * GET /api/camera/playback
 * Returns a short-lived presigned GET URL for a single object key (Admin only).
 * Never returns permanent or public URLs.
 */
router.get('/playback', adminMiddleware, async (req, res) => {
    try {
        const { key } = req.query;

        if (!key || typeof key !== 'string' || !key.startsWith('recordings/')) {
            return res.status(400).json({
                success: false,
                message: 'A valid key starting with recordings/ is required'
            });
        }

        const presigned = await storageService.getPresignedDownloadUrl({ key, expiresIn: 900 });
        if (!presigned.enabled) {
            return res.status(503).json({
                success: false,
                message: presigned.message
            });
        }

        res.json({
            success: true,
            downloadUrl: presigned.downloadUrl,
            expiresIn: presigned.expiresIn,
            key: presigned.key
        });
    } catch (error) {
        console.error('Error generating playback URL:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Check active recording status
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

module.exports = router;