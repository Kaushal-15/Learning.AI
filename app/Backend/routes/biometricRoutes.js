const express = require('express');
const router = express.Router();
const biometricService = require('../services/biometricService');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * Upload reference photo for biometric verification
 * POST /api/biometric/upload
 */
router.post('/upload', async (req, res) => {
    try {
        const { examId, studentName, registerNumber, photoBase64 } = req.body;

        if (!examId || !studentName || !registerNumber || !photoBase64) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const result = await biometricService.uploadReferencePhoto({
            examId,
            studentName,
            registerNumber,
            photoBase64
        });

        res.json({
            success: true,
            data: result,
            message: 'Reference photo uploaded successfully. Awaiting admin approval.'
        });
    } catch (error) {
        console.error('Error uploading reference photo:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upload reference photo'
        });
    }
});

/**
 * Verify student with live photo
 * POST /api/biometric/verify
 */
router.post('/verify', async (req, res) => {
    try {
        const { examId, registerNumber, livePhotoBase64 } = req.body;

        if (!examId || !registerNumber || !livePhotoBase64) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const result = await biometricService.verifyLivePhoto({
            examId,
            registerNumber,
            livePhotoBase64
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error verifying live photo:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify biometric'
        });
    }
});

/**
 * Get biometric status for a student
 * GET /api/biometric/status/:examId/:registerNumber
 */
router.get('/status/:examId/:registerNumber', async (req, res) => {
    try {
        const { examId, registerNumber } = req.params;

        const status = await biometricService.getBiometricStatus(examId, registerNumber);

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error getting biometric status:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get biometric status'
        });
    }
});

/**
 * Get pending biometric verifications (Admin)
 * GET /api/biometric/pending
 * GET /api/biometric/pending/:examId
 */
router.get('/pending/:examId?', adminMiddleware, async (req, res) => {
    try {
        const { examId } = req.params;

        const verifications = await biometricService.getPendingVerifications(examId);

        res.json({
            success: true,
            data: verifications
        });
    } catch (error) {
        console.error('Error getting pending verifications:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get pending verifications'
        });
    }
});

/**
 * Approve biometric verification (Admin)
 * PUT /api/biometric/:biometricId/approve
 */
router.put('/:biometricId/approve', adminMiddleware, async (req, res) => {
    try {
        const { biometricId } = req.params;
        const adminId = req.user.id;

        const result = await biometricService.approveBiometric(biometricId, adminId);

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Error approving biometric:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to approve biometric'
        });
    }
});

/**
 * Reject biometric verification (Admin)
 * PUT /api/biometric/:biometricId/reject
 */
router.put('/:biometricId/reject', adminMiddleware, async (req, res) => {
    try {
        const { biometricId } = req.params;
        const { reason } = req.body;
        const adminId = req.user.id;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const result = await biometricService.rejectBiometric(biometricId, adminId, reason);

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Error rejecting biometric:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to reject biometric'
        });
    }
});

module.exports = router;
