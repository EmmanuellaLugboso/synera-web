import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorkoutPlan, interpretChatAdjustment, parseGeneratorPrompt } from '../app/hubs/fitness/workoutGenerator.js';

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


test('chat parser asks follow-up questions when key constraints are missing', () => {
  const parsed = parseGeneratorPrompt('I want big glutes and a nice back', {});

  assert.equal(parsed.interpretation.readyToGenerate, false);
  assert.ok(parsed.interpretation.followUps.length > 0);
});

test('glute-focused plan includes glute medius work and avoids repeating same lifts every day', () => {
  const plan = generateWorkoutPlan({
    planName: 'Glute Structure',
    primaryGoals: ['build bigger glutes overall'],
    avoid: ['avoid wider back appearance'],
    trainingDays: 4,
    level: 'beginner',
    equipmentAccess: 'home',
    sessionStructure: { sessionMinutes: 45, exercisesPerDay: 4 },
  });

  const lowerDays = plan.days.filter((day) => day.focus.includes('Glute') || day.focus.includes('Lower'));
  assert.ok(lowerDays.every((day) => day.exercises.some((exercise) => String(exercise.targets || '').includes('glute medius') || exercise.name.includes('Lateral Walk'))));

  const daySets = plan.days.map((day) => new Set(day.exercises.map((exercise) => exercise.name)));
  for (let i = 1; i < daySets.length; i += 1) {
    const overlap = [...daySets[i]].filter((name) => daySets[i - 1].has(name));
    assert.ok(overlap.length < daySets[i].size);
  }
});


test('chat parser does not re-ask logistics when already known', () => {
  const parsed = parseGeneratorPrompt('I want bigger glutes with low quad bias', {
    trainingDays: 4,
    level: 'beginner',
    equipmentAccess: 'home',
    sessionStructure: { sessionMinutes: 45, exercisesPerDay: 4 },
  });

  assert.equal(parsed.interpretation.followUps.some((q) => q.includes('days per week')), false);
  assert.equal(parsed.interpretation.followUps.some((q) => q.includes('experience level')), false);
  assert.equal(parsed.interpretation.followUps.some((q) => q.includes('train at home')), false);
});

test('chat adjustments update plan preferences from plain-language requests', () => {
  const adjusted = interpretChatAdjustment('remove lunges and make workouts shorter, I only have dumbbells', {
    primaryGoals: ['build bigger glutes overall'],
    avoid: [],
    equipmentAccess: 'gym',
    sessionStructure: { sessionMinutes: 50, exercisesPerDay: 4 },
  });

  assert.equal(adjusted.changed, true);
  assert.ok(adjusted.planInput.avoid.includes('avoid lunges'));
  assert.equal(adjusted.planInput.sessionStructure.sessionMinutes <= 40, true);
  assert.equal(adjusted.planInput.equipmentAccess, 'home');
});
