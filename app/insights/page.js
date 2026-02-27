"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useOnboarding } from "../context/OnboardingContext";
import "./page.css";

function clampNumber(v) {
  const n = Number(v);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function InsightsPage() {
  const { data } = useOnboarding();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [mode, setMode] = useState("coach");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const date = todayISO();

  const calories = useMemo(() => {
    const logs = Array.isArray(data?.foodLogs) ? data.foodLogs : [];
    const todays = logs.filter((x) => x?.date === date);
    return todays.reduce((sum, entry) => sum + clampNumber(entry?.totals?.calories), 0);
  }, [data?.foodLogs, date]);

  const steps = useMemo(() => {
    const log = Array.isArray(data?.stepsLog) ? data.stepsLog : [];
    const found = log.find((x) => x?.date === date);
    return clampNumber(found?.steps);
  }, [data?.stepsLog, date]);

  const waterLitres = clampNumber(data?.waterTodayLitres);
  const waterGoal = clampNumber(data?.waterGoalLitres) || 3;
  const stepGoal = clampNumber(data?.stepGoal) || 8000;
  const calorieGoal = clampNumber(data?.calorieGoal) || 1800;

  async function askAi() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waterLitres,
          waterGoal,
          steps,
          stepGoal,
          calories,
          calorieGoal,
          question,
          mode,
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to get insight");
      setAnswer(payload);
    } catch (e) {
      setError(e?.message || "Could not get AI insight right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ins-page">
      <div className="ins-top">
        <Link href="/dashboard" className="ins-back">← Dashboard</Link>
      </div>

      <h1 className="ins-title">AI Insights</h1>
      <p className="ins-sub">Ask Synera for a focused recommendation based on your current day.</p>

      <div className="ins-card">
        <div className="ins-grid">
          <div className="ins-metric"><span>Calories</span><strong>{Math.round(calories)}</strong></div>
          <div className="ins-metric"><span>Water</span><strong>{waterLitres.toFixed(1)}L</strong></div>
          <div className="ins-metric"><span>Steps</span><strong>{Math.round(steps)}</strong></div>
        </div>

        <div className="ins-row">
          <button className="ins-chip" type="button" onClick={() => setQuestion("What should I do in the next 30 minutes to stay on track?")}>30-min plan</button>
          <button className="ins-chip" type="button" onClick={() => setQuestion("How can I improve energy right now?")}>Energy reset</button>
          <button className="ins-chip" type="button" onClick={() => setQuestion("What is the best fat-loss move for today?")}>Fat-loss move</button>
        </div>

        <div className="ins-mode">
          <span>Tone</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="coach">Coach</option>
            <option value="strict">Strict</option>
            <option value="kind">Kind</option>
          </select>
        </div>

        <textarea
          className="ins-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What should I do in the next 30 minutes to stay on track?"
        />

        <button className="ins-btn" type="button" onClick={askAi} disabled={loading}>
          {loading ? "Thinking…" : "Ask AI"}
        </button>

        {error ? <div className="ins-error">{error}</div> : null}
      </div>

      {answer ? (
        <div className="ins-card">
          <div className="ins-kicker">{answer?.fastWin?.kicker || "FAST WIN"}</div>
          <h2 className="ins-headline">{answer?.fastWin?.headline}</h2>
          <p className="ins-text">{answer?.fastWin?.text}</p>
          <p className="ins-coach">{answer?.aiReply || answer?.coachMessage}</p>
          {Array.isArray(answer?.nextActions) ? (
            <ul className="ins-list">
              {answer.nextActions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
