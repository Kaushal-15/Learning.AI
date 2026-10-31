const BiometricVerification = require('../models/BiometricVerification');
const { ExamMaster } = require('../config/examDatabase');
const storageService = require('./storageService');

/**
 * Biometric Verification Service
 * Handles photo storage, verification, and face comparison.
 * Moves new photo uploads to S3/R2 (biometrics/<examId>/<userId>/...) and stores object key in MongoDB.
 * Preserves legacy base64 documents for backward compatibility.
 */

/**
 * Helper to upload image to S3 if storage is configured, otherwise fallback to raw base64.
 */
async function storeBiometricPhoto({ examId, userId, registerNumber, photoBase64, type = 'reference' }) {
    if (!storageService.isRecordingConfigured()) {
        return photoBase64;
    }

    try {
        const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const timestamp = Date.now();
        const safeUserId = userId || registerNumber || 'user';
        const key = `biometrics/${examId}/${safeUserId}/${type}_${timestamp}.jpg`;

        await storageService.uploadObject({
            key,
            body: buffer,
            contentType: 'image/jpeg'
        });

        return key;
    } catch (err) {
        console.warn(`S3 biometric upload failed, falling back to base64:`, err.message);
        return photoBase64;
    }
}

/**
 * Helper to resolve photo string: if it's an S3 key, generate presigned GET URL; if base64/url, return as is.
 */
async function resolvePhotoUrl(photoString) {
    if (!photoString || typeof photoString !== 'string') return photoString;

    if (photoString.startsWith('biometrics/')) {
        try {
            const presigned = await storageService.getPresignedDownloadUrl({
                key: photoString,
                expiresIn: 900 // 15 minutes
            });
            return presigned.enabled ? presigned.downloadUrl : photoString;
        } catch (err) {
            console.error('Error resolving presigned URL for biometric key:', err.message);
            return photoString;
        }
    }

    return photoString;
}

/**
 * Upload student reference photo for biometric verification
 */
async function uploadReferencePhoto({ examId, userId, studentName, registerNumber, photoBase64 }) {
    try {
        // Check if exam exists and requires biometric
        const exam = await ExamMaster.findById(examId);
        if (!exam) {
            throw new Error('Exam not found');
        }

        // Check if student is registered for this exam
        const studentExists = exam.students.some(
            s => s.registerNumber === registerNumber
        );

        if (!studentExists && exam.requireStudentVerification) {
            throw new Error('Student not registered for this exam');
        }

        // Store to cloud object storage (S3/R2) or fallback to base64
        const photoKeyOrBase64 = await storeBiometricPhoto({
            examId,
            userId,
            registerNumber,
            photoBase64,
            type: 'reference'
        });

        // Check if biometric already exists
        let biometric = await BiometricVerification.findOne({
            examId,
            registerNumber
        });

        if (biometric) {
            // Update existing biometric
            biometric.referencePhoto = photoKeyOrBase64;
            biometric.studentName = studentName;
            biometric.status = 'pending';
            biometric.attempts = 0;
            biometric.lastAttemptAt = new Date();
        } else {
            // Create new biometric verification
            biometric = new BiometricVerification({
                examId,
                studentName,
                registerNumber,
                referencePhoto: photoKeyOrBase64,
                status: 'pending',
                lastAttemptAt: new Date()
            });
        }

        await biometric.save();

        return {
            success: true,
            biometricId: biometric._id,
            status: biometric.status
        };
    } catch (error) {
        console.error('Error uploading reference photo:', error);
        throw error;
    }
}

/**
 * Verify student using live photo capture
 */
async function verifyLivePhoto({ examId, userId, registerNumber, livePhotoBase64 }) {
    try {
        // Find biometric verification record
        const biometric = await BiometricVerification.findOne({
            examId,
            registerNumber
        });

        if (!biometric) {
            throw new Error('No biometric record found. Please upload reference photo first.');
        }

        if (biometric.status === 'rejected') {
            throw new Error('Biometric verification was rejected. Please contact administrator.');
        }

        if (biometric.status === 'pending') {
            throw new Error('Biometric verification is pending admin approval.');
        }

        // Store live photo to S3/R2 or fallback
        const livePhotoKeyOrBase64 = await storeBiometricPhoto({
            examId,
            userId,
            registerNumber,
            photoBase64: livePhotoBase64,
            type: 'live'
        });

        // Store live photo reference
        biometric.livePhoto = livePhotoKeyOrBase64;
        biometric.attempts += 1;
        biometric.lastAttemptAt = new Date();

        // Basic similarity check (placeholder)
        const similarityScore = calculateSimilarity(
            biometric.referencePhoto,
            livePhotoBase64
        );

        biometric.similarityScore = similarityScore;
        await biometric.save();

        // Threshold for automatic approval
        const threshold = 70;
        const isVerified = similarityScore >= threshold;

        return {
            success: true,
            verified: isVerified,
            similarityScore,
            message: isVerified
                ? 'Biometric verification successful'
                : 'Biometric verification failed. Please try again or contact administrator.'
        };
    } catch (error) {
        console.error('Error verifying live photo:', error);
        throw error;
    }
}

