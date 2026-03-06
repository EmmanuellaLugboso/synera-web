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
        { error: "Too many SYRA requests. Please wait a minute and retry." },
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

    const planItems = Array.isArray(contextRaw?.planItems)
      ? contextRaw.planItems
          .slice(0, 10)
          .map((item) => ({
            text: String(item?.text || "").trim(),
            done: Boolean(item?.done),
          }))
          .filter((item) => item.text)
      : [];

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
      planItems,
    };

    const planResult = generatePlan(message, context);
    const priorities = topPriorities(context).map((x) => x.summary);

    return NextResponse.json({
      reply: `${planResult.reply} Top priorities: ${priorities.slice(0, 2).join(" • ") || "Build consistency across your daily pillars"}.`,
      focus: planResult.focus,
      plan: planResult.plan,
      checkInMin: planResult.checkInMin,
      nextPrompt: planResult.nextPrompt || "Want me to adapt this for your available time today?",
      keyMessages: Array.isArray(planResult.keyMessages) ? planResult.keyMessages : [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate assistant reply" },
      { status: 500 },
    );
  }
}
