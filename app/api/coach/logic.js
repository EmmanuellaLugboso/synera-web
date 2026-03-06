export const MAX_MESSAGE_CHARS = 600;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 25;

const requestCounts = new Map();

export function clamp(value) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

export function progress(current, goal) {
  if (!goal) return 0;
  return Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
}

export function topPriorities(context) {
  const deficits = [
    {
      key: "hydration",
      score: 100 - progress(context.waterLitres, context.waterGoal),
      summary: `Hydration ${progress(context.waterLitres, context.waterGoal)}%`,
    },
    {
      key: "steps",
      score: 100 - progress(context.steps, context.stepGoal),
      summary: `Steps ${progress(context.steps, context.stepGoal)}%`,
    },
    {
      key: "nutrition",
      score: 100 - progress(context.calories, context.calorieGoal),
      summary: `Calories ${progress(context.calories, context.calorieGoal)}%`,
    },
    {
      key: "habits",
      score: Math.max(0, 100 - clamp(context.habitsRate)),
      summary: `Habits ${Math.round(clamp(context.habitsRate))}%`,
    },
  ];

  if (context.sleepHours > 0 && context.sleepHours < 6.5) {
    deficits.push({
      key: "recovery",
      score: Math.round((6.5 - context.sleepHours) * 20),
      summary: `Sleep ${context.sleepHours.toFixed(1)}h`,
    });
  }

  if (context.moodRating > 0 && context.moodRating <= 2) {
    deficits.push({
      key: "mood",
      score: 35,
      summary: `Mood ${context.moodRating}/5`,
    });
  }

  return deficits.sort((a, b) => b.score - a.score).slice(0, 3);
}

function detectIntent(message = "") {
  const lower = message.toLowerCase();
  if (lower.includes("task") || lower.includes("to do") || lower.includes("todo")) return "tasks";
  if (lower.includes("focus") || lower.includes("priorit")) return "focus";
  if (lower.includes("falling behind") || lower.includes("behind") || lower.includes("struggling")) return "behind";
  if (lower.includes("progress") || lower.includes("week") || lower.includes("improved")) return "progress";
  if (lower.includes("habit")) return "habits";
  if (lower.includes("plan") || lower.includes("schedule")) return "planning";
  if (lower.includes("tired") || lower.includes("energy")) return "energy";
  if (lower.includes("workout") || lower.includes("gym")) return "workout";
  if (lower.includes("food") || lower.includes("eat") || lower.includes("calorie")) return "nutrition";
  return "general";
}

function buildKeyMessages(context, priorities, intent) {
  const planItems = Array.isArray(context.planItems) ? context.planItems : [];
  const openItems = planItems.filter((p) => !p?.done);
  const doneItems = planItems.filter((p) => p?.done);

  const progressLine = `Today: ${progress(context.waterLitres, context.waterGoal)}% hydration • ${progress(context.steps, context.stepGoal)}% movement • ${progress(context.calories, context.calorieGoal)}% fuel • ${Math.round(clamp(context.habitsRate))}% habits.`;
  const behindLine = priorities.length
    ? `You are most behind on ${priorities.slice(0, 2).map((p) => p.key).join(" and ")}.`
    : "You are trending stable across your core pillars.";
  const taskLine = openItems.length
    ? `Open tasks: ${openItems.slice(0, 3).map((p) => p.text).join(" • ")}`
    : "Great work — no open tasks in your current day plan.";

  if (intent === "tasks") return [taskLine, progressLine, behindLine];
  if (intent === "progress") {
    return [
      progressLine,
      `Completed today: ${doneItems.length}/${planItems.length || 0} planned actions.`,
      `Recovery snapshot: sleep ${context.sleepHours || 0}h • mood ${context.moodRating || 0}/5.`,
    ];
  }
  if (intent === "habits") {
    return [
      `Habit completion is ${Math.round(clamp(context.habitsRate))}%.`,
      openItems.length ? `Next habit to close: ${openItems[0]?.text || "your next planned habit"}.` : "Habits are complete for today.",
      "Small consistency wins beat high-effort sprints.",
    ];
  }

  return [progressLine, behindLine, taskLine];
}

