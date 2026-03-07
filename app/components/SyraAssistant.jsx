"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useOnboarding } from "../context/OnboardingContext";
import { requestSyra } from "../services/syraService";

const QUICK_ACTIONS = [
  { label: "Describe meal", mode: "meal", prompt: "chicken wrap and iced coffee" },
  { label: "Improve my task", mode: "task_rewrite", prompt: "need help moving some stuff tomorrow" },
  { label: "I feel overwhelmed", mode: "reflect", prompt: "I feel overwhelmed" },
  { label: "I feel behind", mode: "reflect", prompt: "I feel behind" },
  { label: "Reset my day", mode: "reset_day", prompt: "reset my day" },
  { label: "Reset my week", mode: "reset_week", prompt: "reset my week" },
  { label: "What should I focus on today?", mode: "general", prompt: "what should I focus on today?" },
  { label: "What’s slipping this week?", mode: "general", prompt: "what is slipping this week" },
];

function formatContextFromData(data = {}) {
  const tasks = Array.isArray(data?.lifeAdminTasks) ? data.lifeAdminTasks : [];
  const foodLogs = Array.isArray(data?.foodLogs) ? data.foodLogs : [];

  const cals = foodLogs.reduce((sum, row) => sum + Number(row?.calories || 0), 0);
  return {
    waterLitres: Number(data?.waterLitres || 0),
    waterGoal: Number(data?.waterGoalLitres || 2.5),
    calories: Number(cals || data?.dailyCalories || 0),
    calorieGoal: Number(data?.calorieGoal || 1800),
    steps: Number(data?.stepsToday || 0),
    stepGoal: Number(data?.stepGoal || 8000),
    habitsRate: Number(data?.habitsCompletion || 0),
    sleepHours: Number(data?.sleepHours || 0),
    openTasks: tasks.filter((t) => !t?.done).length,
    totalTasks: tasks.length,
  };
}

function MealCard({ data }) {
  return (
    <div className="syra-resultCard">
      {data.items.map((item) => (
        <div key={item.name} className="syra-mealItem">
          <strong>{item.name}</strong>
          <span>Estimated: {item.calories} kcal</span>
        </div>
      ))}
      <div className="syra-meta">Estimated macros: P {data.totals.protein}g · C {data.totals.carbs}g · F {data.totals.fat}g</div>
      <div className="syra-note">{data.note}</div>
      <div className="syra-inlineActions">
        {[
          "Add to breakfast",
          "Add to lunch",
          "Add to dinner",
          "Add to snacks",
          "Edit before saving",
        ].map((label) => (
          <button key={label} type="button" className="syra-minibtn">{label}</button>
        ))}
      </div>
    </div>
  );
}

function TaskCard({ data, onAction }) {
  return (
    <div className="syra-resultCard">
      <div className="syra-title2">Title: {data.title}</div>
      <p>{data.description}</p>
      <div className="syra-meta">Category: {data.category} · Estimated time: {data.durationMin} min</div>
      <div className="syra-inlineActions">
        <button type="button" className="syra-minibtn syra-minibtn--premium" onClick={() => onAction("task_rewrite")}>Improve with Syra</button>
        <button type="button" className="syra-minibtn" onClick={() => onAction("task_shorten")}>Shorten</button>
        <button type="button" className="syra-minibtn" onClick={() => onAction("task_organize")}>Organize details</button>
        <button type="button" className="syra-minibtn" onClick={() => onAction("task_clearer")}>Make clearer</button>
      </div>
    </div>
  );
}

