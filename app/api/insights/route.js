import { NextResponse } from "next/server";

function clamp(n) {
  const x = Number(n);
  return Number.isFinite(x) && x >= 0 ? x : 0;
}

function pickFastWin({ waterLitres, waterGoal, steps, stepGoal, calories, calorieGoal }) {
  const waterPct = waterGoal ? (waterLitres / waterGoal) : 0;
  const stepsPct = stepGoal ? (steps / stepGoal) : 0;
  const calPct = calorieGoal ? (calories / calorieGoal) : 0;

  // Choose the “lowest progress” lever as the fast win
  const scores = [
    { key: "water", score: waterPct },
    { key: "steps", score: stepsPct },
    { key: "calories", score: Math.min(1, calPct) },
  ].sort((a, b) => a.score - b.score);

  const winner = scores[0]?.key || "water";

  if (winner === "water") {
    return {
      kicker: "FAST WIN",
      headline: "Hydration is the fastest ROI.",
      text: "Hit 500ml now — energy + hunger control improves fast.",
      action: { type: "water", amountMl: 500 },
    };
  }

  if (winner === "steps") {
    return {
      kicker: "FAST WIN",
      headline: "A 10-minute walk fixes everything.",
      text: "Quick walk = mood lift + steps bump + appetite regulation.",
      action: { type: "walk", minutes: 10 },
    };
  }

  // calories / nutrition
  return {
    kicker: "FAST WIN",
    headline: "Log anything. Accuracy later.",
    text: "Logging reduces overeating by making the day feel ‘real’.",
    action: { type: "logFood" },
  };
}

export async function POST(req) {
  try {
    const body = await req.json();

    const waterLitres = clamp(body?.waterLitres);
    const waterGoal = clamp(body?.waterGoal);
    const steps = clamp(body?.steps);
    const stepGoal = clamp(body?.stepGoal);
    const calories = clamp(body?.calories);
    const calorieGoal = clamp(body?.calorieGoal);

    const fastWin = pickFastWin({ waterLitres, waterGoal, steps, stepGoal, calories, calorieGoal });

    // AI-ready: later you can generate coachMessage here using an LLM
    const coachMessage =
      "Based on today so far: do one small win first, then build. If you do the fast win now, the rest of your day becomes easier.";

    return NextResponse.json({
      fastWin,
      coachMessage,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to generate insights" },
      { status: 500 }
    );
  }
}