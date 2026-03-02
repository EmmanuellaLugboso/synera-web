import test from 'node:test';
import assert from 'node:assert/strict';

const mod = await import('../app/api/coach/logic.js');
const {
  clamp,
  progress,
  topPriorities,
  generatePlan,
  validateMessage,
  MAX_MESSAGE_CHARS,
  isRateLimited,
  __resetRateLimitForTests,
} = mod;

test('clamp and progress enforce boundaries', () => {
  assert.equal(clamp(-5), 0);
  assert.equal(clamp('x'), 0);
  assert.equal(progress(120, 100), 100);
  assert.equal(progress(10, 0), 0);
});

test('topPriorities returns top two deficits', () => {
  const out = topPriorities({
    waterLitres: 0,
    waterGoal: 3,
    steps: 10000,
    stepGoal: 10000,
    calories: 1200,
    calorieGoal: 2000,
    habitsRate: 50,
    sleepHours: 5.5,
    moodRating: 3,
  });

  assert.equal(out.length, 2);
  assert.equal(out[0].key, 'hydration');
});

test('generatePlan selects keyword path', () => {
  const plan = generatePlan('I am tired today', { name: 'Sam' });
  assert.equal(plan.focus, 'energy reset');
  assert.equal(plan.checkInMin, 25);
  assert.equal(plan.plan.length, 3);
});

test('validateMessage rejects too-long message', () => {
  const error = validateMessage('a'.repeat(MAX_MESSAGE_CHARS + 1));
  assert.match(error, /too long/i);
});

test('isRateLimited blocks after threshold', () => {
  __resetRateLimitForTests();

  const makeReq = () =>
    new Request('http://localhost/api/coach', {
      headers: { 'x-forwarded-for': '2.2.2.2' },
    });

  for (let i = 0; i < 25; i += 1) {
    assert.equal(isRateLimited(makeReq()), false);
  }

  assert.equal(isRateLimited(makeReq()), true);
});
