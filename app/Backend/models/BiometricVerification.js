const mongoose = require('mongoose');

const biometricVerificationSchema = new mongoose.Schema({
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamMaster',
        required: true
    },
    studentName: {
        type: String,
        required: true
    },
    registerNumber: {
        type: String,
        required: true
    },
    // Store reference photo as base64 string
    referencePhoto: {
        type: String,
        required: true
    },
    // Store live capture photo for comparison
    livePhoto: {
        type: String
    },
    // Verification status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    // Admin who approved/rejected
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: {
        type: Date
    },
    // Rejection reason if applicable
    rejectionReason: {
        type: String
    },
    // Similarity score from face comparison (0-100)
    similarityScore: {
        type: Number
    },
    // Number of verification attempts
    attempts: {
        type: Number,
        default: 0
    },
    // Last attempt timestamp
    lastAttemptAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for quick lookups
biometricVerificationSchema.index({ examId: 1, registerNumber: 1 });
biometricVerificationSchema.index({ status: 1 });

module.exports = mongoose.model('BiometricVerification', biometricVerificationSchema);
