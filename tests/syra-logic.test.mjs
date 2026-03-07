import test from "node:test";
import assert from "node:assert/strict";

const mod = await import("../app/api/syra/logic.js");
const { estimateMealFromText, rewriteTaskText, buildResetPlan, buildReflection, respondWithSyra } = mod;

test("estimateMealFromText returns structured estimate labels", () => {
  const out = estimateMealFromText("chicken wrap and iced coffee");
  assert.equal(Array.isArray(out.items), true);
  assert.ok(out.items.some((item) => item.name === "Chicken wrap"));
  assert.ok(out.totals.calories > 0);
  assert.match(out.note, /estimate/i);
});

test("rewriteTaskText supports clearer rewrite modes", () => {
  const improved = rewriteTaskText("need help moving some stuff tomorrow", "improve");
  const shorter = rewriteTaskText("need help moving some stuff tomorrow", "shorten");
  assert.equal(improved.category, "Moving");
  assert.ok(improved.description.length > shorter.description.length);
});

test("buildResetPlan day and week return practical actions", () => {
  const context = { openTasks: 4, totalTasks: 5, waterLitres: 0.7, waterGoal: 3, steps: 2000, stepGoal: 8000 };
  const day = buildResetPlan("day", context);
  const week = buildResetPlan("week", context);
  assert.equal(day.actions.length, 3);
  assert.equal(week.actions.length, 3);
  assert.match(day.headline, /day reset/i);
  assert.match(week.headline, /weekly reset/i);
});

test("buildReflection returns short, structured guidance", () => {
  const reflection = buildReflection("I feel overwhelmed", { openTasks: 5, totalTasks: 6, waterLitres: 1, waterGoal: 3 });
  assert.ok(reflection.nextSteps.length >= 2);
  assert.match(reflection.headline, /piled up/i);
});

test("respondWithSyra routes by mode", () => {
  const meal = respondWithSyra({ message: "toast eggs and tea", mode: "meal" });
  const task = respondWithSyra({ message: "need help moving some stuff", mode: "task_rewrite" });
  const reset = respondWithSyra({ message: "reset", mode: "reset_day", context: { openTasks: 3, totalTasks: 3 } });

  assert.equal(meal.kind, "meal");
  assert.equal(task.kind, "task");
  assert.equal(reset.kind, "reset");
});
