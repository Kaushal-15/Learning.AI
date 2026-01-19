const BiometricVerification = require('../models/BiometricVerification');
const { ExamMaster } = require('../config/examDatabase');

/**
 * Biometric Verification Service
 * Handles photo storage, verification, and face comparison
 */

/**
 * Upload student reference photo for biometric verification
 */
async function uploadReferencePhoto({ examId, studentName, registerNumber, photoBase64 }) {
    try {
        // Check if exam exists and requires biometric
        const exam = await ExamMaster.findById(examId);
        if (!exam) {
            throw new Error('Exam not found');
        }

        // FORCED SECURITY: Accept biometric for ALL exams (frontend enforcement)

        // Check if student is registered for this exam
        const studentExists = exam.students.some(
            s => s.registerNumber === registerNumber
        );

        if (!studentExists && exam.requireStudentVerification) {
            throw new Error('Student not registered for this exam');
        }

        // Check if biometric already exists
        let biometric = await BiometricVerification.findOne({
            examId,
            registerNumber
        });

        if (biometric) {
            // Update existing biometric
            biometric.referencePhoto = photoBase64;
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
                referencePhoto: photoBase64,
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
 * This performs a basic similarity check
 * For production, integrate with face-api.js or cloud-based face recognition
 */
async function verifyLivePhoto({ examId, registerNumber, livePhotoBase64 }) {
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

        // Store live photo
        biometric.livePhoto = livePhotoBase64;
        biometric.attempts += 1;
        biometric.lastAttemptAt = new Date();

        // Basic similarity check (placeholder)
        // In production, use face-api.js or cloud service
        const similarityScore = calculateSimilarity(
            biometric.referencePhoto,
            livePhotoBase64
        );

        biometric.similarityScore = similarityScore;
        await biometric.save();

        // Threshold for automatic approval (can be configured)
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
 * Basic similarity calculation (placeholder)
 * In production, replace with actual face recognition library
 */
function calculateSimilarity(photo1Base64, photo2Base64) {
    // Placeholder: Simple length comparison
    // In production, use face-api.js, AWS Rekognition, or similar
    const len1 = photo1Base64.length;
    const len2 = photo2Base64.length;
    const diff = Math.abs(len1 - len2);
    const maxLen = Math.max(len1, len2);
    const similarity = ((maxLen - diff) / maxLen) * 100;

    // Add some randomness for demo purposes
    return Math.min(100, Math.max(0, similarity + (Math.random() * 20 - 10)));
}

/**
 * Get pending biometric verifications (Admin)
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

        // Manually populate examId with ExamMaster details
        const populatedVerifications = await Promise.all(
            verifications.map(async (verification) => {
                try {
                    const exam = await ExamMaster.findById(verification.examId)
                        .select('title examCode')
                        .lean();
                    
                    return {
                        ...verification,
                        examId: exam || verification.examId
                    };
                } catch (err) {
                    console.error('Error populating exam for verification:', err);
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

        return {
            exists: true,
            status: biometric.status,
            similarityScore: biometric.similarityScore,
            attempts: biometric.attempts,
            lastAttemptAt: biometric.lastAttemptAt
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
