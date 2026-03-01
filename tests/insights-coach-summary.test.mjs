import test from "node:test";
import assert from "node:assert/strict";

const {
  normalizeDailyTimeline,
  buildPillarAnalytics,
  buildCoachSummary,
} = await import("../app/insights/analytics.js");

function buildWeek(makeDay) {
  const now = new Date("2026-03-07T12:00:00Z");
  const rows = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    rows.push({ dateISO: d.toISOString().split("T")[0], ...makeDay(i) });
  }
  return rows;
}

function runSummary(rows) {
  const goals = { calorieGoal: 1800, stepGoal: 8000, waterGoal: 3, proteinGoal: 120 };
  const days = normalizeDailyTimeline(rows, 7);
  const pillars = buildPillarAnalytics(days, goals);
  return { days, pillars, summary: buildCoachSummary(pillars, days, goals) };
}

test("scenario A remains sensible", () => {
  const rows = buildWeek((i) => ({
    steps: 4200 + i * 700,
    calories: 1500 + (i % 3) * 220,
    waterMl: 1200 + i * 180,
    workouts: i % 2,
    cardioMinutes: i % 2 ? 25 : 10,
    macros: { proteinG: 90 + i * 5, carbsG: 170 + i * 8, fatG: 50 + i * 2 },
    sleep: { hours: 5.8 + i * 0.2, quality: 2 + (i % 3), bedtime: i % 2 ? "23:50" : "00:25" },
    mood: { rating: 2 + (i % 3), stress: 4 - (i % 3), note: "" },
    habits: { completed: 1 + (i % 4), total: 5 },
    lifestyle: { focusMinutes: 25 + i * 8, screenTimeMinutes: 230 - i * 12 },
  }));

  const { summary } = runSummary(rows);
  assert.ok(["Move", "Habits", "Mood", "Fuel", "Recover"].includes(summary.topLever));
  assert.ok(Array.isArray(summary.microPlan));
  assert.ok(summary.microPlan.length <= 3);
});

test("scenario B picks Fuel/Recover and not Move", () => {
  const rows = buildWeek((i) => ({
    steps: 11000 + i * 300,
    calories: 2400 - (i % 2) * 250,
    waterMl: 700 + i * 60,
    workouts: 1,
    cardioMinutes: 35,
    macros: { proteinG: 70 + i * 2, carbsG: 280 + i * 6, fatG: 95 + i * 3 },
    sleep: { hours: 5.2 + i * 0.05, quality: 2, bedtime: i % 2 ? "01:20" : "23:40" },
    mood: { rating: 3, stress: 3, note: "" },
    habits: { completed: 4, total: 5 },
    lifestyle: { focusMinutes: 90, screenTimeMinutes: 210 },
  }));

  const { pillars, summary } = runSummary(rows);
  assert.equal(Math.round(pillars.move.weeklyAvg), 100);
  assert.ok(["Fuel", "Recover"].includes(summary.topLever));
  assert.notEqual(summary.topLever, "Move");
  assert.ok(summary.risks.some((x) => /Hydration/i.test(x)));
  assert.ok(summary.risks.some((x) => /Sleep|recovery/i.test(x)));
});

test("if Move is 100 and Fuel < 70, top lever cannot be Move", () => {
  const rows = buildWeek(() => ({
    steps: 12000,
    calories: 2600,
    waterMl: 900,
    workouts: 1,
    cardioMinutes: 30,
    macros: { proteinG: 60, carbsG: 300, fatG: 100 },
    sleep: { hours: 6, quality: 2, bedtime: "00:55" },
    mood: { rating: 3, stress: 3, note: "" },
    habits: { completed: 4, total: 5 },
    lifestyle: { focusMinutes: 80, screenTimeMinutes: 220 },
  }));

  const { pillars, summary } = runSummary(rows);
  assert.equal(Math.round(pillars.move.weeklyAvg), 100);
  assert.ok((pillars.fuel.weeklyAvg || 0) < 70);
  assert.notEqual(summary.topLever, "Move");
});

test("all pillars strong can still return deterministic lever", () => {
  const rows = buildWeek(() => ({
    steps: 10000,
    calories: 1800,
    waterMl: 3000,
    workouts: 1,
    cardioMinutes: 30,
    macros: { proteinG: 120, carbsG: 200, fatG: 60 },
    sleep: { hours: 8, quality: 5, bedtime: "23:00" },
    mood: { rating: 5, stress: 1, note: "" },
    habits: { completed: 5, total: 5 },
    lifestyle: { focusMinutes: 120, screenTimeMinutes: 90 },
  }));

  const first = runSummary(rows).summary;
  const second = runSummary(rows).summary;
  assert.equal(first.topLever, second.topLever);
  assert.equal(first.headline, second.headline);
});
