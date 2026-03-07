export const MAX_MESSAGE_CHARS = 700;

export function clamp(value) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function progress(current, goal) {
  if (!goal) return 0;
  return Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
}

function pressurePoints(context) {
  const points = [
    { key: "hydration", deficit: 100 - progress(context.waterLitres, context.waterGoal) },
    { key: "movement", deficit: 100 - progress(context.steps, context.stepGoal) },
    { key: "fuel", deficit: 100 - progress(context.calories, context.calorieGoal) },
    { key: "habits", deficit: 100 - clamp(context.habitsRate) },
    { key: "tasks", deficit: Math.min(100, ((context.openTasks || 0) / Math.max(1, (context.totalTasks || 1))) * 100) },
  ];

  if (context.sleepHours && context.sleepHours < 6.5) {
    points.push({ key: "sleep", deficit: Math.round((6.5 - context.sleepHours) * 18) });
  }

  return points.sort((a, b) => b.deficit - a.deficit);
}

const foodDb = {
  chicken: { calories: 220, protein: 34, carbs: 0, fat: 8 },
  rice: { calories: 205, protein: 4, carbs: 45, fat: 1 },
  plantain: { calories: 180, protein: 2, carbs: 47, fat: 0.5 },
  wrap: { calories: 210, protein: 6, carbs: 36, fat: 5 },
  coffee: { calories: 5, protein: 0, carbs: 0, fat: 0 },
  iced: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  coke: { calories: 140, protein: 0, carbs: 39, fat: 0 },
  yogurt: { calories: 150, protein: 15, carbs: 12, fat: 4 },
  banana: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  toast: { calories: 95, protein: 3, carbs: 17, fat: 1.2 },
  eggs: { calories: 140, protein: 12, carbs: 1, fat: 10 },
  tea: { calories: 2, protein: 0, carbs: 0, fat: 0 },
  spice: { calories: 380, protein: 12, carbs: 42, fat: 18 },
  bag: { calories: 220, protein: 6, carbs: 28, fat: 9 },
  protein: { calories: 120, protein: 24, carbs: 3, fat: 2 },
};

export function estimateMealFromText(text = "") {
  const input = text.toLowerCase();
  const tokens = input
    .split(/[^a-zA-Z]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const matchedFoods = [];

  tokens.forEach((token) => {
    const match = foodDb[token];
    if (match) {
      matchedFoods.push(token);
      totals = {
        calories: totals.calories + match.calories,
        protein: totals.protein + match.protein,
        carbs: totals.carbs + match.carbs,
        fat: totals.fat + match.fat,
      };
    }
  });

  if (!matchedFoods.length) {
    totals = { calories: 380, protein: 18, carbs: 35, fat: 14 };
  }

  return {
    matchedFoods: matchedFoods.length ? Array.from(new Set(matchedFoods)) : ["mixed meal"],
    totals: {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
    },
    note: "Approximate nutrition estimate from your description.",
  };
}

export function rewriteTaskText(text = "") {
  const trimmed = String(text).trim();
  if (!trimmed) {
    return {
      title: "Task support needed",
      category: "General",
      durationMin: 60,
      urgency: "Medium",
      description: "I need support with a practical task and can share details after matching.",
    };
  }

  const normalized = trimmed.replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();

  const category = lower.includes("shop") || lower.includes("pharmacy") ? "Errands" : lower.includes("move") ? "Moving" : "General";
  const urgency = lower.includes("today") || lower.includes("urgent") ? "High" : lower.includes("tomorrow") ? "Medium" : "Low";
  const durationMin = lower.includes("quick") ? 30 : lower.includes("hour") ? 60 : 45;

  const title = normalized.length > 44 ? `${normalized.slice(0, 41)}...` : normalized;
  const description = `I need help with: ${normalized}. Expected duration is around ${durationMin} minutes. Please message to confirm availability.`;

  return { title, category, durationMin, urgency, description };
}

export function buildResetPlan(type = "day", context = {}) {
  const points = pressurePoints(context);
  const top = points.slice(0, 2).map((p) => p.key);

  if (type === "week") {
    return {
      headline: "Weekly reset prepared.",
      summary: `This week slipped most on ${top.join(" and ") || "consistency"}.`,
      actions: [
        "Set 3 non-negotiables for next week: hydration, one movement block, one key task.",
        "Front-load one easy win each morning to rebuild momentum.",
        "Review your week on Sunday and pre-plan meals + top tasks.",
      ],
      encouragement: "Progress comes from steady systems, not perfect days.",
    };
  }

  return {
    headline: "Day reset ready.",
    summary: `Top pressure points right now: ${top.join(" and ") || "general overload"}.`,
    actions: [
      "Complete one quick task within 20 minutes.",
      "Log your next meal and drink water now.",
      "Take a 10-minute walk to clear mental load.",
    ],
    encouragement: "A small reset now will make tonight feel much lighter.",
  };
}

export function buildReflection(message, context = {}) {
  const points = pressurePoints(context);
  const top = points.slice(0, 3).map((p) => p.key);
  return {
    headline: "It sounds like things feel heavy right now.",
    reflection: `You are likely carrying pressure around ${top.join(", ") || "a few competing priorities"}.`,
    nextSteps: [
      "Pick one easy task and close it before starting anything else.",
      "Do one health anchor now: water + a simple meal log.",
      "Set a 25-minute focus block and ignore non-urgent noise.",
    ],
    closing: "You don’t need to fix everything at once — just create traction.",
  };
}

export function respondWithSyra({ message, context = {}, mode = "general" }) {
  const text = String(message || "").toLowerCase();

  if (mode === "meal" || text.includes("describe meal") || text.includes("meal")) {
    return { kind: "meal", ...estimateMealFromText(message) };
  }

  if (mode === "task_rewrite" || text.includes("improve my task") || text.includes("rewrite task")) {
    return { kind: "task", task: rewriteTaskText(message) };
  }

  if (mode === "reset_day" || text.includes("reset my day")) {
    return { kind: "reset", period: "day", ...buildResetPlan("day", context) };
  }

  if (mode === "reset_week" || text.includes("reset my week")) {
    return { kind: "reset", period: "week", ...buildResetPlan("week", context) };
  }

  if (mode === "reflect" || text.includes("overwhelmed") || text.includes("behind") || text.includes("bad week")) {
    return { kind: "reflection", ...buildReflection(message, context) };
  }

  const points = pressurePoints(context);
  return {
    kind: "general",
    headline: "Here’s your grounded focus snapshot.",
    focusAreas: points.slice(0, 3).map((p) => p.key),
    nextSteps: [
      "Complete one practical task from your open list.",
      "Close your hydration gap and log your next meal.",
      "Finish with a short movement block before evening.",
    ],
    prompt: "Ask me for: Describe meal, Improve task, Reset day, or Reset week.",
  };
}
