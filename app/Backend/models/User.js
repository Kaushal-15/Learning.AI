const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, unique: true, trim: true },
  learnerId: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  salt: { type: String, required: true },
  hasCompletedOnboarding: { type: Boolean, default: false },
  selectedRoadmap: { type: String, default: null }, // 'full-stack', 'frontend', 'backend', etc.
  skillLevel: { type: String, default: null },
  learningTimeline: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  refreshToken: { type: String }, // optional store for refresh token validation
  isVerified: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationExpires: { type: Date },
  settings: {
    theme: { type: String, default: 'light' },
    notifications: { type: Boolean, default: true }
  }
});

// Generate unique learner ID
userSchema.statics.generateLearnerId = function () {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `LRN_${timestamp}_${randomStr}`.toUpperCase();
};

module.exports = mongoose.model('User', userSchema);
