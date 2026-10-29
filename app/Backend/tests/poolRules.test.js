/**
 * Pool Rules Unit Tests — Task 5
 * Tests getRequiredPerDifficulty and validateQuestionPool helper.
 *
 * Run with:  node --check tests/poolRules.test.js   (syntax check)
 *            node tests/poolRules.test.js            (run tests)
 */

'use strict';

const {
  getRequiredPerDifficulty,
  countQuestionsByDifficulty,
  validateQuestionPool,
} = require('../services/poolRules');

// ---------------------------------------------------------------------------
// Minimal test harness
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
// Build a mock question pool with controlled difficulty distribution
// ---------------------------------------------------------------------------
function makePool({ easy = 0, medium = 0, hard = 0 }) {
  const pool = [];
  for (let i = 0; i < easy;   i++) pool.push({ difficultyLevel: 'easy' });
  for (let i = 0; i < medium; i++) pool.push({ difficultyLevel: 'medium' });
  for (let i = 0; i < hard;   i++) pool.push({ difficultyLevel: 'hard' });
  return pool;
}

// ---------------------------------------------------------------------------
describe('getRequiredPerDifficulty — canonical cases', () => {
  const cases = [
    { N: 10, expected: 6  },  // ceil(0.6 * 10) = 6
    { N: 15, expected: 9  },  // ceil(0.6 * 15) = 9
    { N: 1,  expected: 1  },  // ceil(0.6 * 1)  = 1
    { N: 5,  expected: 3  },  // ceil(0.6 * 5)  = 3
    { N: 3,  expected: 2  },  // ceil(0.6 * 3)  = ceil(1.8) = 2
    { N: 20, expected: 12 },  // ceil(0.6 * 20) = 12
    { N: 100,expected: 60 },  // ceil(0.6 * 100)= 60
  ];

  for (const { N, expected } of cases) {
    const result = getRequiredPerDifficulty(N);
    assert(result.easy   === expected, `N=${N}: easy   required = ${expected} (got ${result.easy})`);
    assert(result.medium === expected, `N=${N}: medium required = ${expected} (got ${result.medium})`);
    assert(result.hard   === expected, `N=${N}: hard   required = ${expected} (got ${result.hard})`);
    assert(result.totalRequired === expected * 3,
      `N=${N}: totalRequired = ${expected * 3} (got ${result.totalRequired})`);
  }
});

describe('getRequiredPerDifficulty — N=0 must throw', () => {
  let threw = false;
  try {
    getRequiredPerDifficulty(0);
  } catch {
    threw = true;
  }
  assert(threw, 'N=0 throws an error');
});

describe('getRequiredPerDifficulty — negative N must throw', () => {
  let threw = false;
  try {
    getRequiredPerDifficulty(-5);
  } catch {
    threw = true;
  }
  assert(threw, 'negative N throws an error');
});

describe('countQuestionsByDifficulty — mixed pool', () => {
  const pool = makePool({ easy: 4, medium: 7, hard: 3 });
  const counts = countQuestionsByDifficulty(pool);

  assert(counts.easy   === 4,  `easy   count = 4 (got ${counts.easy})`);
  assert(counts.medium === 7,  `medium count = 7 (got ${counts.medium})`);
  assert(counts.hard   === 3,  `hard   count = 3 (got ${counts.hard})`);
  assert(counts.total  === 14, `total  count = 14 (got ${counts.total})`);
});

describe('countQuestionsByDifficulty — uses numeric difficulty field (3=easy,5=medium,8=hard)', () => {
  // poolRules uses string match; numeric values without difficultyLevel fall to "medium" bucket
  const pool = [
    { difficulty: 'easy' },
    { difficulty: 'medium' },
    { difficulty: 'hard' },
    { difficultyLevel: 'easy' },
  ];
  const counts = countQuestionsByDifficulty(pool);
  assert(counts.easy   === 2, `easy   count = 2 (got ${counts.easy})`);
  assert(counts.medium === 1, `medium count = 1 (got ${counts.medium})`);
  assert(counts.hard   === 1, `hard   count = 1 (got ${counts.hard})`);
});

