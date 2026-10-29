/**
 * Unit tests for poolRules helper
 * 
 * Verifies:
 * - N = 10 gives 6/6/6
 * - N = 15 gives 9/9/9
 * - N = 1 gives 1/1/1
 * - N = 0 is rejected
 * - validateQuestionPool correctly flags deficits
 */

const assert = require('assert');
const {
    getRequiredPerDifficulty,
    countQuestionsByDifficulty,
    validateQuestionPool
} = require('../app/Backend/services/poolRules');

console.log('--- Running Pool Rules Unit Tests ---');

// Test 1: N = 10 -> 6/6/6 (totalRequired: 18)
const req10 = getRequiredPerDifficulty(10);
assert.strictEqual(req10.easy, 6, 'N=10 easy must be 6');
assert.strictEqual(req10.medium, 6, 'N=10 medium must be 6');
assert.strictEqual(req10.hard, 6, 'N=10 hard must be 6');
assert.strictEqual(req10.totalRequired, 18, 'N=10 totalRequired must be 18');
console.log('✅ PASS: N = 10 gives 6/6/6');

// Test 2: N = 15 -> 9/9/9 (totalRequired: 27)
const req15 = getRequiredPerDifficulty(15);
assert.strictEqual(req15.easy, 9, 'N=15 easy must be 9');
assert.strictEqual(req15.medium, 9, 'N=15 medium must be 9');
assert.strictEqual(req15.hard, 9, 'N=15 hard must be 9');
assert.strictEqual(req15.totalRequired, 27, 'N=15 totalRequired must be 27');
console.log('✅ PASS: N = 15 gives 9/9/9');

// Test 3: N = 1 -> 1/1/1 (totalRequired: 3)
const req1 = getRequiredPerDifficulty(1);
assert.strictEqual(req1.easy, 1, 'N=1 easy must be 1');
assert.strictEqual(req1.medium, 1, 'N=1 medium must be 1');
assert.strictEqual(req1.hard, 1, 'N=1 hard must be 1');
assert.strictEqual(req1.totalRequired, 3, 'N=1 totalRequired must be 3');
console.log('✅ PASS: N = 1 gives 1/1/1');

// Test 4: N = 0 is rejected
let rejectedZero = false;
try {
    getRequiredPerDifficulty(0);
} catch (e) {
    rejectedZero = true;
}
assert.strictEqual(rejectedZero, true, 'N=0 must be rejected');
console.log('✅ PASS: N = 0 is rejected');

// Test 5: Negative tests with question pool
// 5 easy, 8 medium, 6 hard for N = 10 -> Easy shortfall by 1
const mockPoolShort = [
    ...Array(5).fill({ difficulty: 'easy' }),
    ...Array(8).fill({ difficulty: 'medium' }),
    ...Array(6).fill({ difficulty: 'hard' })
];
const validationShort = validateQuestionPool(mockPoolShort, 10);
assert.strictEqual(validationShort.valid, false, 'Pool with 5 easy should fail validation for N=10');
assert.strictEqual(validationShort.deficits.easy, 1, 'Easy deficit must be 1');
assert.strictEqual(validationShort.deficits.medium, 0, 'Medium deficit must be 0');
assert.strictEqual(validationShort.deficits.hard, 0, 'Hard deficit must be 0');
console.log('✅ PASS: Pool with 5 easy / 8 med / 6 hard rejected for N=10 (shortfall detected)');

// Test 6: Satisfied pool: 6 easy, 6 medium, 6 hard for N = 10 -> valid
const mockPoolValid = [
    ...Array(6).fill({ difficulty: 'easy' }),
    ...Array(6).fill({ difficulty: 'medium' }),
    ...Array(6).fill({ difficulty: 'hard' })
];
const validationValid = validateQuestionPool(mockPoolValid, 10);
assert.strictEqual(validationValid.valid, true, 'Pool with 6/6/6 must pass for N=10');
console.log('✅ PASS: Pool with 6 easy / 6 med / 6 hard passes for N=10');

console.log('🎉 ALL UNIT TESTS PASSED!');
