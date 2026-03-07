import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateMealFromText,
  rewriteTaskText,
  buildResetPlan,
  buildReflection,
  respondWithSyra,
} from '../app/api/syra/logic.js';

test('estimateMealFromText returns structured estimated meal details', () => {
  const meal = estimateMealFromText('chicken wrap and iced coffee');
  assert.ok(Array.isArray(meal.items));
  assert.ok(meal.items.length >= 2);
  assert.equal(meal.note.includes('estimates'), true);
  assert.ok(meal.totals.calories > 0);
});

test('rewriteTaskText supports clarify style', () => {
  const task = rewriteTaskText('need help moving some stuff tomorrow', 'clarify');
  assert.equal(task.category, 'Moving');
  assert.equal(task.urgency, 'Medium');
  assert.equal(task.style, 'clarify');
});

test('buildResetPlan day and week include required sections', () => {
  const ctx = { waterLitres: 1, waterGoal: 2, openTasks: 5, totalTasks: 8 };
  const day = buildResetPlan('day', ctx);
  const week = buildResetPlan('week', ctx);
  assert.ok(day.topPriorityTask);
  assert.ok(day.wellnessAction);
  assert.ok(week.summary);
  assert.equal(Array.isArray(week.actions), true);
});

test('buildReflection is calm and actionable', () => {
  const reflection = buildReflection('i feel behind', { openTasks: 3, totalTasks: 4 });
  assert.equal(Array.isArray(reflection.nextSteps), true);
  assert.equal(reflection.nextSteps.length, 3);
});

test('respondWithSyra routes by mode', () => {
  assert.equal(respondWithSyra({ message: 'toast eggs and tea', mode: 'meal' }).kind, 'meal');
  assert.equal(respondWithSyra({ message: 'reset', mode: 'reset_day' }).period, 'day');
  assert.equal(respondWithSyra({ message: 'overwhelmed', mode: 'reflect' }).kind, 'reflection');
});
