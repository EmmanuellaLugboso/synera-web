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

const AREA_LABELS = {
  hydration: "hydration",
  movement: "movement",
  nutrition: "meal logging",
  habits: "habit consistency",
  tasks: "open tasks",
  sleep: "sleep recovery",
};

function pressurePoints(context) {
  const points = [
    { key: "hydration", deficit: 100 - progress(context.waterLitres, context.waterGoal) },
    { key: "movement", deficit: 100 - progress(context.steps, context.stepGoal) },
    { key: "nutrition", deficit: 100 - progress(context.calories, context.calorieGoal) },
    { key: "habits", deficit: 100 - clamp(context.habitsRate) },
    { key: "tasks", deficit: Math.min(100, ((context.openTasks || 0) / Math.max(1, (context.totalTasks || 1))) * 100) },
  ];

  if (context.sleepHours && context.sleepHours < 6.5) {
    points.push({ key: "sleep", deficit: Math.round((6.5 - context.sleepHours) * 18) });
  }

  return points.sort((a, b) => b.deficit - a.deficit);
}

const FOOD_LIBRARY = {
  chicken: { label: "Chicken", calories: 220, protein: 34, carbs: 0, fat: 8 },
  rice: { label: "Rice", calories: 205, protein: 4, carbs: 45, fat: 1 },
  plantain: { label: "Plantain", calories: 180, protein: 2, carbs: 47, fat: 1 },
  wrap: { label: "Wrap", calories: 210, protein: 6, carbs: 36, fat: 5 },
  coffee: { label: "Coffee", calories: 5, protein: 0, carbs: 0, fat: 0 },
  iced: { label: "Iced coffee add-on", calories: 40, protein: 1, carbs: 6, fat: 2 },
  yogurt: { label: "Yogurt", calories: 150, protein: 15, carbs: 12, fat: 4 },
  banana: { label: "Banana", calories: 105, protein: 1, carbs: 27, fat: 0 },
  toast: { label: "Toast", calories: 95, protein: 3, carbs: 17, fat: 1 },
  egg: { label: "Eggs", calories: 140, protein: 12, carbs: 1, fat: 10 },
  eggs: { label: "Eggs", calories: 140, protein: 12, carbs: 1, fat: 10 },
  tea: { label: "Tea", calories: 2, protein: 0, carbs: 0, fat: 0 },
  salmon: { label: "Salmon", calories: 240, protein: 25, carbs: 0, fat: 15 },
  oats: { label: "Oats", calories: 160, protein: 6, carbs: 27, fat: 3 },
  avocado: { label: "Avocado", calories: 120, protein: 2, carbs: 6, fat: 11 },
};