describe('validateQuestionPool — N=10, passing pool (6/6/6)', () => {
  const pool = makePool({ easy: 6, medium: 6, hard: 6 });
  const result = validateQuestionPool(pool, 10);

  assert(result.valid === true, 'pool 6/6/6 passes N=10 rule');
  assert(result.requiredPerDifficulty === 6, `requiredPerDifficulty = 6 (got ${result.requiredPerDifficulty})`);
  assert(result.deficits.easy   === 0, 'no easy deficit');
  assert(result.deficits.medium === 0, 'no medium deficit');
  assert(result.deficits.hard   === 0, 'no hard deficit');
});

describe('validateQuestionPool — N=10, failing pool (5/8/6) — easy shortfall', () => {
  const pool = makePool({ easy: 5, medium: 8, hard: 6 });
  const result = validateQuestionPool(pool, 10);

  assert(result.valid === false,          'pool 5/8/6 fails N=10 rule (easy short)');
  assert(result.deficits.easy   === 1,    `easy deficit = 1 (got ${result.deficits.easy})`);
  assert(result.deficits.medium === 0,    'no medium deficit');
  assert(result.deficits.hard   === 0,    'no hard deficit');
});

describe('validateQuestionPool — N=10, failing pool (5/8/3) — easy and hard shortfall', () => {
  const pool = makePool({ easy: 5, medium: 8, hard: 3 });
  const result = validateQuestionPool(pool, 10);

  assert(result.valid === false,       'pool 5/8/3 fails N=10 rule');
  assert(result.deficits.easy === 1,   `easy deficit = 1 (got ${result.deficits.easy})`);
  assert(result.deficits.hard === 3,   `hard deficit = 3 (got ${result.deficits.hard})`);
});

describe('validateQuestionPool — N=15, passing pool (9/9/9)', () => {
  const pool = makePool({ easy: 9, medium: 9, hard: 9 });
  const result = validateQuestionPool(pool, 15);

  assert(result.valid === true, 'pool 9/9/9 passes N=15 rule');
});

describe('validateQuestionPool — N=15, failing pool (9/9/8) — hard shortfall', () => {
  const pool = makePool({ easy: 9, medium: 9, hard: 8 });
  const result = validateQuestionPool(pool, 15);

  assert(result.valid === false,       'pool 9/9/8 fails N=15 rule');
  assert(result.deficits.hard === 1,   `hard deficit = 1 (got ${result.deficits.hard})`);
});

describe('validateQuestionPool — N=1, passing pool (1/1/1)', () => {
  const pool = makePool({ easy: 1, medium: 1, hard: 1 });
  const result = validateQuestionPool(pool, 1);

  assert(result.valid === true, 'pool 1/1/1 passes N=1 rule (ceil(0.6*1)=1)');
});

describe('validateQuestionPool — N=1, failing pool (0/1/1) — easy missing', () => {
  const pool = makePool({ easy: 0, medium: 1, hard: 1 });
  const result = validateQuestionPool(pool, 1);

  assert(result.valid === false,       'pool 0/1/1 fails N=1 rule');
  assert(result.deficits.easy === 1,   `easy deficit = 1 (got ${result.deficits.easy})`);
});

describe('validateQuestionPool — empty pool always fails', () => {
  const result = validateQuestionPool([], 10);
  assert(result.valid === false, 'empty pool fails');
  assert(result.deficits.easy   === 6, `easy deficit = 6`);
  assert(result.deficits.medium === 6, `medium deficit = 6`);
  assert(result.deficits.hard   === 6, `hard deficit = 6`);
});

describe('validateQuestionPool — message contains per-difficulty counts on failure', () => {
  const pool = makePool({ easy: 4, medium: 8, hard: 3 });
  const result = validateQuestionPool(pool, 10);

  assert(result.valid === false, 'pool 4/8/3 fails N=10');
  assert(typeof result.message === 'string' && result.message.length > 0,
    'failure message is a non-empty string');
  assert(result.message.includes('Easy'), `message mentions 'Easy' (got: ${result.message})`);
  assert(result.message.includes('Hard'),  `message mentions 'Hard'`);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
}
