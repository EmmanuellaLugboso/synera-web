import { NextResponse } from "next/server";

function clamp(value) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function progress(current, goal) {
  if (!goal) return 0;
  return Math.round((current / goal) * 100);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const message = String(body?.message || "").trim();
    const context = body?.context || {};

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const name = String(context?.name || "friend");
    const waterLitres = clamp(context?.waterLitres);
    const waterGoal = clamp(context?.waterGoal);
    const steps = clamp(context?.steps);
    const stepGoal = clamp(context?.stepGoal);
    const calories = clamp(context?.calories);
    const calorieGoal = clamp(context?.calorieGoal);
    const moodRating = clamp(context?.moodRating);
    const sleepHours = clamp(context?.sleepHours);
    const habitsRate = clamp(context?.habitsRate);

    const waterPct = progress(waterLitres, waterGoal);
    const stepsPct = progress(steps, stepGoal);
    const calPct = progress(calories, calorieGoal);

    const lower = message.toLowerCase();
    let reply = `${name}, pick one easy win: 500ml water or a 10-min walk. Then check back.`;

    if (lower.includes("water") || waterPct < stepsPct) {
      reply = `${name}, hydration is your quickest boost. You are at ${waterPct}% of water goal — drink 500ml now.`;
    } else if (
      lower.includes("walk") ||
      lower.includes("steps") ||
      stepsPct <= waterPct
    ) {
      reply = `${name}, get moving for 10 minutes right now. You're at ${stepsPct}% of your step goal and this closes the gap fast.`;
    } else if (
      lower.includes("food") ||
      lower.includes("calorie") ||
      lower.includes("eat")
    ) {
      reply = `${name}, keep food simple: log one protein + fibre meal next. Calories are at ${calPct}% of goal.`;
    }

    if (sleepHours > 0 && sleepHours < 6.5) {
      reply = `${name}, recovery is the limiting factor today. Sleep was ${sleepHours.toFixed(1)}h — keep intensity moderate and lock bedtime tonight.`;
    }

    if (moodRating > 0 && moodRating <= 2) {
      reply = `${name}, mood signal is low (${moodRating}/5). Use a low-friction win first: hydration + 10-minute walk, then reassess.`;
    }

    if (habitsRate > 0 && habitsRate < 60) {
      reply = `${name}, habits are under target (${habitsRate}%). Pick only 2 non-negotiables and close them before 8pm.`;
    }

    if (lower.includes("tired") || lower.includes("energy")) {
      reply = `${name}, low energy fix: 500ml water + 10-minute walk before caffeine. Quick reset, no overthinking.`;
    }

    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to generate coach reply" },
      { status: 500 },
    );
  }
}
