import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorkoutPlan, parseGeneratorPrompt } from '../app/hubs/fitness/workoutGenerator.js';

test('generator creates glute-priority 4-day split', () => {
  const plan = generateWorkoutPlan({
    planName: 'Test Plan',
    primaryGoals: ['build bigger glutes overall'],
    avoid: [],
    trainingDays: 4,
    level: 'beginner',
    equipmentAccess: 'home',
    sessionStructure: { sessionMinutes: 45, exercisesPerDay: 4 },
  });

  assert.equal(plan.days.length, 4);
  assert.match(plan.summary, /glute-priority/);
  assert.ok(plan.days.some((day) => day.focus.includes('Glute')));
});

test('generator avoids width-dominant back exercise when requested', () => {
  const plan = generateWorkoutPlan({
    planName: 'Back Plan',
    primaryGoals: ['strengthen back without emphasizing a wider back look'],
    avoid: ['avoid wider back appearance'],
    trainingDays: 3,
    level: 'beginner',
    equipmentAccess: 'gym',
    sessionStructure: { sessionMinutes: 50, exercisesPerDay: 5 },
  });

  const names = plan.days.flatMap((day) => day.exercises.map((ex) => ex.name));
  assert.equal(names.includes('Wide-Grip Lat Pulldown'), false);
});


test('chat prompt parser extracts nuanced goals and avoids', () => {
  const parsed = parseGeneratorPrompt(
    'I want a nice narrow back with definition, bigger thighs and glutes but not too muscular thighs. Beginner, home, 4 days a week.',
    { sessionStructure: { sessionMinutes: 50, exercisesPerDay: 4 } },
  );

  assert.ok(parsed.planInput.primaryGoals.includes('build bigger glutes overall'));
  assert.ok(parsed.planInput.primaryGoals.includes('improve back definition'));
  assert.ok(parsed.planInput.primaryGoals.includes('strengthen back without emphasizing a wider back look'));
  assert.ok(parsed.planInput.avoid.includes('avoid wider back appearance'));
  assert.ok(parsed.planInput.avoid.includes('avoid too much quad growth'));
  assert.equal(parsed.planInput.trainingDays, 4);
  assert.equal(parsed.planInput.equipmentAccess, 'home');
});
