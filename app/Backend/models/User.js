const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, unique: true, trim: true },
  learnerId: { type: String, required: true, unique: true },

  // Authentication fields - optional for OAuth users
  passwordHash: { type: String }, // Required only for local auth
  salt: { type: String }, // Required only for local auth

  // OAuth fields
  googleId: { type: String, unique: true, sparse: true }, // Google OAuth ID
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' }, // Auth method
  profilePicture: { type: String }, // Profile picture URL from OAuth provider

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

// Validation: Local auth users must have password and salt
userSchema.pre('save', function (next) {
  if (this.authProvider === 'local' && (!this.passwordHash || !this.salt)) {
    return next(new Error('Password and salt are required for local authentication'));
  }
  if (this.authProvider === 'google' && !this.googleId) {
    return next(new Error('Google ID is required for Google authentication'));
  }
  next();
});

// Generate unique learner ID
userSchema.statics.generateLearnerId = function () {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `LRN_${timestamp}_${randomStr}`.toUpperCase();
};

module.exports = mongoose.model('User', userSchema);
