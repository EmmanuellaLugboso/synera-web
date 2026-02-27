import { NextResponse } from "next/server";

function clamp(n) {
  const x = Number(n);
  return Number.isFinite(x) && x >= 0 ? x : 0;
}

function buildAiReply({ question = "", mode = "coach", fastWin, waterLitres, waterGoal, steps, stepGoal, calories, calorieGoal }) {
  const q = String(question || "").toLowerCase();
  const lines = [];
  const tone = mode === "strict" ? "strict" : mode === "kind" ? "kind" : "coach";

  lines.push(`Today snapshot: ${Math.round(calories)} / ${Math.round(calorieGoal)} kcal, ${waterLitres.toFixed(1)} / ${waterGoal}L water, ${Math.round(steps)} / ${Math.round(stepGoal)} steps.`);
  if (tone === "strict") lines.push("No excuses today — execute one action now.");
  if (tone === "kind") lines.push("You’re doing fine. One tiny action is enough to restart momentum.");
  lines.push(`Best next move: ${fastWin?.headline || "Take one small fast win now."}`);

  if (q.includes("30") || q.includes("next")) {
    lines.push("Next 30 minutes: do the fast win first, then log one tiny proof-of-progress (meal, walk, or water)." );
  } else if (q.includes("weight") || q.includes("fat") || q.includes("loss")) {
    lines.push("For body-composition goals, consistency beats perfection: complete one action now and keep the calorie log honest.");
  } else if (q.includes("energy") || q.includes("tired")) {
    lines.push("For energy, hydrate and walk briefly before caffeine or snacks. It usually improves focus faster.");
  } else if (q.trim()) {
    lines.push("Your question is good — answer it with one immediate behavior. Execute, then reassess in 1 hour.");
  } else {
    lines.push("Ask a specific question for a more tailored plan (e.g. 'What should I do in the next 30 minutes?').");
  }

  return lines.join(" ");
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

    const question = String(body?.question || "");
    const mode = String(body?.mode || "coach").toLowerCase();
    const fastWin = pickFastWin({ waterLitres, waterGoal, steps, stepGoal, calories, calorieGoal });

    const coachMessage =
      "Based on today so far: do one small win first, then build. If you do the fast win now, the rest of your day becomes easier.";

    const aiReply = buildAiReply({
      question,
      mode,
      fastWin,
      waterLitres,
      waterGoal,
      steps,
      stepGoal,
      calories,
      calorieGoal,
    });

    const nextActions = [
      fastWin?.text || "Do your fast win now.",
      "Log one proof of progress after it.",
      "Recheck your dashboard in 60 minutes.",
    ];

    return NextResponse.json({
      fastWin,
      coachMessage,
      aiReply,
      mode,
      nextActions,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to generate insights" },
      { status: 500 }
    );
  }
}