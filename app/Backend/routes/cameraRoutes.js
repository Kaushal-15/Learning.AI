const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const CameraRecording = require('../models/CameraRecording');

router.use(authMiddleware);

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

// Upload video chunk
router.post('/upload-chunk', async (req, res) => {
    try {
        const { recordingId, chunkData, chunkNumber } = req.body;
        
        // In production, save to cloud storage (AWS S3, etc.)
        // For now, just acknowledge receipt
        
        res.json({
            success: true,
            message: 'Chunk uploaded successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;