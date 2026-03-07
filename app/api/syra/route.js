import { NextResponse } from "next/server";
import { MAX_MESSAGE_CHARS, clamp, respondWithSyra } from "./logic";

export async function POST(req) {
  try {
    const body = await req.json();
    const message = String(body?.message || "").trim();
    const mode = String(body?.mode || "general");

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json({ error: `Message is too long. Max ${MAX_MESSAGE_CHARS} chars.` }, { status: 400 });
    }

    const raw = body?.context || {};
    const context = {
      waterLitres: clamp(raw?.waterLitres),
      waterGoal: clamp(raw?.waterGoal),
      steps: clamp(raw?.steps),
      stepGoal: clamp(raw?.stepGoal),
      calories: clamp(raw?.calories),
      calorieGoal: clamp(raw?.calorieGoal),
      habitsRate: clamp(raw?.habitsRate),
      sleepHours: clamp(raw?.sleepHours),
      openTasks: clamp(raw?.openTasks),
      totalTasks: clamp(raw?.totalTasks),
    };

    const result = respondWithSyra({ message, context, mode });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to generate Syra response" }, { status: 500 });
  }
}
