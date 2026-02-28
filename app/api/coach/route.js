import { NextResponse } from "next/server";

function clamp(value) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function progress(current, goal) {
  if (!goal) return 0;
  return Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
}

function topPriorities(context) {
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

  return deficits.sort((a, b) => b.score - a.score).slice(0, 2);
}

function generatePlan(message, context) {
  const lower = message.toLowerCase();
  const top = topPriorities(context);
  const primary = top[0]?.key || "hydration";

  if (lower.includes("tired") || lower.includes("energy")) {
    return {
      focus: "energy reset",
      checkInMin: 25,
      plan: [
        "Drink 400–500ml water now.",
        "Take a 10-minute light walk outside or by a window.",
        "Eat protein + fruit at your next meal/snack.",
      ],
      reply: `${context.name}, let's run a fast energy reset.`,
    };
  }

  if (lower.includes("workout") || lower.includes("gym")) {
    return {
      focus: "training execution",
      checkInMin: 45,
      plan: [
        "Do a 5-minute warm-up right now.",
        "Complete your first 2 main sets before checking phone.",
        "Log session + recovery (water + protein) immediately after.",
      ],
      reply: `${context.name}, let's keep training simple and executable.`,
    };
  }

  if (lower.includes("food") || lower.includes("eat") || lower.includes("calorie")) {
    return {
      focus: "nutrition consistency",
      checkInMin: 60,
      plan: [
        "Pick one meal with protein + fiber in the next hour.",
        "Log that meal before the next one starts.",
        "Pre-decide your next snack so evening choices are easier.",
      ],
      reply: `${context.name}, nutrition focus is on consistency, not perfection.`,
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
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const message = String(body?.message || "").trim();
    const contextRaw = body?.context || {};

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const context = {
      name: String(contextRaw?.name || "friend"),
      waterLitres: clamp(contextRaw?.waterLitres),
      waterGoal: clamp(contextRaw?.waterGoal),
      steps: clamp(contextRaw?.steps),
      stepGoal: clamp(contextRaw?.stepGoal),
      calories: clamp(contextRaw?.calories),
      calorieGoal: clamp(contextRaw?.calorieGoal),
      moodRating: clamp(contextRaw?.moodRating),
      sleepHours: clamp(contextRaw?.sleepHours),
      habitsRate: clamp(contextRaw?.habitsRate),
    };

    const planResult = generatePlan(message, context);
    const priorities = topPriorities(context).map((x) => x.summary);
    const nextPrompt = "Want me to turn this into a timed schedule for the next 3 hours?";

    return NextResponse.json({
      reply: `${planResult.reply} Top priorities: ${priorities.join(" • ")}.`,
      focus: planResult.focus,
      plan: planResult.plan,
      checkInMin: planResult.checkInMin,
      nextPrompt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate coach reply" },
      { status: 500 },
    );
  }
}
