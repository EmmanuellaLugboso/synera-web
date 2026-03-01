import { NextResponse } from "next/server";
import {
  clamp,
  generatePlan,
  isRateLimited,
  topPriorities,
  validateMessage,
} from "./logic";

export async function POST(req) {
  try {
    if (isRateLimited(req)) {
      return NextResponse.json(
        { error: "Too many coach requests. Please wait a minute and retry." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const message = String(body?.message || "").trim();
    const contextRaw = body?.context || {};

    const validationError = validateMessage(message);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
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
    const nextPrompt =
      "Want me to turn this into a timed schedule for the next 3 hours?";

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
