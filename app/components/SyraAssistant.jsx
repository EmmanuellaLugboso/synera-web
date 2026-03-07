"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useOnboarding } from "../context/OnboardingContext";

const QUICK_ACTIONS = [
  { label: "Describe meal", mode: "meal", prompt: "chicken wrap and iced coffee" },
  { label: "Improve my task", mode: "task_rewrite", prompt: "need help moving some stuff tomorrow" },
  { label: "I feel overwhelmed", mode: "reflect", prompt: "I feel overwhelmed and behind" },
  { label: "I feel behind", mode: "reflect", prompt: "I feel behind this week" },
  { label: "Reset my day", mode: "reset_day", prompt: "reset my day" },
  { label: "Reset my week", mode: "reset_week", prompt: "reset my week" },
  { label: "What should I focus on today?", mode: "general", prompt: "what should I focus on today?" },
  { label: "What’s slipping this week?", mode: "general", prompt: "what is slipping this week" },
];

const TASK_REWRITE_ACTIONS = [
  { label: "Improve with Syra", mode: "task_rewrite" },
  { label: "Shorten", mode: "task_shorten" },
  { label: "Organize details", mode: "task_organize" },
  { label: "Make clearer", mode: "task_clarify" },
];

const DEMO_WEEK_CONTEXT = {
  waterLitres: 1.3,
  waterGoal: 2.5,
  calories: 1220,
  calorieGoal: 1900,
  steps: 4200,
  stepGoal: 9000,
  habitsRate: 54,
  sleepHours: 6.1,
  openTasks: 7,
  totalTasks: 11,
};

function formatMessage(data) {
  if (!data) return "";

  if (data.kind === "meal") {
    const itemLines = (data.items || []).map((item) => `${item.name} — est. ${item.calories} kcal`);
    return [
      "Meal estimate",
      ...itemLines,
      `Estimated macros: P ${data.totals.protein}g • C ${data.totals.carbs}g • F ${data.totals.fat}g`,
      data.note,
      `Add to: ${(data.saveTargets || []).join(", ")}`,
    ].join("\n");
  }

  if (data.kind === "task") {
    return [
      "Task rewrite",
      `Title: ${data.task.title}`,
      `Description: ${data.task.description}`,
      `Category: ${data.task.category} • Urgency: ${data.task.urgency} • Est: ${data.task.durationMin}m`,
    ].join("\n");
  }

  if (data.kind === "reflection") {
    return [
      data.headline,
      data.reflection,
      ...(data.nextSteps || []).map((step) => `• ${step}`),
      data.closing,
    ].join("\n");
  }

  if (data.kind === "reset" && data.period === "day") {
    return [
      data.headline,
      `Top priority task: ${data.topPriorityTask}`,
      `Wellness action: ${data.wellnessAction}`,
      `Nutrition action: ${data.nutritionAction}`,
      data.encouragement,
    ].join("\n");
  }

  if (data.kind === "reset" && data.period === "week") {
    return [
      data.headline,
      data.summary,
      data.wins,
      ...(data.actions || []).map((step) => `• ${step}`),
      data.encouragement,
    ].join("\n");
  }

  return [data.headline, ...(data.nextSteps || []).map((step) => `• ${step}`), data.prompt].filter(Boolean).join("\n");
}

