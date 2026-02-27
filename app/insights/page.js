"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useOnboarding } from "../context/OnboardingContext";
import "./page.css";

function clampNumber(v) {
  const n = Number(v);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function pct(val, goal) {
  if (!goal) return 0;
  return Math.max(0, Math.min(100, Math.round((val / goal) * 100)));
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function InsightsPage() {
  const router = useRouter();
  const { data } = useOnboarding();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [mode, setMode] = useState("coach");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

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

  const progress = {
    calories: pct(calories, calorieGoal),
    water: pct(waterLitres, waterGoal),
    steps: pct(steps, stepGoal),
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("insights_history_v1");
      const parsed = raw ? JSON.parse(raw) : [];
      setHistory(Array.isArray(parsed) ? parsed.slice(0, 5) : []);
    } catch {
      setHistory([]);
    }
  }, []);

  function saveHistory(item) {
    setHistory((prev) => {
      const next = [item, ...prev].slice(0, 5);
      localStorage.setItem("insights_history_v1", JSON.stringify(next));
      return next;
    });
  }

  async function askAi(customQuestion = null) {
    const finalQuestion = (customQuestion ?? question).trim();
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
          question: finalQuestion,
          mode,
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to get insight");
      setAnswer(payload);
      if (finalQuestion) {
        saveHistory({
          question: finalQuestion,
          mode,
          at: new Date().toISOString(),
          headline: payload?.fastWin?.headline || "Fast win",
        });
      }
    } catch (e) {
      setError(e?.message || "Could not get AI insight right now.");
    } finally {
      setLoading(false);
    }
  }

  function runQuickPrompt(text) {
    setQuestion(text);
    askAi(text);
  }

  function applyFastWin() {
    const action = answer?.fastWin?.action;
    if (!action) return;

    if (action.type === "walk") router.push("/hubs/fitness");
    else if (action.type === "logFood") router.push("/hubs/nutrition");
    else router.push("/dashboard");
  }

  return (
    <div className="ins-page">
      <div className="ins-shell">
        <header className="ins-top">
          <Link href="/dashboard" className="ins-back">← Dashboard</Link>
          <div className="ins-top-actions">
            <button className="ins-ghost" type="button" onClick={() => askAi()} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </header>

        <div className="ins-layout">
          <section className="ins-main card">
            <h1 className="ins-title">AI Insights</h1>
            <p className="ins-sub">Premium coaching, based on your live day data.</p>

            <div className="ins-row">
              <button className="ins-chip" type="button" onClick={() => runQuickPrompt("What should I do in the next 30 minutes to stay on track?")}>30-min plan</button>
              <button className="ins-chip" type="button" onClick={() => runQuickPrompt("How can I improve energy right now?")}>Energy reset</button>
              <button className="ins-chip" type="button" onClick={() => runQuickPrompt("What is the best fat-loss move for today?")}>Fat-loss move</button>
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
              placeholder="Ask anything about your day: performance, fat loss, consistency, or what to do next."
            />

            <div className="ins-actions">
              <button className="ins-btn" type="button" onClick={() => askAi()} disabled={loading}>
                {loading ? "Thinking…" : "Ask AI"}
              </button>
              {answer?.fastWin?.action ? (
                <button className="ins-btn secondary" type="button" onClick={applyFastWin}>
                  Apply fast win
                </button>
              ) : null}
            </div>

            {error ? <div className="ins-error">{error}</div> : null}

            {answer ? (
              <div className="ins-answer card-mini">
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
          </section>

          <aside className="ins-side card">
            <div className="side-title">Today Snapshot</div>

            <div className="metric-card">
              <div className="metric-head"><span>Calories</span><strong>{Math.round(calories)} / {Math.round(calorieGoal)}</strong></div>
              <div className="track"><div className="fill" style={{ width: `${progress.calories}%` }} /></div>
            </div>

            <div className="metric-card">
              <div className="metric-head"><span>Water</span><strong>{waterLitres.toFixed(1)}L / {waterGoal}L</strong></div>
              <div className="track"><div className="fill" style={{ width: `${progress.water}%` }} /></div>
            </div>

            <div className="metric-card">
              <div className="metric-head"><span>Steps</span><strong>{Math.round(steps)} / {Math.round(stepGoal)}</strong></div>
              <div className="track"><div className="fill" style={{ width: `${progress.steps}%` }} /></div>
            </div>

            <div className="side-title" style={{ marginTop: 14 }}>Recent prompts</div>
            {history.length ? (
              <div className="history-list">
                {history.map((item, idx) => (
                  <button key={`${item.question}-${idx}`} className="history-item" type="button" onClick={() => runQuickPrompt(item.question)}>
                    <div className="history-q">{item.question}</div>
                    <div className="history-meta">{item.mode} • {item.headline}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="history-empty">No recent prompts yet.</div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
