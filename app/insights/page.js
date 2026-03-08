"use client";

import BackButton from "../components/BackButton";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
} from "firebase/firestore";
import { useOnboarding } from "../context/OnboardingContext";
import { db } from "../firebase/config";
import { buildCoachSummary, buildPillarAnalytics, clampNumber, normalizeDailyTimeline } from "./analytics";
import { getInsightsLoadErrorMessage } from "../lib/firestoreErrors";
import "./page.css";

function getLastNDatesISO(n = 30) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (n - 1 - i));
    return d.toISOString().split("T")[0];
  });
}

function buildDailyQuery(uid) {
  const dates = getLastNDatesISO(30);
  const startDate = dates[0];
  return query(
    collection(db, "users", uid, "daily"),
    where("date", ">=", startDate),
    orderBy("date", "asc"),
    limit(30),
  );
}

function setInsightsLoadFailure(setError, setDays, error) {
  setError(getInsightsLoadErrorMessage(error));
  setDays(normalizeDailyTimeline([], 30));
}

async function fetchDaily(uid) {
  const q = buildDailyQuery(uid);
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => d.data());
  return normalizeDailyTimeline(docs, 30);
}


function MetricBarChart({ title, unit, labels, values, max = 1 }) {
  const safeMax = Math.max(1, max, ...values);
  return (
    <div className="graph-card detailed">
      <div className="graph-head">
        <span>{title}</span>
        <em>{unit}</em>
      </div>
      <div className="bar-chart">
        {values.map((v, i) => (
          <div key={`${title}-${i}`} className="bar-col">
            <div className="bar-value">{Math.round(v)}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${Math.max(6, (v / safeMax) * 100)}%` }} />
            </div>
            <div className="bar-label">{labels[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


function buildMockWeekTimeline() {
  const dates = getLastNDatesISO(30);
  return dates.map((dateISO, idx) => {
    const day = idx % 7;
    const steps = [6500, 8200, 9100, 7300, 10000, 11800, 5400][day];
    const waterMl = [1800, 2200, 2500, 2000, 2700, 3000, 1700][day];
    const calories = [1750, 1820, 1680, 1900, 1850, 2100, 1650][day];
    const proteinG = [95, 110, 105, 98, 120, 125, 90][day];
    const mood = [3, 4, 4, 3, 5, 4, 3][day];
    const sleepHours = [6.4, 7.1, 7.4, 6.8, 7.8, 8.0, 6.6][day];
    const habitsTotal = 5;
    const habitsDone = [3, 4, 4, 3, 5, 5, 2][day];

    return {
      dateISO,
      steps,
      waterMl,
      calories,
      macros: { proteinG, carbsG: 180, fatG: 60 },
      mood: { rating: mood },
      sleep: { hours: sleepHours },
      habits: { total: habitsTotal, completed: habitsDone },
      missing: false,
    };
  });
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

    if (user.uid === "e2e-user") {
      setDays(buildMockWeekTimeline());
      setError("");
      setLoading(false);
      return;
    }
    setError("");
    try {
      setDays(await fetchDaily(user.uid));
    } catch (e) {
      setInsightsLoadFailure(setError, setDays, e);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!ready || !user?.uid) return;

    if (user.uid === "e2e-user") {
      setDays(buildMockWeekTimeline());
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const q = buildDailyQuery(user.uid);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => d.data());
        setDays(normalizeDailyTimeline(docs, 30));
        setLoading(false);
      },
      (e) => {
        setInsightsLoadFailure(setError, setDays, e);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [ready, user?.uid]);

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

  const weeklySlice = useMemo(() => model.base.slice(-7), [model.base]);
  const weekdayLabels = useMemo(() => weeklySlice.map((d) => {
    const dt = new Date(`${d.dateISO}T00:00:00`);
    return dt.toLocaleDateString([], { weekday: "short" });
  }), [weeklySlice]);

  const dailyInsight = useMemo(() => {
    const today = model.base[model.base.length - 1] || {};
    const stepPct = stepGoal ? Math.round((Number(today.steps || 0) / stepGoal) * 100) : 0;
    const waterPct = waterGoal ? Math.round(((Number(today.waterMl || 0) / 1000) / waterGoal) * 100) : 0;
    return `Today: ${Number(today.steps || 0)} steps (${stepPct}%) • ${Math.round(Number(today.waterMl || 0) / 1000)}L water (${waterPct}%).`;
  }, [model.base, stepGoal, waterGoal]);

  const weeklyInsight = useMemo(() => {
    const w = weeklySlice;
    const avgSteps = w.length ? Math.round(w.reduce((a, b) => a + Number(b.steps || 0), 0) / w.length) : 0;
    const avgWater = w.length ? (w.reduce((a, b) => a + Number(b.waterMl || 0), 0) / w.length / 1000).toFixed(1) : "0.0";
    return `Weekly: avg ${avgSteps} steps/day and ${avgWater}L water/day across last 7 days.`;
  }, [weeklySlice]);

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
          <BackButton href="/dashboard" label="Dashboard" className="ins-back" />
          <div className="ins-top-actions">
            <button className="ins-ghost" type="button" onClick={refresh}>Refresh</button>
            <button className="ins-ghost" type="button" onClick={() => setCoachOpen(true)}>Syra</button>
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

        <section className="card insights-dual">
          <div className="insights-item">
            <div className="section-title">Daily Insight</div>
            <p className="ins-sub">{dailyInsight}</p>
          </div>
          <div className="insights-item">
            <div className="section-title">Weekly Insight</div>
            <p className="ins-sub">{weeklyInsight}</p>
          </div>
        </section>

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
              <div className="graph-card"><div className="graph-head"><span>Steps 30D trend</span></div>{loading ? <div className="skeleton chart" /> : <Sparkline series={model.base.map((d) => d.steps)} />}</div>
              <div className="graph-card"><div className="graph-head"><span>Water 30D trend</span></div>{loading ? <div className="skeleton chart" /> : <Sparkline series={model.base.map((d) => d.waterMl / 1000)} />}</div>
              {loading ? <div className="graph-card"><div className="skeleton chart" /></div> : <MetricBarChart title="Daily steps (7D)" unit="steps" labels={weekdayLabels} values={weeklySlice.map((d) => Number(d.steps || 0))} max={stepGoal} />}
              {loading ? <div className="graph-card"><div className="skeleton chart" /></div> : <MetricBarChart title="Daily water (7D)" unit="ml" labels={weekdayLabels} values={weeklySlice.map((d) => Number(d.waterMl || 0))} max={Math.max(1, waterGoal * 1000)} />}
            </div>
          </section>

          <section className="card coach-brain">
            <div className="coach-head">
              <h3 style={{ margin: 0 }}>Coach Summary</h3>
              <button className="ins-ghost" onClick={() => setCoachOpen(true)} type="button">Open Assistant</button>
            </div>
            <div className="coach-highlight">{model.coach.headline}</div>
            <div className="coach-grid">
              <div className="coach-chip"><strong>Top lever</strong><span>{model.coach.topLever || "Move"}</span></div>
              <div className="coach-chip"><strong>Priority risk</strong><span>{(model.coach.risks || ["Baseline still building"])[0]}</span></div>
              <div className="coach-chip"><strong>Action</strong><span>{model.coach.action}</span></div>
            </div>
          </section>
        </div>

        {coachOpen ? <div className="coach-modal" onClick={() => setCoachOpen(false)}><div className="coach-card" onClick={(e) => e.stopPropagation()}><div className="coach-top"><div className="coach-title">Syra</div><button className="ins-ghost" onClick={() => setCoachOpen(false)}>Close</button></div><div className="coach-bubble bot">{model.coach.headline} {model.coach.topLeverWhy} Next best action: {model.coach.action}. Ask Syra in Dashboard for tasks, daily focus, and weekly progress coaching.</div></div></div> : null}
      </div>
    </div>
  );
}
