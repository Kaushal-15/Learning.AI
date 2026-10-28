'use strict';

const User = require('../models/User');
const { generateOtp, hashOtp, verifyOtpHash } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');

const OTP_EXPIRY_MS = 10 * 60 * 1000;     // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;      // 60 seconds
const MAX_ATTEMPTS = 5;

/**
 * Issue a new OTP for the given user and purpose.
 * Enforces a 60-second resend cooldown.
 *
 * @param {import('mongoose').Document} user
 * @param {'signup'|'reset'} purpose
 * @returns {Promise<void>}
 */
async function issueOtp(user, purpose) {
  // Resend cooldown check
  if (user.otp && user.otp.lastSentAt) {
    const elapsed = Date.now() - new Date(user.otp.lastSentAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      const err = new Error('Please wait before requesting a new code');
      err.status = 429;
      err.retryAfter = retryAfter;
      throw err;
    }
  }

  const code = generateOtp();
  const hash = hashOtp(user.email, purpose, code);
  const now = new Date();

  await User.findByIdAndUpdate(user._id, {
    otp: {
      purpose,
      hash,
      expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
      attempts: 0,
      lastSentAt: now,
    },
  }, { runValidators: false });

  // Send the email (caller is responsible for catching send failures)
  await sendOtpEmail(user.email, code, purpose);
}

/**
 * Verify a submitted OTP code.
 *
 * Atomically increments the attempt counter BEFORE comparing so that
 * concurrent requests cannot bypass the lockout.  Max 5 wrong tries.
 * On success the otp subdocument is cleared (single-use).
 *
 * @param {string} email
 * @param {'signup'|'reset'} purpose
 * @param {string} code — the 6-digit string the user entered
 * @returns {Promise<import('mongoose').Document>} the updated user
 */
async function verifyOtp(email, purpose, code) {
  // Atomically increment attempts and return the UPDATED document
  const user = await User.findOneAndUpdate(
    {
      email,
      'otp.purpose': purpose,
      'otp.expiresAt': { $gt: new Date() },
    },
    { $inc: { 'otp.attempts': 1 } },
    { new: true }
  );

  if (!user) {
    const err = new Error('Invalid or expired verification code');
    err.status = 400;
    throw err;
  }

  // Lockout after MAX_ATTEMPTS wrong tries
  if (user.otp.attempts > MAX_ATTEMPTS) {
    // Clear the OTP so a new one must be requested
    await User.findByIdAndUpdate(user._id, { $unset: { otp: 1 } }, { runValidators: false });
    const err = new Error('Too many failed attempts. Please request a new code.');
    err.status = 400;
    throw err;
  }

  // Timing-safe comparison
  const expectedHash = hashOtp(email, purpose, code);
  if (!verifyOtpHash(expectedHash, user.otp.hash)) {
    const remaining = MAX_ATTEMPTS - user.otp.attempts;
    const err = new Error(
      remaining > 0
        ? `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
        : 'Too many failed attempts. Please request a new code.'
    );
    err.status = 400;
    throw err;
  }

  // Success — clear OTP (single-use)
  await User.findByIdAndUpdate(user._id, { $unset: { otp: 1 } }, { runValidators: false });

  return user;
}

module.exports = { issueOtp, verifyOtp };
