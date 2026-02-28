import test from 'node:test';
import assert from 'node:assert/strict';

const { normalizeOnboardingData, mergeOnboardingData } = await import('../app/context/onboardingData.js');

test('normalizeOnboardingData maps legacy protein goal and water fields', () => {
  const out = normalizeOnboardingData({
    proteinGoalG: 130,
    waterGoal: '3.5L',
    waterIntake: '2.1L',
  });

  assert.equal(out.macroGoals.proteinG, 130);
  assert.equal(out.waterGoalLitres, 3.5);
  assert.equal(out.waterLitres, 2.1);
});

test('mergeOnboardingData deep merges macroGoals', () => {
  const base = { macroGoals: { proteinG: 120, carbsG: 200, fatG: 60 }, x: 1 };
  const incoming = { macroGoals: { proteinG: 140 }, y: 2 };

  const out = mergeOnboardingData(base, incoming);

  assert.deepEqual(out.macroGoals, { proteinG: 140, carbsG: 200, fatG: 60 });
  assert.equal(out.x, 1);
  assert.equal(out.y, 2);
});