export function generatePlan(message, context) {
  const intent = detectIntent(message);
  const top = topPriorities(context);
  const primary = top[0]?.key || "hydration";

  if (intent === "energy") {
    return {
      focus: "energy reset",
      checkInMin: 25,
      plan: [
        "Drink 400–500ml water now.",
        "Take a 10-minute light walk outside or by a window.",
        "Eat protein + fruit at your next meal/snack.",
      ],
      reply: `${context.name}, let's run a fast energy reset.`,
      nextPrompt: "Want a low-effort evening wind-down plan too?",
      keyMessages: buildKeyMessages(context, top, intent),
    };
  }

  if (intent === "workout") {
    return {
      focus: "training execution",
      checkInMin: 45,
      plan: [
        "Do a 5-minute warm-up right now.",
        "Complete your first 2 main sets before checking phone.",
        "Log session + recovery (water + protein) immediately after.",
      ],
      reply: `${context.name}, let's keep training simple and executable.`,
      nextPrompt: "Want me to tailor this for home, gym, or low-energy mode?",
      keyMessages: buildKeyMessages(context, top, intent),
    };
  }

  if (intent === "nutrition") {
    return {
      focus: "nutrition consistency",
      checkInMin: 60,
      plan: [
        "Pick one meal with protein + fiber in the next hour.",
        "Log that meal before the next one starts.",
        "Pre-decide your next snack so evening choices are easier.",
      ],
      reply: `${context.name}, nutrition focus is on consistency, not perfection.`,
      nextPrompt: "Do you want a quick dinner template that fits your targets?",
      keyMessages: buildKeyMessages(context, top, intent),
    };
  }

  if (intent === "tasks") {
    const openItems = (context.planItems || []).filter((p) => !p?.done);
    return {
      focus: "task execution",
      checkInMin: 35,
      plan: openItems.length
        ? openItems.slice(0, 3).map((p) => p.text)
        : ["No open tasks left — lock in recovery and prep tomorrow's top 3 tasks."],
      reply: `${context.name}, here is your highest-impact task queue for today.`,
      nextPrompt: "Want me to turn this into a time-blocked schedule?",
      keyMessages: buildKeyMessages(context, top, intent),
    };
  }

  if (intent === "progress") {
    return {
      focus: "weekly progress review",
      checkInMin: 50,
      plan: [
        "Protect your strongest metric today to keep momentum.",
        "Close one lagging metric before evening.",
        "Review your completed tasks and set tomorrow's top 3.",
      ],
      reply: `${context.name}, here is your progress check with the next growth move.`,
      nextPrompt: "Do you want a simple weekly scorecard summary next?",
      keyMessages: buildKeyMessages(context, top, intent),
    };
  }

  if (intent === "habits") {
    return {
      focus: "habit consistency",
      checkInMin: 40,
      plan: [
        "Start with your easiest habit in the next 15 minutes.",
        "Stack the next habit right after an existing routine.",
        "Mark completion immediately to reinforce momentum.",
      ],
      reply: `${context.name}, let's tighten habit consistency with low-friction actions.`,
      nextPrompt: "Want a habit stack for morning, afternoon, and evening?",
      keyMessages: buildKeyMessages(context, top, intent),
    };
  }

  if (primary === "recovery") {
    return {
      focus: "recovery protection",
      checkInMin: 90,
      plan: [
        "Keep training intensity at 70–80% today.",
        "No caffeine in the 8 hours before bed.",
        "Set tonight's bedtime now and protect it.",
      ],
      reply: `${context.name}, recovery is the bottleneck today.`,
      nextPrompt: "Should I build a sleep-first evening routine?",
      keyMessages: buildKeyMessages(context, top, intent),
    };
  }

  if (primary === "steps") {
    return {
      focus: "movement momentum",
      checkInMin: 35,
      plan: [
        "Take a 10-minute walk immediately.",
        "Add 2 short movement breaks before dinner.",
        "Close remaining step gap with a post-meal walk.",
      ],
      reply: `${context.name}, movement gives you the fastest momentum boost right now.`,
      nextPrompt: "Want me to split your step goal into 3 checkpoints?",
      keyMessages: buildKeyMessages(context, top, intent),
    };
  }

  return {
    focus: "daily execution",
    checkInMin: 30,
    plan: [
      "Drink 500ml water now.",
      "Do one 10-minute movement block.",
      "Complete your next most important habit before 8pm.",
    ],
    reply: `${context.name}, we can win this day with a focused 3-step plan.`,
    nextPrompt: "Want me to prioritize this by impact and effort?",
    keyMessages: buildKeyMessages(context, top, intent),
  };
}

export function validateMessage(message) {
  if (!message) return "Message is required";
  if (message.length > MAX_MESSAGE_CHARS) {
    return `Message is too long. Max ${MAX_MESSAGE_CHARS} characters.`;
  }
  return null;
}

function getClientKey(req) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0]?.trim();
  return first || "anonymous";
}

export function isRateLimited(req, now = Date.now()) {
  const key = getClientKey(req);
  const current = requestCounts.get(key);

  if (!current || current.resetAt <= now) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  current.count += 1;
  requestCounts.set(key, current);
  return false;
}

export function __resetRateLimitForTests() {
  requestCounts.clear();
}
