'use strict';

const User = require('../models/User');
const { issueOtp, verifyOtp } = require('../services/otpService');
const { generateSalt, sha256Hash } = require('../utils/crypto');
const connectDB = require('../config/database');

const PEPPER = process.env.PEPPER || '';

/**
 * POST /api/auth/verify-otp
 * Verify the signup OTP and mark the user as verified.
 */
exports.verifyOTP = async (req, res) => {
  try {
    await connectDB();
    const { email, otp } = req.body;

    if (!email || typeof email !== 'string' || !otp || typeof otp !== 'string') {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await verifyOtp(normalizedEmail, 'signup', otp.trim());

    // Mark as verified
    await User.findByIdAndUpdate(user._id, { isVerified: true }, { runValidators: false });

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    const status = error.status || 500;
    const message = status === 500 ? 'Server error during verification' : error.message;
    if (status === 500) console.error('Verification error:', error);
    res.status(status).json({ message });
  }
};

/**
 * POST /api/auth/resend-otp
 * Resend the signup OTP. Returns a generic 200 whether or not the account exists.
 */
exports.resendOtp = async (req, res) => {
  try {
    await connectDB();
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Same response whether or not the account exists (prevents enumeration)
    if (!user || user.isVerified) {
      return res.status(200).json({ message: 'If an account exists, a new code has been sent.' });
    }

    await issueOtp(user, 'signup');

    res.status(200).json({ message: 'If an account exists, a new code has been sent.' });
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({
        message: error.message,
        retryAfter: error.retryAfter,
      });
    }
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/auth/forgot-password
 * Issue a password-reset OTP. Returns a generic 200 whether or not the account exists.
 */
exports.forgotPassword = async (req, res) => {
  try {
    await connectDB();
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, authProvider: 'local' });

    // Same generic response regardless of existence
    if (!user) {
      return res.status(200).json({ message: 'If an account exists, a reset code has been sent.' });
    }

    await issueOtp(user, 'reset');

    res.status(200).json({ message: 'If an account exists, a reset code has been sent.' });
  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({
        message: error.message,
        retryAfter: error.retryAfter,
      });
    }
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Hash a password using the project's current scheme.
 * Centralised here so it is easy to swap to bcrypt later.
 *
 * @returns {{ salt: string, passwordHash: string }}
 */
function hashPassword(password) {
  const salt = generateSalt();
  const passwordHash = sha256Hash(password, salt, PEPPER);
  return { salt, passwordHash };
}

/**
 * POST /api/auth/reset-password
 * Verify the reset OTP and set a new password.
 */
exports.resetPassword = async (req, res) => {
  try {
    await connectDB();
    const { email, otp, newPassword } = req.body;

    if (
      !email || typeof email !== 'string' ||
      !otp || typeof otp !== 'string' ||
      !newPassword || typeof newPassword !== 'string'
    ) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ message: 'Password must be between 8 and 128 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify the reset OTP (throws on failure)
    const user = await verifyOtp(normalizedEmail, 'reset', otp.trim());

    // Set new password and clear refresh token (sign out all sessions)
    const { salt, passwordHash } = hashPassword(newPassword);

    await User.findByIdAndUpdate(user._id, {
      salt,
      passwordHash,
      refreshToken: null,
    }, { runValidators: false });

    res.status(200).json({ message: 'Password reset successfully. Please sign in.' });
  } catch (error) {
    const status = error.status || 500;
    const message = status === 500 ? 'Server error during password reset' : error.message;
    if (status === 500) console.error('Reset password error:', error);
    res.status(status).json({ message });
  }
};
