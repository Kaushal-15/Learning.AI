/**
 * Exam State Helper Tests
 * Tests computeExamState across before-verification, in-verification, live, and ended
 * phases using both IST (+05:30) and UTC reference times.
 *
 * Run with:  node --check tests/examState.test.js  (syntax check)
 *            node tests/examState.test.js           (actual tests)
 */

'use strict';

const { computeExamState } = require('../services/examStateHelper');

// ---------------------------------------------------------------------------
// Minimal test harness (no external deps)
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅  ${message}`);
    passed++;
  } else {
    console.error(`  ❌  ${message}`);
    failed++;
  }
}

function describe(suiteName, fn) {
  console.log(`\n📋  ${suiteName}`);
  fn();
}

// ---------------------------------------------------------------------------
// Shared exam fixture (all times in UTC)
// Exam: starts 2026-11-01 10:00 UTC, ends 11:00 UTC
//       verificationDuration = 15 min
//       → verificationStart = 09:45 UTC = 15:15 IST
//       → startTime         = 10:00 UTC = 15:30 IST
//       → endTime           = 11:00 UTC = 16:30 IST
// ---------------------------------------------------------------------------
const exam = {
  startTime: new Date('2026-11-01T10:00:00.000Z'),
  endTime:   new Date('2026-11-01T11:00:00.000Z'),
  verificationDuration: 15,
};

/** Convert an IST wall-clock string to a UTC Date (IST = UTC+05:30). */
function fromIST(istString) {
  // istString like '2026-11-01T15:00:00'
  return new Date(istString + '+05:30');
}

// ---------------------------------------------------------------------------
describe('BEFORE verification window — UTC reference clock', () => {
  // 09:00 UTC (before 09:45 UTC verificationStart)
  const serverNow = new Date('2026-11-01T09:00:00.000Z');
  const state = computeExamState(exam, serverNow);

  assert(state.status === 'scheduled', `status is 'scheduled' (got '${state.status}')`);
  assert(!state.isVerificationOpen,    'isVerificationOpen is false');
  assert(!state.isLive,                'isLive is false');
  assert(!state.hasEnded,              'hasEnded is false');
  assert(state.secondsUntilVerification > 0,  'secondsUntilVerification > 0');
  assert(state.serverNow === serverNow.toISOString(), 'serverNow is ISO string');
});

describe('BEFORE verification window — IST reference clock', () => {
  // 14:30 IST = 09:00 UTC (before verificationStart at 15:15 IST)
  const serverNow = fromIST('2026-11-01T14:30:00');
  const state = computeExamState(exam, serverNow);

  assert(state.status === 'scheduled', `status is 'scheduled' for 14:30 IST (got '${state.status}')`);
  assert(!state.isVerificationOpen,    'isVerificationOpen is false at 14:30 IST');
  assert(state.secondsUntilVerification > 0, 'secondsUntilVerification > 0 at 14:30 IST');
});

describe('INSIDE verification window — UTC reference clock', () => {
  // 09:50 UTC (after 09:45 verificationStart, before 10:00 start)
  const serverNow = new Date('2026-11-01T09:50:00.000Z');
  const state = computeExamState(exam, serverNow);

  assert(state.status === 'verification-open', `status is 'verification-open' (got '${state.status}')`);
  assert(state.isVerificationOpen,  'isVerificationOpen is true');
  assert(!state.isLive,             'isLive is false (not started yet)');
  assert(!state.hasEnded,           'hasEnded is false');
  assert(state.secondsUntilVerification === 0, 'secondsUntilVerification is 0');
  assert(state.secondsUntilStart > 0,          'secondsUntilStart > 0');
});

describe('INSIDE verification window — IST reference clock', () => {
  // 15:20 IST = 09:50 UTC (inside verification window)
  const serverNow = fromIST('2026-11-01T15:20:00');
  const state = computeExamState(exam, serverNow);

  assert(state.status === 'verification-open',
    `status is 'verification-open' for 15:20 IST (got '${state.status}')`);
  assert(state.isVerificationOpen, 'isVerificationOpen is true at 15:20 IST');
});

describe('LIVE (exam in progress) — UTC reference clock', () => {
  // 10:30 UTC (between startTime 10:00 and endTime 11:00)
  const serverNow = new Date('2026-11-01T10:30:00.000Z');
  const state = computeExamState(exam, serverNow);

  assert(state.status === 'live', `status is 'live' (got '${state.status}')`);
  assert(state.isLive,           'isLive is true');
  assert(state.isVerificationOpen, 'isVerificationOpen is still true during live phase');
  assert(!state.hasEnded,         'hasEnded is false');
  assert(state.secondsUntilStart === 0, 'secondsUntilStart is 0');
  assert(state.secondsUntilEnd > 0,     'secondsUntilEnd > 0');
});

describe('LIVE — IST reference clock', () => {
  // 16:00 IST = 10:30 UTC (live)
  const serverNow = fromIST('2026-11-01T16:00:00');
  const state = computeExamState(exam, serverNow);

  assert(state.status === 'live', `status is 'live' for 16:00 IST (got '${state.status}')`);
  assert(state.isLive, 'isLive is true at 16:00 IST');
});

describe('ENDED — UTC reference clock', () => {
  // 11:01 UTC (after endTime 11:00)
  const serverNow = new Date('2026-11-01T11:01:00.000Z');
  const state = computeExamState(exam, serverNow);

  assert(state.status === 'ended', `status is 'ended' (got '${state.status}')`);
  assert(!state.isLive,           'isLive is false');
  assert(state.hasEnded,          'hasEnded is true');
  assert(state.secondsUntilEnd === 0, 'secondsUntilEnd is 0');
});

describe('ENDED — IST reference clock', () => {
  // 16:35 IST = 11:05 UTC (ended)
  const serverNow = fromIST('2026-11-01T16:35:00');
  const state = computeExamState(exam, serverNow);

  assert(state.status === 'ended', `status is 'ended' for 16:35 IST (got '${state.status}')`);
  assert(state.hasEnded, 'hasEnded is true at 16:35 IST');
});

describe('Exact verificationStart boundary', () => {
  // Exactly at verificationStart (09:45:00 UTC)
  const serverNow = new Date('2026-11-01T09:45:00.000Z');
  const state = computeExamState(exam, serverNow);

  assert(state.status === 'verification-open',
    `status is 'verification-open' exactly at verificationStart (got '${state.status}')`);
});

describe('Exact startTime boundary', () => {
  // Exactly at startTime (10:00:00 UTC)
  const serverNow = new Date('2026-11-01T10:00:00.000Z');
  const state = computeExamState(exam, serverNow);

  assert(state.status === 'live', `status is 'live' exactly at startTime (got '${state.status}')`);
});

describe('Exact endTime boundary', () => {
  // Exactly at endTime (11:00:00 UTC)
  const serverNow = new Date('2026-11-01T11:00:00.000Z');
  const state = computeExamState(exam, serverNow);

  // now > endTime is false (it's equal), so isLive wins
  assert(state.status === 'live', `status is 'live' exactly at endTime (got '${state.status}')`);
});

describe('verificationDuration = 0 (no verification window)', () => {
  const noVerifyExam = {
    startTime: new Date('2026-11-01T10:00:00.000Z'),
    endTime:   new Date('2026-11-01T11:00:00.000Z'),
    verificationDuration: 0,
  };
  // 09:59 UTC — should be 'scheduled' because verificationStart == startTime
  const serverNow = new Date('2026-11-01T09:59:00.000Z');
  const state = computeExamState(noVerifyExam, serverNow);

  assert(state.status === 'scheduled', `status 'scheduled' when verificationDuration=0 (got '${state.status}')`);
});

describe('10-second submission grace period boundary', () => {
  // Exactly at endTime (11:00:00.000Z)
  const atEndTime = computeExamState(exam, new Date('2026-11-01T11:00:00.000Z'));
  assert(atEndTime.isSubmissionAllowed === true, 'isSubmissionAllowed is true at endTime');
  assert(atEndTime.hasGracePeriodExpired === false, 'hasGracePeriodExpired is false at endTime');

  // Exactly at endTime + 10s grace boundary (11:00:10.000Z)
  const atGraceBoundary = computeExamState(exam, new Date('2026-11-01T11:00:10.000Z'));
  assert(atGraceBoundary.isSubmissionAllowed === true, 'isSubmissionAllowed is true at endTime + 10s');
  assert(atGraceBoundary.hasGracePeriodExpired === false, 'hasGracePeriodExpired is false at endTime + 10s');
  assert(atGraceBoundary.status === 'ended', 'status is ended during grace period');

  // Past 10s grace boundary (11:00:10.001Z)
  const pastGrace = computeExamState(exam, new Date('2026-11-01T11:00:10.001Z'));
  assert(pastGrace.isSubmissionAllowed === false, 'isSubmissionAllowed is false past 10s grace');
  assert(pastGrace.hasGracePeriodExpired === true, 'hasGracePeriodExpired is true past 10s grace');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
}