/**
 * Basic similarity calculation
 */
function calculateSimilarity(photo1, photo2) {
    const len1 = (photo1 || '').length;
    const len2 = (photo2 || '').length;
    const diff = Math.abs(len1 - len2);
    const maxLen = Math.max(len1, len2) || 1;
    const similarity = ((maxLen - diff) / maxLen) * 100;

    return Math.min(100, Math.max(0, similarity + (Math.random() * 20 - 10)));
}

/**
 * Get pending biometric verifications (Admin)
 * Automatically converts S3 object keys to short-lived presigned GET URLs
 * while preserving backward compatibility for legacy base64 entries.
 */
async function getPendingVerifications(examId = null) {
    try {
        const query = { status: 'pending' };
        if (examId) {
            query.examId = examId;
        }

        const verifications = await BiometricVerification.find(query)
            .sort({ createdAt: -1 })
            .lean();

        // Manually populate examId and resolve photo URLs
        const populatedVerifications = await Promise.all(
            verifications.map(async (verification) => {
                try {
                    const exam = await ExamMaster.findById(verification.examId)
                        .select('title examCode')
                        .lean();

                    const resolvedRefPhoto = await resolvePhotoUrl(verification.referencePhoto);
                    const resolvedLivePhoto = await resolvePhotoUrl(verification.livePhoto);

                    return {
                        ...verification,
                        referencePhoto: resolvedRefPhoto,
                        livePhoto: resolvedLivePhoto,
                        examId: exam || verification.examId
                    };
                } catch (err) {
                    console.error('Error populating verification item:', err);
                    return verification;
                }
            })
        );

        return populatedVerifications;
    } catch (error) {
        console.error('Error getting pending verifications:', error);
        throw error;
    }
}

/**
 * Approve biometric verification (Admin)
 */
async function approveBiometric(biometricId, adminId) {
    try {
        const biometric = await BiometricVerification.findById(biometricId);

        if (!biometric) {
            throw new Error('Biometric verification not found');
        }

        biometric.status = 'approved';
        biometric.verifiedBy = adminId;
        biometric.verifiedAt = new Date();

        await biometric.save();

        return {
            success: true,
            message: 'Biometric verification approved'
        };
    } catch (error) {
        console.error('Error approving biometric:', error);
        throw error;
    }
}

/**
 * Reject biometric verification (Admin)
 */
async function rejectBiometric(biometricId, adminId, reason) {
    try {
        const biometric = await BiometricVerification.findById(biometricId);

        if (!biometric) {
            throw new Error('Biometric verification not found');
        }

        biometric.status = 'rejected';
        biometric.verifiedBy = adminId;
        biometric.verifiedAt = new Date();
        biometric.rejectionReason = reason;

        await biometric.save();

        return {
            success: true,
            message: 'Biometric verification rejected'
        };
    } catch (error) {
        console.error('Error rejecting biometric:', error);
        throw error;
    }
}

/**
 * Get biometric status for a student
 */
async function getBiometricStatus(examId, registerNumber) {
    try {
        const biometric = await BiometricVerification.findOne({
            examId,
            registerNumber
        });

        if (!biometric) {
            return {
                exists: false,
                status: 'not_submitted'
            };
        }

        const resolvedRefPhoto = await resolvePhotoUrl(biometric.referencePhoto);

        return {
            exists: true,
            status: biometric.status,
            similarityScore: biometric.similarityScore,
            attempts: biometric.attempts,
            lastAttemptAt: biometric.lastAttemptAt,
            referencePhoto: resolvedRefPhoto
        };
    } catch (error) {
        console.error('Error getting biometric status:', error);
        throw error;
    }
}

module.exports = {
    uploadReferencePhoto,
    verifyLivePhoto,
    getPendingVerifications,
    approveBiometric,
    rejectBiometric,
    getBiometricStatus
};