export function estimateMealFromText(text = "") {
  const tokens = String(text)
    .toLowerCase()
    .split(/[^a-zA-Z]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  const itemMap = new Map();
  let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  tokens.forEach((token) => {
    const match = FOOD_LIBRARY[token];
    if (!match) return;
    if (!itemMap.has(match.label)) itemMap.set(match.label, match);
    totals = {
      calories: totals.calories + match.calories,
      protein: totals.protein + match.protein,
      carbs: totals.carbs + match.carbs,
      fat: totals.fat + match.fat,
    };
  });

  if (!itemMap.size) {
    itemMap.set("Mixed meal", { label: "Mixed meal", calories: 380, protein: 18, carbs: 35, fat: 14 });
    totals = { calories: 380, protein: 18, carbs: 35, fat: 14 };
  }

  const items = Array.from(itemMap.values()).map((item) => ({
    name: item.label,
    calories: Math.round(item.calories),
    protein: Math.round(item.protein),
    carbs: Math.round(item.carbs),
    fat: Math.round(item.fat),
  }));

  return {
    items,
    totals: {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
    },
    note: "Nutrition values are estimates, not exact measurements.",
    saveTargets: ["Breakfast", "Lunch", "Dinner", "Snacks"],
  };
}

function titleCase(text = "") {
  return text
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function rewriteTaskText(text = "", style = "improve") {
  const trimmed = String(text).trim();
  const normalized = trimmed.replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();

  const isMoving = lower.includes("move") || lower.includes("moving");
  const category = lower.includes("shop") || lower.includes("pharmacy")
    ? "Errands"
    : isMoving
      ? "Moving"
      : lower.includes("clean")
        ? "Home"
        : "General";

  const urgency = lower.includes("today") || lower.includes("urgent")
    ? "High"
    : lower.includes("tomorrow")
      ? "Medium"
      : "Low";

  const durationMin = lower.includes("quick") ? 30 : lower.includes("hour") ? 60 : 45;

  if (!normalized) {
    return {
      title: "Task support needed",
      category: "General",
      durationMin: 45,
      urgency: "Medium",
      description: "I need support with a practical task and can share details after matching.",
      style,
    };
  }

  let title;
  if (isMoving) {
    title = "Help moving household items";
  } else if (lower.includes("shop") || lower.includes("buy")) {
    title = "Help with a shopping errand";
  } else {
    title = titleCase(normalized.length > 42 ? normalized.slice(0, 42) : normalized);
  }

  const baseDescription = `I need help with ${normalized}. The task should take around ${durationMin} minutes.`;

  const descriptions = {
    improve: `${baseDescription} Please message to confirm availability and timing.`,
    shorten: `Need help with ${normalized}. Around ${durationMin} minutes.`,
    organize: `${baseDescription}\nWhen: ${urgency === "High" ? "Today" : urgency === "Medium" ? "Tomorrow" : "Flexible this week"}.\nCategory: ${category}.`,
    clarify: `${baseDescription} It does not require specialist equipment, and details can be confirmed in chat.`,
  };

  return {
    title,
    category,
    durationMin,
    urgency,
    description: descriptions[style] || descriptions.improve,
    style,
  };
}

export function buildResetPlan(type = "day", context = {}) {
  const points = pressurePoints(context);
  const top = points[0]?.key || "tasks";
  const second = points[1]?.key || "hydration";

  if (type === "week") {
    return {
      headline: "Your week is recoverable.",
      summary: `The biggest slip was ${AREA_LABELS[top]}. A smaller gap showed up in ${AREA_LABELS[second]}.`,
      wins: "You still kept some momentum, which means the system is working — it just needs a lighter structure.",
      actions: [
        "Log breakfast each morning before 10am.",
        "Finish one priority task before lunch on weekdays.",
        "Schedule two short movement blocks (10–20 min).",
      ],
      encouragement: "You do not need a perfect week — just a steadier next one.",
    };
  }

  return {
    headline: "Let’s reset the rest of today.",
    summary: "A focused mini-reset now can lower tonight's stress and rebuild momentum.",
    actions: [
      "Close one easy open task in the next 20 minutes.",
      context.waterLitres < context.waterGoal ? "Drink water now and refill your bottle." : "Take a 10-minute walk to clear your head.",
      "Log your next meal, even if it is approximate.",
    ],
    topPriorityTask: "Close one easy open task in the next 20 minutes.",
    wellnessAction: context.waterLitres < context.waterGoal ? "Drink water now and refill your bottle." : "Take a 10-minute walk to clear your head.",
    nutritionAction: "Log your next meal, even if it is approximate.",
    encouragement: "A short reset now will reduce the pressure tonight.",
  };
}

export function buildReflection(message, context = {}) {
  const points = pressurePoints(context);
  const top = points.slice(0, 2).map((p) => AREA_LABELS[p.key]);
  return {
    headline: "It makes sense that this feels heavy.",
    reflection: `Right now the clearest gaps look like ${top.join(" and ") || "competing priorities"}.`,
    nextSteps: [
      "Log one meal so your day has a clear nutrition anchor.",
      "Complete one simple open task before starting anything new.",
      "Take a short pause: water first, then a 25-minute focus block.",
    ],
    closing: "You only need one calm step at a time.",
  };
}

export function buildGeneralFocus(context = {}) {
  const points = pressurePoints(context);
  const focusAreas = points.slice(0, 3).map((p) => AREA_LABELS[p.key]);
  return {
    kind: "general",
    headline: "Here’s your grounded focus snapshot.",
    focusAreas,
    nextSteps: [
      "Pick one open task and finish it before checking messages.",
      "Close your hydration gap and log your next meal.",
      "Add a short movement block before evening.",
    ],
    prompt: "Quick actions: Describe meal, Improve task, Reset day, Reset week.",
  };
}

export function respondWithSyra({ message, context = {}, mode = "general" }) {
  const text = String(message || "").toLowerCase();

  if (mode === "meal" || text.includes("describe meal") || text.includes("meal")) {
    return { kind: "meal", ...estimateMealFromText(message) };
  }

  if (["task_rewrite", "task_shorten", "task_organize", "task_clarify"].includes(mode) || text.includes("improve my task") || text.includes("rewrite task")) {
    const style = mode === "task_shorten" ? "shorten" : mode === "task_organize" ? "organize" : mode === "task_clarify" ? "clarify" : "improve";
    return { kind: "task", task: rewriteTaskText(message, style) };
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

  return buildGeneralFocus(context);
}