export default function SyraAssistant() {
  const pathname = usePathname();
  const { data } = useOnboarding();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [useDemoData, setUseDemoData] = useState(true);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi, I’m Syra. I can help you log meals, improve task posts, reflect, and reset your day or week.",
    },
  ]);
  const [pos, setPos] = useState({ x: 24, y: 24 });

  const drag = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startRight: 24,
    startBottom: 24,
    moved: false,
  });

  const hidden = useMemo(() => pathname?.startsWith("/login") || pathname?.startsWith("/signup"), [pathname]);

  useEffect(() => {
    function onPointerMove(e) {
      if (!drag.current.active) return;
      const deltaX = e.clientX - drag.current.startX;
      const deltaY = e.clientY - drag.current.startY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        drag.current.moved = true;
      }

      const nextRight = drag.current.startRight - deltaX;
      const nextBottom = drag.current.startBottom - deltaY;
      const maxRight = Math.max(12, window.innerWidth - 72);
      const maxBottom = Math.max(12, window.innerHeight - 72);

      setPos({
        x: Math.min(Math.max(12, nextRight), maxRight),
        y: Math.min(Math.max(12, nextBottom), maxBottom),
      });
    }

    function onPointerUp() {
      drag.current.active = false;
      drag.current.pointerId = null;
      window.setTimeout(() => {
        drag.current.moved = false;
      }, 0);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const context = useMemo(() => {
    if (useDemoData) return DEMO_WEEK_CONTEXT;
    return {
      waterLitres: Number(data?.waterLitres || 0),
      waterGoal: Number(data?.waterGoalLitres || 2),
      calories: Number(data?.dailyCalories || 0),
      calorieGoal: Number(data?.calorieGoal || 1800),
      steps: Number(data?.stepsToday || 0),
      stepGoal: Number(data?.stepGoal || 8000),
      habitsRate: Number(data?.habitsCompletion || 0),
      sleepHours: Number(data?.sleepHours || 0),
      openTasks: Array.isArray(data?.lifeAdminTasks) ? data.lifeAdminTasks.filter((t) => !t?.done).length : 0,
      totalTasks: Array.isArray(data?.lifeAdminTasks) ? data.lifeAdminTasks.length : 0,
    };
  }, [data, useDemoData]);

  async function askSyra(prompt, mode = "general") {
    const message = String(prompt || input).trim();
    if (!message) return;
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/syra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, mode, context }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Syra is unavailable right now.");
      setMessages((prev) => [...prev, { role: "assistant", text: formatMessage(json), raw: json }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", text: error.message || "Syra is unavailable right now." }]);
    } finally {
      setLoading(false);
    }
  }

  if (hidden) return null;

  return (
    <div className="syra-dock">
      {open ? <button type="button" className="syra-overlay" aria-label="Close Syra" onClick={() => setOpen(false)} /> : null}

      {open ? (
        <aside className="syra-panel" onClick={(e) => e.stopPropagation()}>
          <div className="syra-head">
            <div>
              <div className="syra-title">SYRA</div>
              <div className="syra-sub">Calm support for meals, tasks, reflection, and resets.</div>
            </div>
            <button className="syra-close" onClick={() => setOpen(false)} type="button">Close</button>
          </div>

          <div className="syra-toolbar">
            <button type="button" className={`syra-chip ${useDemoData ? "active" : ""}`} onClick={() => setUseDemoData(true)}>Demo week data</button>
            <button type="button" className={`syra-chip ${!useDemoData ? "active" : ""}`} onClick={() => setUseDemoData(false)}>Live data</button>
          </div>

          <div className="syra-chips">
            {QUICK_ACTIONS.map((chip) => (
              <button key={chip.label} type="button" className="syra-chip" onClick={() => askSyra(chip.prompt, chip.mode)}>{chip.label}</button>
            ))}
          </div>

          <div className="syra-chips syra-chips--subtle">
            {TASK_REWRITE_ACTIONS.map((chip) => (
              <button key={chip.label} type="button" className="syra-chip syra-chip--small" onClick={() => askSyra(input || "need help moving some stuff tomorrow", chip.mode)}>{chip.label}</button>
            ))}
          </div>

          <div className="syra-thread">
            {messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={`syra-msg ${m.role}`}>
                <pre>{m.text}</pre>
              </div>
            ))}
            {loading ? <div className="syra-msg assistant"><pre>Syra is thinking…</pre></div> : null}
          </div>

          <div className="syra-inputrow">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Syra anything…"
              className="syra-input"
              onKeyDown={(e) => {
                if (e.key === "Enter") askSyra(input, "general");
              }}
            />
            <button type="button" className="syra-send" onClick={() => askSyra(input, "general")}>Send</button>
          </div>
        </aside>
      ) : null}

      <button
        type="button"
        className="syra-fab"
        style={{ right: `${pos.x}px`, bottom: `${pos.y}px` }}
        onPointerDown={(e) => {
          drag.current.active = true;
          drag.current.pointerId = e.pointerId;
          drag.current.startX = e.clientX;
          drag.current.startY = e.clientY;
          drag.current.startRight = pos.x;
          drag.current.startBottom = pos.y;
          drag.current.moved = false;
        }}
        onClick={() => {
          if (drag.current.moved) return;
          setOpen((prev) => !prev);
        }}
        aria-label="Open Syra"
      >
        ✦
      </button>
    </div>
  );
}
