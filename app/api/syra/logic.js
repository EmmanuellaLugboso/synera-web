import { clampNumber, progressPercent } from "../../utils/helpers.js";

export const MAX_MESSAGE_CHARS = 700;

export const clamp = clampNumber;
const progress = progressPercent;

function titleCase(value = "") {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function pressurePoints(context) {
  const points = [
    { key: "hydration", deficit: 100 - progress(context.waterLitres, context.waterGoal) },
    { key: "movement", deficit: 100 - progress(context.steps, context.stepGoal) },
    { key: "nutrition", deficit: 100 - progress(context.calories, context.calorieGoal) },
    { key: "habits", deficit: 100 - clamp(context.habitsRate) },
    { key: "tasks", deficit: Math.min(100, ((context.openTasks || 0) / Math.max(1, context.totalTasks || 1)) * 100) },
  ];

  if (context.sleepHours && context.sleepHours < 6.5) {
    points.push({ key: "sleep", deficit: Math.round((6.5 - context.sleepHours) * 18) });
  }

  return points
    .filter((point) => point.deficit > 8)
    .sort((a, b) => b.deficit - a.deficit);
}

const foodDb = {
  chicken: { calories: 210, protein: 32, carbs: 0, fat: 7, label: "Chicken" },
  wrap: { calories: 220, protein: 6, carbs: 38, fat: 6, label: "Wrap" },
  rice: { calories: 205, protein: 4, carbs: 45, fat: 1, label: "Rice" },
  plantain: { calories: 180, protein: 2, carbs: 47, fat: 1, label: "Plantain" },
  coffee: { calories: 5, protein: 0, carbs: 0, fat: 0, label: "Coffee" },
  iced: { calories: 0, protein: 0, carbs: 0, fat: 0, label: "Iced" },
  tea: { calories: 2, protein: 0, carbs: 0, fat: 0, label: "Tea" },
  toast: { calories: 95, protein: 3, carbs: 17, fat: 1, label: "Toast" },
  eggs: { calories: 140, protein: 12, carbs: 1, fat: 10, label: "Eggs" },
  yogurt: { calories: 150, protein: 14, carbs: 12, fat: 4, label: "Yogurt" },
  banana: { calories: 105, protein: 1, carbs: 27, fat: 0, label: "Banana" },
  salmon: { calories: 240, protein: 26, carbs: 0, fat: 14, label: "Salmon" },
  oats: { calories: 150, protein: 5, carbs: 27, fat: 3, label: "Oats" },
  avocado: { calories: 160, protein: 2, carbs: 9, fat: 15, label: "Avocado" },
  smoothie: { calories: 220, protein: 18, carbs: 24, fat: 6, label: "Protein smoothie" },
};

const comboDb = [
  {
    match: ["iced", "coffee"],
    label: "Iced coffee",
    calories: 120,
    protein: 2,
    carbs: 18,
    fat: 4,
    consumeTokens: ["iced", "coffee"],
  },
  {
    match: ["chicken", "wrap"],
    label: "Chicken wrap",
    calories: 430,
    protein: 28,
    carbs: 38,
    fat: 14,
    consumeTokens: ["chicken", "wrap"],
  },
  {
    match: ["toast", "eggs"],
    label: "Toast and eggs",
    calories: 295,
    protein: 15,
    carbs: 18,
    fat: 11,
    consumeTokens: ["toast", "eggs"],
  },
  {
    match: ["rice", "chicken", "plantain"],
    label: "Rice, chicken, and plantain",
    calories: 595,
    protein: 38,
    carbs: 92,
    fat: 9,
    consumeTokens: ["rice", "chicken", "plantain"],
  },
];

function addMacros(totals, item) {
  return {
    calories: totals.calories + item.calories,
    protein: totals.protein + item.protein,
    carbs: totals.carbs + item.carbs,
    fat: totals.fat + item.fat,
  };
}

export function estimateMealFromText(text = "") {
  const input = text.toLowerCase();
  const tokens = input
    .split(/[^a-zA-Z]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  const tokenSet = new Set(tokens);
  const consumed = new Set();
  const items = [];

  comboDb.forEach((combo) => {
    if (combo.match.every((token) => tokenSet.has(token))) {
      items.push({
        name: combo.label,
        calories: combo.calories,
        protein: combo.protein,
        carbs: combo.carbs,
        fat: combo.fat,
      });
      combo.consumeTokens.forEach((token) => consumed.add(token));
    }
  });

  tokens.forEach((token) => {
    if (consumed.has(token)) return;
    const match = foodDb[token];
    if (!match) return;
    items.push({
      name: match.label || titleCase(token),
      calories: match.calories,
      protein: match.protein,
      carbs: match.carbs,
      fat: match.fat,
    });
  });

  if (!items.length) {
    items.push({ name: "Mixed meal", calories: 420, protein: 20, carbs: 42, fat: 16 });
  }

  const totals = items.reduce(
    (acc, item) => addMacros(acc, item),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    items: items.map((item) => ({
      ...item,
      calories: Math.round(item.calories),
      protein: Math.round(item.protein),
      carbs: Math.round(item.carbs),
      fat: Math.round(item.fat),
    })),
    totals: {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
    },
    note: "Nutrition values are estimates based on your description.",
  };
}

export function rewriteTaskText(text = "", mode = "improve") {
  const trimmed = String(text).trim();
  if (!trimmed) {
    return {
      title: "Task support needed",
      category: "General",
      durationMin: 45,
      description: "I need support with a practical task and can share details after matching.",
      improvements: ["Clear ask", "Simple scope", "Expected timing"],
    };
  }

  const normalized = trimmed.replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();

  const category =
    lower.includes("move") || lower.includes("moving")
      ? "Moving"
      : lower.includes("shop") || lower.includes("store") || lower.includes("pharmacy")
        ? "Errands"
        : lower.includes("clean")
          ? "Home"
          : "General";

  const durationMin = lower.includes("quick") ? 25 : lower.includes("hour") ? 60 : 45;
  const actionTitle =
    category === "Moving"
      ? "Help moving household items"
      : category === "Errands"
        ? "Help with local errands"
        : "Task support request";

  const baseDescription = `I need help with ${normalized}. This task should take around ${durationMin} minutes.`;

  if (mode === "shorten") {
    return {
      title: actionTitle,
      category,
      durationMin,
      description: `${normalized.slice(0, 110)}${normalized.length > 110 ? "…" : ""}`,
      improvements: ["Shortened wording"],
    };
  }

  if (mode === "organize") {
    return {
      title: actionTitle,
      category,
      durationMin,
      description: `${baseDescription} Preferred timing: ${lower.includes("tomorrow") ? "tomorrow" : "flexible"}. Notes: light to moderate effort.`,
      improvements: ["Structured details", "Timing clarified", "Effort expectation"],
    };
  }

  if (mode === "clearer") {
    return {
      title: actionTitle,
      category,
      durationMin,
      description: `${baseDescription} Please message first so we can confirm details and arrival time.`,
      improvements: ["Improved clarity", "Direct request", "Next step included"],
    };
  }

  return {
    title: actionTitle,
    category,
    durationMin,
    description: `${baseDescription} It does not involve heavy lifting. Please message to confirm availability.`,
    improvements: ["Cleaner title", "Defined scope", "Estimated duration"],
  };
}

export function buildResetPlan(type = "day", context = {}) {
  const points = pressurePoints(context);
  const top = points[0]?.key || "consistency";

  if (type === "week") {
    const secondary = points[1]?.key || "planning";
    return {
      headline: "Here’s your weekly reset.",
      summary: `The biggest area slipping is ${top}, while your steadier area was tasks earlier in the week.`,
      actions: [
        "Log breakfast each morning to stabilize nutrition.",
        "Complete one priority task before lunch on weekdays.",
        "Add one short walk on your two busiest days.",
      ],
      encouragement: `You can recover momentum next week with a lighter, repeatable plan around ${secondary}.`,
    };
  }

  return {
    headline: "Here’s your day reset.",
    summary: `Your clearest priority right now is ${top}.`,
    actions: [
      "Top priority task: close one open task in the next 30 minutes.",
      "Wellness action: drink a full glass of water now.",
      "Nutrition action: log your next meal with a simple estimate.",
    ],
    encouragement: "Small, focused actions will make this day feel manageable again.",
  };
}

export function buildReflection(_message, context = {}) {
  const points = pressurePoints(context);
  const top = points.slice(0, 2).map((p) => p.key);
  return {
    headline: "It sounds like things feel piled up right now.",
    reflection: `From your recent patterns, the clearest gaps are ${top.join(" and ") || "task load and consistency"}.`,
    nextSteps: [
      "Log one meal so nutrition is no longer hanging over you.",
      "Complete one easy task to create immediate traction.",
      "Take 3 slow breaths, then start one 20-minute focus block.",
    ],
    closing: "You do not need to solve everything today — just steady the next hour.",
  };
}

export function respondWithSyra({ message, context = {}, mode = "general" }) {
  const text = String(message || "").toLowerCase();

  if (mode === "meal" || text.includes("describe meal") || text.includes("meal")) {
    return { kind: "meal", ...estimateMealFromText(message) };
  }

  if (mode === "task_rewrite") {
    return { kind: "task", task: rewriteTaskText(message, "improve") };
  }

  if (mode === "task_shorten") {
    return { kind: "task", task: rewriteTaskText(message, "shorten") };
  }

  if (mode === "task_organize") {
    return { kind: "task", task: rewriteTaskText(message, "organize") };
  }

  if (mode === "task_clearer") {
    return { kind: "task", task: rewriteTaskText(message, "clearer") };
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
    headline: "Here’s what to focus on next.",
    focusAreas: points.slice(0, 3).map((p) => titleCase(p.key)),
    nextSteps: [
      "Complete one practical open task first.",
      "Close your hydration gap and log one meal.",
      "Add a short movement block before evening.",
    ],
    prompt: "Try: Describe meal, Improve my task, Reset my day, or Reset my week.",
  };
}
