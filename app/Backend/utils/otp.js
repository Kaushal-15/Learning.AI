'use strict';

const crypto = require('crypto');

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt instead of Math.random for uniform distribution.
 */
function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Create an HMAC-SHA256 hash of the OTP bound to the email and purpose.
 * This prevents hash reuse across different emails or purposes.
 *
 * @param {string} email
 * @param {string} purpose  — 'signup' | 'reset'
 * @param {string} code     — the 6-digit OTP
 * @returns {string} hex digest
 */
function hashOtp(email, purpose, code) {
  const secret = process.env.OTP_SECRET;
  if (!secret) {
    throw new Error('OTP_SECRET environment variable is required');
  }
  return crypto
    .createHmac('sha256', secret)
    .update(`${email}:${purpose}:${code}`)
    .digest('hex');
}

/**
 * Timing-safe comparison of two OTP hashes.
 * Returns true only if both are equal-length hex strings that match.
 *
 * @param {string} a — computed hash
 * @param {string} b — stored hash
 * @returns {boolean}
 */
function verifyOtpHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

module.exports = { generateOtp, hashOtp, verifyOtpHash };
