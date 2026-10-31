const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const CameraRecording = require('../models/CameraRecording');
const ExamRecording = require('../models/ExamRecording');
const { ExamSession } = require('../config/examDatabase');
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
        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Database connection not ready' });
        }

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
 * POST /api/camera/chunk-metadata
 * Records chunk metadata in MongoDB after direct-to-cloud upload.
 * Verifies session ownership and validates/enforces the key pattern:
 * recordings/<examId>/<userId>/<sessionId>/<chunkIndex>.webm
 */
router.post('/chunk-metadata', async (req, res) => {
    try {
        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Database connection not ready' });
        }

        const { examId, sessionId, chunkIndex, size, status, key } = req.body;

        if (!examId || !sessionId || chunkIndex === undefined || chunkIndex === null) {
            return res.status(400).json({
                success: false,
                message: 'examId, sessionId, and chunkIndex are required'
            });
        }

        const chunk = Number(chunkIndex);
        if (!Number.isInteger(chunk) || chunk < 0 || chunk > 1000000) {
            return res.status(400).json({
                success: false,
                message: 'chunkIndex must be an integer between 0 and 1000000'
            });
        }

        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Database connection not ready' });
        }

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

        // Canonical expected key - never trust client-supplied keys without strict verification
        const resolvedUserId = session.userId || currentUserId;
        const expectedKey = `recordings/${examId}/${resolvedUserId}/${sessionId}/${chunk}.webm`;

        if (key && key !== expectedKey) {
            return res.status(400).json({
                success: false,
                message: `Invalid key format. Expected: ${expectedKey}`
            });
        }

        const chunkSize = Number(size) || 0;
        const chunkStatus = status || 'uploaded';

        // Update CameraRecording videoChunks array
        const cameraRecording = await CameraRecording.findOneAndUpdate(
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
                        uploadedAt: new Date(),
                        size: chunkSize,
                        status: chunkStatus,
                        key: expectedKey
                    }
                },
                $inc: { totalSize: chunkSize }
            },
            { upsert: true, new: true, runValidators: false }
        );

        // Optionally update ExamRecording tracking
        try {
            await ExamRecording.findOneAndUpdate(
                { sessionId, examId },
                {
                    $inc: { chunksReceived: 1, fileSize: chunkSize },
                    $setOnInsert: {
                        studentName: session.studentName || req.user.name || 'Student',
                        registerNumber: session.registerNumber || req.user.learnerId || 'N/A',
                        filePath: `recordings/${examId}/${resolvedUserId}/${sessionId}/`,
                        fileName: `${sessionId}.webm`,
                        recordingStartTime: session.startTime || new Date(),
                        triggeredBy: 'auto',
                        status: 'recording'
                    }
                },
                { upsert: true, new: true, runValidators: false }
            );
        } catch (recErr) {
            console.warn('ExamRecording chunk metadata warning (non-fatal):', recErr.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Chunk metadata recorded successfully',
            data: {
                sessionId,
                chunkIndex: chunk,
                key: expectedKey,
                size: chunkSize,
                status: chunkStatus
            }
        });
    } catch (error) {
        console.error('Error recording chunk metadata:', error);
        return res.status(500).json({
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

        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Database connection not ready' });
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

        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Database connection not ready' });
        }

        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Database connection not ready' });
        }

        const session = await ExamSession.findById(sessionId);
        let recordingDoc = await CameraRecording.findOne({ sessionId });
        let attemptDoc = null;

        if (session) {
            if (!examId) examId = session.examId;
            if (!userId) userId = session.userId;
        } else if (recordingDoc) {
            if (!examId) examId = recordingDoc.examId;
            if (!userId) userId = recordingDoc.startedBy;
        } else {
            attemptDoc = await ExamAttempt.findOne({ sessionId });
            if (attemptDoc) {
                if (!examId) examId = attemptDoc.examId;
                if (!userId) userId = attemptDoc.userId;
            }
        }

        if (!examId) {
            return res.status(400).json({
                success: false,
                message: 'examId is required to review recordings'
            });
        }

        let result = await storageService.listSessionChunks({ examId, userId, sessionId });
        let chunks = (result.chunks || []).map((c, i) => ({
            ...c,
            url: c.downloadUrl,
            chunkIndex: i
        }));

        // Fallback: If S3 listing returned 0 chunks, check CameraRecording videoChunks in DB
        if (chunks.length === 0 && recordingDoc && recordingDoc.videoChunks && recordingDoc.videoChunks.length > 0) {
            const dbChunks = await Promise.all(recordingDoc.videoChunks.map(async (vc, idx) => {
                const key = vc.key || `recordings/${examId}/${userId}/${sessionId}/${vc.chunkNumber ?? idx}.webm`;
                const presigned = await storageService.getPresignedDownloadUrl({ key, expiresIn: 86400 }); // 24 hours
                return {
                    key,
                    size: vc.size || 0,
                    chunkIndex: vc.chunkNumber ?? idx,
                    url: presigned.downloadUrl,
                    downloadUrl: presigned.downloadUrl
                };
            }));
            const valid = dbChunks.filter(c => Boolean(c.url));
            if (valid.length > 0) {
                chunks = valid;
            }
        }

        res.json({
            success: true,
            sessionId,
            totalChunks: chunks.length,
            chunks,
            presignedUrls: chunks
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

        const presigned = await storageService.getPresignedDownloadUrl({ key, expiresIn: 86400 }); // 24 hours
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
        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Database connection not ready' });
        }
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

/**
 * GET /api/camera/exam/:examId/recordings
 * Returns all recording sessions metadata for an exam (Admin only)
 */
router.get('/exam/:examId/recordings', adminMiddleware, async (req, res) => {
    try {
        await connectDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Database connection not ready' });
        }
        const { examId } = req.params;
        const cameraRecordings = await CameraRecording.find({ examId }).sort('-startedAt').lean();

        const data = await Promise.all(cameraRecordings.map(async (rec) => {
            const attempt = await ExamAttempt.findOne({ $or: [{ sessionId: rec.sessionId }, { userId: String(rec.startedBy), examId }] }).lean();
            const session = await ExamSession.findById(rec.sessionId).lean();
            return {
                sessionId: rec.sessionId,
                examId: rec.examId,
                userId: rec.startedBy,
                studentName: attempt?.studentName || session?.studentName || 'Student',
                registerNumber: attempt?.registerNumber || session?.registerNumber || 'N/A',
                status: rec.status,
                startedAt: rec.startedAt,
                endedAt: rec.endedAt,
                totalChunks: rec.videoChunks?.length || 0,
                totalSize: rec.totalSize || 0
            };
        }));

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error fetching exam recordings:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


module.exports = router;
