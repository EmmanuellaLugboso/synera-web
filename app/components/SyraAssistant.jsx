"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useOnboarding } from "../context/OnboardingContext";

const QUICK_ACTIONS = [
  { label: "Describe meal", mode: "meal", prompt: "chicken wrap and iced coffee" },
  { label: "Improve my task", mode: "task_rewrite", prompt: "need help moving some stuff maybe tomorrow" },
  { label: "I feel overwhelmed", mode: "reflect", prompt: "I feel overwhelmed and behind" },
  { label: "Reset my day", mode: "reset_day", prompt: "reset my day" },
  { label: "Reset my week", mode: "reset_week", prompt: "reset my week" },
  { label: "What should I focus on today?", mode: "general", prompt: "what should I focus on today?" },
  { label: "What’s slipping this week?", mode: "general", prompt: "what is slipping this week" },
];

function formatSyraResponse(data) {
  if (!data) return "";
  if (data.kind === "meal") {
    return `Approximate meal estimate: ${data.totals.calories} kcal • P ${data.totals.protein}g • C ${data.totals.carbs}g • F ${data.totals.fat}g. Foods: ${data.matchedFoods.join(", ")}.`;
  }
  if (data.kind === "task") {
    return `Improved task:\n${data.task.title}\n${data.task.description}\nCategory: ${data.task.category} • Urgency: ${data.task.urgency} • Est: ${data.task.durationMin}m`;
  }
  if (data.kind === "reset") {
    return `${data.headline} ${data.summary}\n- ${data.actions.join("\n- ")}\n${data.encouragement}`;
  }
  if (data.kind === "reflection") {
    return `${data.headline} ${data.reflection}\n- ${data.nextSteps.join("\n- ")}\n${data.closing}`;
  }
  return `${data.headline}\nFocus: ${(data.focusAreas || []).join(", ")}\n- ${(data.nextSteps || []).join("\n- ")}`;
}

export default function SyraAssistant() {
  const pathname = usePathname();
  const { data } = useOnboarding();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi, I’m Syra. I can help you log meals, improve tasks, and reset your day calmly." },
  ]);
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const drag = useRef(null);

  const hidden = useMemo(() => {
    return pathname?.startsWith("/login") || pathname?.startsWith("/signup");
  }, [pathname]);

  useEffect(() => {
    function onMove(e) {
      if (!drag.current) return;
      setPos((prev) => ({
        x: Math.max(12, prev.x - (e.movementX || 0)),
        y: Math.max(12, prev.y - (e.movementY || 0)),
      }));
    }
    function onUp() {
      drag.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

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
        body: JSON.stringify({
          message,
          mode,
          context: {
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
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Syra is unavailable right now.");
      setMessages((prev) => [...prev, { role: "assistant", text: formatSyraResponse(json), raw: json }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", text: error.message || "Syra is unavailable right now." }]);
    } finally {
      setLoading(false);
    }
  }

  if (hidden) return null;

  return (
    <>
      {open ? (
        <div className="syra-overlay" onClick={() => setOpen(false)}>
          <aside className="syra-panel" onClick={(e) => e.stopPropagation()}>
            <div className="syra-head">
              <div>
                <div className="syra-title">SYRA</div>
                <div className="syra-sub">Calm support for meals, tasks, reflection, and resets.</div>
              </div>
              <button className="syra-close" onClick={() => setOpen(false)} type="button">Close</button>
            </div>

            <div className="syra-chips">
              {QUICK_ACTIONS.map((chip) => (
                <button key={chip.label} type="button" className="syra-chip" onClick={() => askSyra(chip.prompt, chip.mode)}>{chip.label}</button>
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
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Syra anything…" className="syra-input" />
              <button type="button" className="syra-send" onClick={() => askSyra(input, "general")}>Send</button>
            </div>
          </aside>
        </div>
      ) : null}

      <button
        type="button"
        className="syra-fab"
        style={{ right: `${pos.x}px`, bottom: `${pos.y}px` }}
        onPointerDown={() => {
          drag.current = true;
        }}
        onClick={() => setOpen(true)}
        aria-label="Open Syra"
      >
        ✿
      </button>
    </>
  );
}
