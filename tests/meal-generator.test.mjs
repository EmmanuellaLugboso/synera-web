import test from 'node:test';
import assert from 'node:assert/strict';

import { buildMealGeneratorInput, generateMealPlan } from '../app/hubs/nutrition/mealGenerator.js';

test('meal generator uses profile defaults', () => {
  const input = buildMealGeneratorInput({
    calorieGoal: 2100,
    macroGoals: { proteinG: 145 },
    eatingStyle: 'Mediterranean',
    foodGoals: ['muscle gain'],
    allergies: ['fish'],
    mealFrequency: '5',
  });

  assert.equal(input.calorieTarget, 2100);
  assert.equal(input.proteinTarget, 145);
  assert.equal(input.eatingStyle, 'Mediterranean');
  assert.equal(input.primaryGoal, 'muscle gain');
  assert.equal(input.mealsPerDay, 5);
});

test('meal generator creates realistic meal plan and honors allergy filters', () => {
  const plan = generateMealPlan({
    planName: 'Test Plan',
    primaryGoal: 'fat loss',
    calorieTarget: 1800,
    proteinTarget: 130,
    eatingStyle: 'balanced',
    allergies: ['fish'],
    avoidFoods: ['shrimp'],
    mealsPerDay: 4,
    snackPreference: 'balanced',
    cookingEffort: 'low',
    budgetLevel: 'budget',
    mealVibe: 'quick and easy',
    varietyMode: 'balanced',
  });

  assert.ok(plan.meals.length >= 4);
  assert.ok(plan.totals.protein > 80);
  assert.ok(plan.summary.includes('fat loss'));
  assert.equal(plan.meals.some((m) => /shrimp|salmon/i.test(m.name)), false);
});
