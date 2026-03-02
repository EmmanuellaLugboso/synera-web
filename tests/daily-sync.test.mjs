import test from "node:test";
import assert from "node:assert/strict";

const {
  buildMindSleepDailyPayload,
  buildLifestyleDailyPayload,
} = await import("../app/services/dailySync.js");

test("buildMindSleepDailyPayload aggregates today mood and sleep", () => {
  const payload = buildMindSleepDailyPayload({
    date: "2026-01-10",
    mindLogs: [
      { date: "2026-01-10", mood: 6, stress: 4, note: "morning" },
      { date: "2026-01-10", mood: 8, stress: 2, note: "evening" },
      { date: "2026-01-09", mood: 1, stress: 9 },
    ],
    sleepLogs: [
      { date: "2026-01-10", durationMins: 420, quality: 4, bedTime: "23:15" },
      { date: "2026-01-10", durationMins: 480, quality: 5, bedTime: "23:05" },
    ],
  });

  assert.equal(payload.mood.rating, 7);
  assert.equal(payload.mood.stress, 3);
  assert.equal(payload.mood.note, "evening");
  assert.equal(payload.sleep.hours, 7.5);
  assert.equal(payload.sleep.quality, 4.5);
  assert.equal(payload.sleep.bedtime, "23:05");
});

test("buildLifestyleDailyPayload maps habits and discipline to daily shape", () => {
  const payload = buildLifestyleDailyPayload({
    date: "2026-01-10",
    habits: [{ id: "h1" }, { id: "h2" }, { id: "h3" }],
    habitLogs: [
      { dateISO: "2026-01-10", habitId: "h1", value: 1 },
      { dateISO: "2026-01-10", habitId: "h1", value: 1 },
      { dateISO: "2026-01-10", habitId: "h2", value: 1 },
    ],
    disciplineDays: [{ dateISO: "2026-01-10", studyMin: 75, phoneMin: 140 }],
  });

  assert.equal(payload.habits.completed, 2);
  assert.equal(payload.habits.total, 3);
  assert.equal(payload.lifestyle.focusMinutes, 75);
  assert.equal(payload.lifestyle.screenTimeMinutes, 140);
});
