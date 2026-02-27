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
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const name = String(context?.name || "friend");
    const waterLitres = clamp(context?.waterLitres);
    const waterGoal = clamp(context?.waterGoal);
    const steps = clamp(context?.steps);
    const stepGoal = clamp(context?.stepGoal);
    const calories = clamp(context?.calories);
    const calorieGoal = clamp(context?.calorieGoal);

    const waterPct = progress(waterLitres, waterGoal);
    const stepsPct = progress(steps, stepGoal);
    const calPct = progress(calories, calorieGoal);

    const lower = message.toLowerCase();
    let reply = `${name}, pick one easy win: 500ml water or a 10-min walk. Then check back.`;

    if (lower.includes("water") || waterPct < stepsPct) {
      reply = `${name}, hydration is your quickest boost. You are at ${waterPct}% of water goal — drink 500ml now.`;
    } else if (lower.includes("walk") || lower.includes("steps") || stepsPct <= waterPct) {
      reply = `${name}, get moving for 10 minutes right now. You're at ${stepsPct}% of your step goal and this closes the gap fast.`;
    } else if (lower.includes("food") || lower.includes("calorie") || lower.includes("eat")) {
      reply = `${name}, keep food simple: log one protein + fibre meal next. Calories are at ${calPct}% of goal.`;
    }

    if (lower.includes("tired") || lower.includes("energy")) {
      reply = `${name}, low energy fix: 500ml water + 10-minute walk before caffeine. Quick reset, no overthinking.`;
    }

    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to generate coach reply" },
      { status: 500 }
    );
  }
}
