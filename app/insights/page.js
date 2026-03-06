"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useOnboarding } from "../context/OnboardingContext";
import { db } from "../firebase/config";
import { buildCoachSummary, buildPillarAnalytics, clampNumber, normalizeDailyTimeline } from "./analytics";
import "./page.css";

function getLastNDatesISO(n = 30) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (n - 1 - i));
    return d.toISOString().split("T")[0];
  });
}

async function fetchDaily(uid) {
  const dates = getLastNDatesISO(30);
  const docs = await Promise.all(
    dates.map(async (dateISO) => {
      const snap = await getDoc(doc(db, "users", uid, "daily", dateISO));
      return { dateISO, ...(snap.exists() ? snap.data() : {}) };
    }),
  );
  return normalizeDailyTimeline(docs, 30);
}

function Sparkline({ series }) {
  const safe = series.length ? series : [0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = Math.max(1, max - min);
  const d = safe
    .map((v, i) => {
      const x = 10 + (i * 300) / Math.max(1, safe.length - 1);
      const y = 70 - ((v - min) / range) * 60;
      return `${i ? "L" : "M"}${x},${y}`;
    })
    .join(" ");
  return <svg viewBox="0 0 320 80" className="line-chart"><path d={d} /></svg>;
}

export default function InsightsPage() {
  const router = useRouter();
  const { ready, user, data } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState([]);
  const [coachOpen, setCoachOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  const refresh = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError("");
    try {
      setDays(await fetchDaily(user.uid));
    } catch (e) {
      // ✅ Catch Firestore index errors and show friendly message
      const errorMsg = e?.message || "";
      if (errorMsg.includes("index") || errorMsg.includes("composite") || errorMsg.includes("The query requires")) {
        setError("Insights are still syncing. Please try again in a moment.");
      } else {
        setError("Couldn't load insights. Please refresh.");
      }
      setDays(normalizeDailyTimeline([], 30));
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (ready && user?.uid) refresh();
  }, [ready, user?.uid, refresh]);

  const stepGoal = clampNumber(data?.stepGoal) || 8000;
  const calorieGoal = clampNumber(data?.calorieGoal) || 1800;
  const waterGoal = clampNumber(data?.waterGoalLitres) || 3;
  const proteinGoal = clampNumber(data?.macroGoals?.proteinG) || 120;

  const model = useMemo(() => {
    const base = days.length ? days : normalizeDailyTimeline([], 30);
    const pillars = buildPillarAnalytics(base, { stepGoal, calorieGoal, waterGoal, proteinGoal });
    const pillarValues = [pillars.move, pillars.fuel, pillars.recover, pillars.mood, pillars.habits]
      .map((p) => p.weeklyAvg)
      .filter((v) => Number.isFinite(v));
    const weeklyScore = pillarValues.length ? Math.round(pillarValues.reduce((a, b) => a + b, 0) / pillarValues.length) : null;
    const validDays = base.filter((d) => !d.missing).length;
    const coach = buildCoachSummary(pillars, base, { waterGoal });
    return { base, pillars, weeklyScore, validDays, coach };
  }, [days, stepGoal, calorieGoal, waterGoal, proteinGoal]);

  const cards = [
    ["Move", "move", "Log steps or a workout"],
    ["Fuel", "fuel", "Log calories or meal"],
    ["Recover", "recover", "Log bedtime or sleep"],
    ["Mood", "mood", "Log mood once"],
    ["Habits", "habits", "Mark one habit complete"],
  ];

  return (
    <div className="ins-page">
      <div className="ins-shell">
        <header className="ins-top">
          <Link href="/dashboard" className="ins-back">← Dashboard</Link>
          <div className="ins-top-actions">
            <button className="ins-ghost" type="button" onClick={refresh}>Refresh</button>
            <button className="ins-ghost" type="button" onClick={() => setCoachOpen(true)}>AI Coach</button>
          </div>
        </header>

        <section className="card overview">
          <div>
            <h1 className="ins-title">Insights & Analysis</h1>
            <p className="ins-sub">Cross-hub signal across Move, Fuel, Recover, Mood, and Habits.</p>
          </div>
          <div className="score-pill major">
            <span>Weekly ecosystem score</span>
            <strong>{model.weeklyScore == null ? "—" : `${model.weeklyScore}%`}</strong>
            <em>{model.validDays < 4 ? "Building baseline" : model.coach.headline}</em>
          </div>
        </section>

        {error ? <div className="load-error">{error}</div> : null}

        {model.validDays < 4 ? (
          <section className="card baseline-card">
            <div className="baseline-title">Building baseline</div>
            <div>{model.validDays}/4 valid days logged to unlock weekly score</div>
            <div className="plan-progress-track"><div className="plan-progress-fill" style={{ width: `${Math.min(100, (model.validDays / 4) * 100)}%` }} /></div>
            <p>Log any 1 metric per day for 4 days to unlock weekly insights.</p>
          </section>
        ) : null}

        <section className="card pillars-wrap">
          <div className="pillars-grid">
            {cards.map(([label, key, hint]) => {
              const stat = model.pillars[key.toLowerCase()];
              return (
                <div key={key} className="pillar-card">
                  <div className="pillar-head"><span>{label}</span><em>{stat.consistency7}/7 logged</em></div>
                  <div className="pillar-trend">{stat.validCount < 4 ? "Building baseline" : stat.trend.label}</div>
                  <div className="pillar-next">Next log: {hint}</div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="ins-layout">
          <section className="card ins-main">
            <div className="graph-grid">
              <div className="graph-card"><div className="graph-head"><span>Steps 30D</span></div>{loading ? <div className="skeleton chart" /> : <Sparkline series={model.base.map((d) => d.steps)} />}</div>
              <div className="graph-card"><div className="graph-head"><span>Water 30D</span></div>{loading ? <div className="skeleton chart" /> : <Sparkline series={model.base.map((d) => d.waterMl / 1000)} />}</div>
            </div>
          </section>

          <section className="card coach-brain">
            <div className="side-title">Coach Summary</div>
            <div className="suggestion-main">Top lever right now: {model.coach.topLever || "Move"}</div>
            <div className="risk-flag">Risk: {(model.coach.risks || ["Baseline still building"])[1] || (model.coach.risks || ["Baseline still building"])[0]}</div>
            <div className="suggestion-sub">Next best action: {model.coach.action}</div>
          </section>
        </div>

        {coachOpen ? <div className="coach-modal" onClick={() => setCoachOpen(false)}><div className="coach-card" onClick={(e) => e.stopPropagation()}><div className="coach-top"><div className="coach-title">AI Coach</div><button className="ins-ghost" onClick={() => setCoachOpen(false)}>Close</button></div><div className="coach-bubble bot">{model.coach.headline} {model.coach.topLeverWhy} Next best action: {model.coach.action}</div></div></div> : null}
      </div>
    </div>
  );
}
