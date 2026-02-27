import { NextResponse } from "next/server";

function clamp(value) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

export function buildInsight({ waterLitres, waterGoal, steps, stepGoal, calories, calorieGoal }) {
  const waterProgress = waterGoal ? waterLitres / waterGoal : 0;
  const stepProgress = stepGoal ? steps / stepGoal : 0;
  const calorieProgress = calorieGoal ? calories / calorieGoal : 0;

  const lowest = [
    { key: "water", progress: waterProgress },
    { key: "steps", progress: stepProgress },
    { key: "calories", progress: Math.min(1, calorieProgress) },
  ].sort((a, b) => a.progress - b.progress)[0]?.key;

  if (lowest === "water") {
    return {
      kicker: "FAST WIN",
      headline: "Hydration is the fastest ROI.",
      text: "Drink 500ml now to boost focus and appetite control this afternoon.",
      action: { type: "water", amountMl: 500 },
    };
  }

  if (lowest === "steps") {
    return {
      kicker: "MOMENTUM MOVE",
      headline: "A 10-minute walk resets your day.",
      text: "Quick walk, quick win: get your heart rate up and stack steps with almost zero friction.",
      action: { type: "walk", minutes: 10 },
    };
  }

  return {
    kicker: "NUTRITION NUDGE",
    headline: "Log one meal with protein + fibre.",
    text: "Keep it simple: log one honest meal to tighten your calories and avoid random snacking.",
    action: { type: "logFood" },
  };
}

export async function POST(req) {
  try {
    const body = await req.json();

    const insight = buildInsight({
      waterLitres: clamp(body?.waterLitres),
      waterGoal: clamp(body?.waterGoal),
      steps: clamp(body?.steps),
      stepGoal: clamp(body?.stepGoal),
      calories: clamp(body?.calories),
      calorieGoal: clamp(body?.calorieGoal),
    });

    return NextResponse.json({ insight });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to generate insight" },
      { status: 500 }
    );
  }
}
