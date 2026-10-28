/**
 * Test script for exam verification window and lazy status derivation in IST and UTC.
 * Run with: node scripts/test-exam-window.js
 */

const assert = require('assert');
const { computeExamState } = require('../app/Backend/services/examStateHelper');

console.log('🧪 Starting Exam State & Window Timing Tests...\n');

// Exam: 18:30 IST to 19:30 IST (13:00 UTC to 14:00 UTC), verification: 15 min
// Verification window opens at 18:15 IST (12:45 UTC)
const examUtc = {
  title: 'Cloud Certification Exam (UTC Storage)',
  startTime: '2026-10-28T13:00:00.000Z',
  endTime: '2026-10-28T14:00:00.000Z',
  verificationDuration: 15,
};

const examIst = {
  title: 'Cloud Certification Exam (IST Offset)',
  startTime: '2026-10-28T18:30:00+05:30',
  endTime: '2026-10-28T19:30:00+05:30',
  verificationDuration: 15,
};

function runTestCases(exam, label) {
  console.log(`--- Testing for ${label} ---`);

  // Case 1: Before verification (18:00 IST / 12:30 UTC)
  const beforeTime = new Date('2026-10-28T12:30:00.000Z');
  const stateBefore = computeExamState(exam, beforeTime);
  assert.strictEqual(stateBefore.status, 'scheduled', 'Expected status to be scheduled before verification');
  assert.strictEqual(stateBefore.isVerificationOpen, false);
  assert.strictEqual(stateBefore.isLive, false);
  assert.strictEqual(stateBefore.hasEnded, false);
  assert.strictEqual(stateBefore.secondsUntilVerification, 15 * 60, '15 min until verification');
  console.log('✅ Case 1: Before verification window passed (scheduled, countdown active)');

  // Case 2: In verification window (18:20 IST / 12:50 UTC)
  const inVerifTime = new Date('2026-10-28T12:50:00.000Z');
  const stateInVerif = computeExamState(exam, inVerifTime);
  assert.strictEqual(stateInVerif.status, 'verification-open', 'Expected status to be verification-open');
  assert.strictEqual(stateInVerif.isVerificationOpen, true);
  assert.strictEqual(stateInVerif.isLive, false);
  assert.strictEqual(stateInVerif.hasEnded, false);
  assert.strictEqual(stateInVerif.secondsUntilStart, 10 * 60, '10 min until exam live');
  console.log('✅ Case 2: In verification window passed (verification-open, candidate entry permitted)');

  // Case 3: Live exam (18:45 IST / 13:15 UTC)
  const liveTime = new Date('2026-10-28T13:15:00.000Z');
  const stateLive = computeExamState(exam, liveTime);
  assert.strictEqual(stateLive.status, 'live', 'Expected status to be live');
  assert.strictEqual(stateLive.isVerificationOpen, true);
  assert.strictEqual(stateLive.isLive, true);
  assert.strictEqual(stateLive.hasEnded, false);
  assert.strictEqual(stateLive.secondsUntilEnd, 45 * 60, '45 min until exam ends');
  console.log('✅ Case 3: Live exam passed (live)');

  // Case 4: Ended exam (19:45 IST / 14:15 UTC)
  const endedTime = new Date('2026-10-28T14:15:00.000Z');
  const stateEnded = computeExamState(exam, endedTime);
  assert.strictEqual(stateEnded.status, 'ended', 'Expected status to be ended');
  assert.strictEqual(stateEnded.isVerificationOpen, false);
  assert.strictEqual(stateEnded.isLive, false);
  assert.strictEqual(stateEnded.hasEnded, true);
  console.log('✅ Case 4: Ended exam passed (ended)');
  console.log();
}

runTestCases(examUtc, 'UTC Storage Format');
runTestCases(examIst, 'IST Offset Format');

console.log('🎉 All Exam State & Timing Tests Passed Successfully!\n');
