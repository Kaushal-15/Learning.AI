/**
 * Exam State Helper
 * Path: app/Backend/services/examStateHelper.js
 * 
 * Computes exam lifecycle state lazily from timestamps.
 * Eliminates scheduler, setTimeout, and cron dependencies.
 */

const GRACE_PERIOD_MS = 10000; // 10 seconds submission grace period

/**
 * Derives current lifecycle state of an exam based on serverNow.
 * States:
 * - 'scheduled' (before verification window opens)
 * - 'verification-open' (inside verification window, before exam start)
 * - 'live' (between startTime and endTime)
 * - 'ended' (after endTime)
 *
 * @param {Object} exam
 * @param {Date|string} [serverNow]
 * @returns {Object} Computed state metadata
 */
function computeExamState(exam, serverNow = new Date()) {
  const now = serverNow instanceof Date ? serverNow : new Date(serverNow);
  const startTime = new Date(exam.startTime);
  const endTime = new Date(exam.endTime);
  // Use nullish-like check: treat 0 as valid (no verification window), fall back to 15 only for null/undefined/NaN
  const rawVd = Number(exam.verificationDuration);
  const verificationDuration = (Number.isFinite(rawVd) && rawVd >= 0) ? rawVd : 15;
  const verificationStart = new Date(startTime.getTime() - verificationDuration * 60000);
  const graceEndTime = new Date(endTime.getTime() + GRACE_PERIOD_MS);

  let status = 'scheduled';
  if (now > endTime) {
    status = 'ended';
  } else if (now >= startTime) {
    status = 'live';
  } else if (now >= verificationStart) {
    status = 'verification-open';
  } else {
    status = 'scheduled';
  }

  const msUntilVerification = Math.max(0, verificationStart.getTime() - now.getTime());
  const msUntilStart = Math.max(0, startTime.getTime() - now.getTime());
  const msUntilEnd = Math.max(0, endTime.getTime() - now.getTime());
  const msUntilGraceEnd = Math.max(0, graceEndTime.getTime() - now.getTime());

  return {
    status,
    serverNow: now.toISOString(),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    verificationStart: verificationStart.toISOString(),
    verificationDuration,
    graceEndTime: graceEndTime.toISOString(),
    isVerificationOpen: now >= verificationStart && now <= endTime,
    isLive: now >= startTime && now <= endTime,
    hasEnded: now > endTime,
    isSubmissionAllowed: now <= graceEndTime,
    hasGracePeriodExpired: now > graceEndTime,
    msUntilVerification,
    msUntilStart,
    msUntilEnd,
    msUntilGraceEnd,
    secondsUntilVerification: Math.ceil(msUntilVerification / 1000),
    secondsUntilStart: Math.ceil(msUntilStart / 1000),
    secondsUntilEnd: Math.ceil(msUntilEnd / 1000),
    secondsUntilGraceEnd: Math.ceil(msUntilGraceEnd / 1000),
  };
}

module.exports = {
  computeExamState,
  GRACE_PERIOD_MS,
};