function StructuredResponse({ message, onTaskAction }) {
  if (!message?.raw) return <p>{message.text}</p>;
  const data = message.raw;

  if (data.kind === "meal") return <MealCard data={data} />;
  if (data.kind === "task") return <TaskCard data={data.task} onAction={onTaskAction} />;

  return (
    <div className="syra-resultCard">
      <div className="syra-title2">{data.headline}</div>
      {data.summary ? <p>{data.summary}</p> : null}
      {data.reflection ? <p>{data.reflection}</p> : null}
      {Array.isArray(data.nextSteps) ? (
        <ul>
          {data.nextSteps.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
      {Array.isArray(data.actions) ? (
        <ul>
          {data.actions.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
      {data.encouragement ? <p className="syra-note">{data.encouragement}</p> : null}
      {data.closing ? <p className="syra-note">{data.closing}</p> : null}
      {data.prompt ? <p className="syra-note">{data.prompt}</p> : null}
    </div>
  );
}

function createDemoWeekData() {
  return {
    waterLitres: 1.4,
    waterGoalLitres: 3,
    stepsToday: 4200,
    stepGoal: 8000,
    calorieGoal: 1900,
    sleepHours: 6.1,
    habitsCompletion: 40,
    lifeAdminTasks: [
      { id: "t1", title: "Pay electricity bill", done: false },
      { id: "t2", title: "Email client follow-up", done: false },
      { id: "t3", title: "Laundry", done: true },
    ],
    foodLogs: [
      { id: "f1", meal: "breakfast", calories: 320, dateISO: "2026-03-01" },
      { id: "f2", meal: "lunch", calories: 540, dateISO: "2026-03-02" },
      { id: "f3", meal: "dinner", calories: 610, dateISO: "2026-03-03" },
      { id: "f4", meal: "snack", calories: 180, dateISO: "2026-03-04" },
      { id: "f5", meal: "breakfast", calories: 280, dateISO: "2026-03-05" },
      { id: "f6", meal: "lunch", calories: 500, dateISO: "2026-03-06" },
      { id: "f7", meal: "dinner", calories: 630, dateISO: "2026-03-07" },
    ],
  };
}

export default function SyraAssistant() {
  const pathname = usePathname();
  const { data, updateMany } = useOnboarding();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi, I’m Syra. I can help with meals, task clarity, reflection, and resets." },
  ]);
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const drag = useRef({ active: false, moved: false });
  const lastUserMessage = useRef("");

  const hidden = useMemo(() => pathname?.startsWith("/login") || pathname?.startsWith("/signup"), [pathname]);

  useEffect(() => {
    function onMove(e) {
      if (!drag.current.active) return;
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 1) drag.current.moved = true;
      setPos((prev) => ({
        x: Math.max(12, Math.min(window.innerWidth - 72, prev.x - (e.movementX || 0))),
        y: Math.max(12, Math.min(window.innerHeight - 72, prev.y - (e.movementY || 0))),
      }));
    }

    function onUp() {
      drag.current.active = false;
      setTimeout(() => {
        drag.current.moved = false;
      }, 0);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const context = useMemo(() => formatContextFromData(data), [data]);

  const askSyra = useCallback(async (prompt, mode = "general") => {
    const message = String(prompt || input).trim();
    if (!message) return;
    if (!prompt) {
      setMessages((prev) => [...prev, { role: "user", text: message }]);
    }
    lastUserMessage.current = message;
    setInput("");
    setLoading(true);

    try {
      const json = await requestSyra({ message, mode, context });
      setMessages((prev) => [...prev, { role: "assistant", text: json.headline || "Done.", raw: json }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", text: error.message || "Syra is unavailable right now." }]);
    } finally {
      setLoading(false);
    }
  }, [context, input]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const nextMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: nextMessage }]);
    askSyra(nextMessage, "general");
  }, [askSyra, input]);

  if (hidden) return null;

  return (
    <>
      <div className={`syra-overlay ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
        <aside className={`syra-panel ${open ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
          <div className="syra-head">
            <div>
              <div className="syra-title">Syra</div>
              <div className="syra-sub">Calm support for logging, planning, and resets.</div>
            </div>
            <button className="syra-close" onClick={() => setOpen(false)} type="button">Close</button>
          </div>

          <div className="syra-chips">
            {QUICK_ACTIONS.map((chip) => (
              <button key={chip.label} type="button" className="syra-chip" onClick={() => askSyra(chip.prompt, chip.mode)}>{chip.label}</button>
            ))}
          </div>

          <div className="syra-demoRow">
            <button
              type="button"
              className="syra-chip subtle"
              onClick={() => {
                updateMany(createDemoWeekData());
                setMessages((prev) => [...prev, { role: "assistant", text: "Demo week loaded. You can now test reflection and reset actions with sample data." }]);
              }}
            >
              Load demo week data
            </button>
          </div>

          <div className="syra-thread">
            {messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={`syra-msg ${m.role}`}>
                {m.role === "assistant" ? <StructuredResponse message={m} onTaskAction={(mode) => askSyra(lastUserMessage.current, mode)} /> : <p>{m.text}</p>}
              </div>
            ))}
            {loading ? <div className="syra-msg assistant"><p>Syra is thinking…</p></div> : null}
          </div>

          <div className="syra-inputrow">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Syra anything…" className="syra-input" />
            <button type="button" className="syra-send" onClick={handleSend}>Send</button>
          </div>
        </aside>
      </div>

      <button
        type="button"
        className="syra-fab"
        style={{ right: `${pos.x}px`, bottom: `${pos.y}px` }}
        onPointerDown={() => {
          drag.current.active = true;
          drag.current.moved = false;
        }}
        onClick={() => {
          if (drag.current.moved) return;
          setOpen(true);
        }}
        aria-label="Open Syra"
      >
        <span className="syra-fabIcon">◌</span>
        <span>Syra</span>
      </button>
    </>
  );
}
