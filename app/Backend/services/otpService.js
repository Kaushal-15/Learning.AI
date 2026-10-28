'use strict';

const User = require('../models/User');
const { generateOtp, hashOtp, verifyOtpHash } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');

const OTP_EXPIRY_MS = 10 * 60 * 1000;      // 10 minutes code validity
const RESEND_COOLDOWN_MS = 45 * 1000;      // 45 seconds cooldown timer
const MAX_RESEND_ATTEMPTS = 3;             // 3 attempts
const RESEND_BLOCK_MS = 5 * 60 * 1000;     // 5 minutes lockout after 3 attempts
const MAX_VERIFY_ATTEMPTS = 5;             // max 5 wrong tries

/**
 * Issue a new OTP for the given user and purpose.
 * Enforces a 45-second resend cooldown.
 * Gives only 3 resend attempts; after 3 attempts, blocks resends for 5 minutes.
 *
 * @param {import('mongoose').Document} user
 * @param {'signup'|'reset'} purpose
 * @param {boolean} isResend - true if user requested a resend
 * @returns {Promise<void>}
 */
async function issueOtp(user, purpose, isResend = false) {
  const now = Date.now();
  let resendCount = user.otp?.resendCount || 0;
  let resendBlockedUntil = user.otp?.resendBlockedUntil
    ? new Date(user.otp.resendBlockedUntil).getTime()
    : 0;

  if (isResend) {
    // 1. Check if currently blocked for 5 minutes
    if (resendBlockedUntil > now) {
      const remainingSeconds = Math.ceil((resendBlockedUntil - now) / 1000);
      const err = new Error(
        `Too many resend attempts. Please wait ${Math.ceil(remainingSeconds / 60)} minute(s) before trying again.`
      );
      err.status = 429;
      err.retryAfter = remainingSeconds;
      throw err;
    }

    // If block expired, reset counter and block timestamp
    if (resendBlockedUntil && resendBlockedUntil <= now) {
      resendCount = 0;
      resendBlockedUntil = 0;
    }

    // 2. Check 45-second cooldown
    if (user.otp && user.otp.lastSentAt) {
      const elapsed = now - new Date(user.otp.lastSentAt).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        const err = new Error(`Please wait ${retryAfter}s before requesting a new code`);
        err.status = 429;
        err.retryAfter = retryAfter;
        throw err;
      }
    }

    // 3. Check if reached maximum attempts (3 resends)
    if (resendCount >= MAX_RESEND_ATTEMPTS) {
      const blockUntilDate = new Date(now + RESEND_BLOCK_MS);
      await User.findByIdAndUpdate(
        user._id,
        { 'otp.resendBlockedUntil': blockUntilDate },
        { runValidators: false }
      );
      const err = new Error(
        'Maximum resend attempts reached (3/3). You are blocked for 5 minutes.'
      );
      err.status = 429;
      err.retryAfter = 300;
      throw err;
    }

    // Increment resend attempt count
    resendCount += 1;
    if (resendCount >= MAX_RESEND_ATTEMPTS) {
      // Set the 5-minute block starting now
      resendBlockedUntil = now + RESEND_BLOCK_MS;
    }
  } else {
    // Initial creation / first send resets counts
    resendCount = 0;
    resendBlockedUntil = 0;
  }

  const code = generateOtp();
  const hash = hashOtp(user.email, purpose, code);
  const nowDate = new Date(now);

  await User.findByIdAndUpdate(
    user._id,
    {
      otp: {
        purpose,
        hash,
        expiresAt: new Date(now + OTP_EXPIRY_MS),
        attempts: 0,
        lastSentAt: nowDate,
        resendCount,
        resendBlockedUntil: resendBlockedUntil ? new Date(resendBlockedUntil) : null,
      },
    },
    { runValidators: false }
  );

  // Send the email (caller catches failures)
  await sendOtpEmail(user.email, code, purpose);
}

/**
 * Verify a submitted OTP code.
 *
 * Atomically increments the attempt counter BEFORE comparing so that
 * concurrent requests cannot bypass the lockout. Max 5 wrong tries.
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

  // Lockout after MAX_VERIFY_ATTEMPTS wrong tries
  if (user.otp.attempts > MAX_VERIFY_ATTEMPTS) {
    // Clear the OTP so a new one must be requested
    await User.findByIdAndUpdate(user._id, { $unset: { otp: 1 } }, { runValidators: false });
    const err = new Error('Too many failed attempts. Please request a new code.');
    err.status = 400;
    throw err;
  }

  // Timing-safe comparison
  const expectedHash = hashOtp(email, purpose, code);
  if (!verifyOtpHash(expectedHash, user.otp.hash)) {
    const remaining = MAX_VERIFY_ATTEMPTS - user.otp.attempts;
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
