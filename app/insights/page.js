"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../context/OnboardingContext";
import { db } from "../firebase/config";
import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import {
  buildCoachSummary,
  buildPillarAnalytics,
  clampNumber,
  normalizeDailyTimeline,
} from "./analytics";
import "./page.css";

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function sparklinePath(series, width = 520, height = 140, pad = 12) {
  const safe = series.length ? series : [0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = Math.max(1, max - min);
  const points = safe.map((value, i) => {
    const x = pad + (i * (width - pad * 2)) / Math.max(1, safe.length - 1);
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return { x, y };
  });

  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
}

function Sparkline({ series }) {
  const d = sparklinePath(series);
  return (
    <svg className="line-chart" viewBox="0 0 520 140" aria-hidden="true">
      <g className="grid-lines">
        <line x1="12" y1="32" x2="508" y2="32" />
        <line x1="12" y1="64" x2="508" y2="64" />
        <line x1="12" y1="96" x2="508" y2="96" />
      </g>
      <line x1="12" y1="128" x2="508" y2="128" className="axis-line" />
      <path d={d} className="line-path" />
    </svg>
  );
}

async function fetchLastNDaysDaily(uid, n = 30) {
  if (!uid) return [];
  const ref = collection(db, "users", uid, "daily");
  const q = query(ref, orderBy(documentId(), "desc"), limit(n));
  const snap = await getDocs(q);

  const docs = [];
  snap.forEach((docSnap) =>
    docs.push({ dateISO: docSnap.id, ...(docSnap.data() || {}) }),
  );
  return docs;
}

export default function InsightsPage() {
  const router = useRouter();
  const { data, user: authUser, ready } = useOnboarding();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [days30, setDays30] = useState([]);

  const [coachOpen, setCoachOpen] = useState(false);
  const [coachMessages, setCoachMessages] = useState([
    {
      role: "assistant",
      text: "I can help prioritize one high-leverage move for today.",
    },
  ]);
  const [coachInput, setCoachInput] = useState("");
  const [coachTyping, setCoachTyping] = useState(false);
  const [coachError, setCoachError] = useState("");

  useEffect(() => {
    if (ready && !authUser) router.replace("/login");
  }, [ready, authUser, router]);

  const calorieGoal = clampNumber(data?.calorieGoal) || 1800;
  const stepGoal = clampNumber(data?.stepGoal) || 8000;
  const waterGoal = clampNumber(data?.waterGoalLitres) || 3;
  const proteinGoal =
    clampNumber(data?.macroGoals?.proteinG) || clampNumber(data?.proteinGoalG) || 120;

  useEffect(() => {
    let cancelled = false;

    async function loadTimeline() {
      if (!ready) return;
      if (!authUser?.uid) {
        if (!cancelled) setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError("");
      try {
        const fetched = await fetchLastNDaysDaily(authUser.uid, 30);
        if (!cancelled) setDays30(normalizeDailyTimeline(fetched, 30));
      } catch (e) {
        if (!cancelled) {
          setLoadError(e?.message || "Could not load analytics right now.");
          setDays30(normalizeDailyTimeline([], 30));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTimeline();
    return () => {
      cancelled = true;
    };
  }, [ready, authUser?.uid]);

  const analytics = useMemo(() => {
    const base = days30.length ? days30 : normalizeDailyTimeline([], 30);
    const week = base.slice(-7);
    const prevWeek = base.slice(-14, -7);
    const today = base[base.length - 1] || normalizeDailyTimeline([], 1)[0];

    const pillars = buildPillarAnalytics(base, {
      calorieGoal,
      stepGoal,
      waterGoal,
      proteinGoal,
    });

    const weeklyScore = Math.round(
      mean([
        pillars.move.weeklyAvg || 0,
        pillars.fuel.weeklyAvg || 0,
        pillars.recover.weeklyAvg || 0,
        pillars.mood.weeklyAvg || 0,
        pillars.habits.weeklyAvg || 0,
      ]),
    );

    const priorScore = Math.round(
      mean([
        pillars.move.prevWeekAvg || 0,
        pillars.fuel.prevWeekAvg || 0,
        pillars.recover.prevWeekAvg || 0,
        pillars.mood.prevWeekAvg || 0,
        pillars.habits.prevWeekAvg || 0,
      ]),
    );

    const coach = buildCoachSummary(pillars, base, { waterGoal });

    return {
      base,
      week,
      prevWeek,
      today,
      pillars,
      weeklyScore: Number.isFinite(weeklyScore) ? weeklyScore : null,
      weeklyDelta: Number.isFinite(weeklyScore - priorScore)
        ? weeklyScore - priorScore
        : null,
      coach,
      validDays30: base.filter((d) => !d.missing).length,
      caloriesSeries: base.map((d) => d.calories),
      stepsSeries: base.map((d) => d.steps),
      waterSeries: base.map((d) => d.waterMl / 1000),
      sleepSeries: base.map((d) => d.sleep.hours),
      moodSeries: base.map((d) => d.mood.rating),
      sleepAvgWeek:
        week.filter((d) => d.sleep.hours > 0).length > 0
          ? mean(
              week.filter((d) => d.sleep.hours > 0).map((d) => d.sleep.hours),
            )
          : null,
      moodAvgWeek:
        week.filter((d) => d.mood.rating > 0).length > 0
          ? mean(
              week.filter((d) => d.mood.rating > 0).map((d) => d.mood.rating),
            )
          : null,
    };
  }, [days30, calorieGoal, stepGoal, waterGoal, proteinGoal]);

  async function sendCoachMessage() {
    const message = coachInput.trim();
    if (!message || coachTyping) return;

    setCoachError("");
    setCoachInput("");
    setCoachMessages((prev) => [...prev, { role: "user", text: message }]);
    setCoachTyping(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: {
            name: data?.name || "friend",
            waterLitres: analytics.today.waterMl / 1000,
            waterGoal,
            steps: analytics.today.steps,
            stepGoal,
            calories: analytics.today.calories,
            calorieGoal,
            moodRating: Number(analytics.today?.mood?.rating || 0),
            sleepHours: Number(analytics.today?.sleep?.hours || 0),
            habitsRate: analytics.today?.habits?.total
              ? Math.round(
                  (Number(analytics.today.habits.completed || 0) /
                    Number(analytics.today.habits.total || 1)) *
                    100,
                )
              : 0,
          },
        }),
      });

      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload?.error || "Could not get coach response.");

      setCoachMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: payload?.reply || "Take one practical action now.",
        },
      ]);
    } catch (e) {
      setCoachError(e?.message || "Coach is unavailable right now.");
    } finally {
      setCoachTyping(false);
    }
  }

  const pillarCards = [
    {
      id: "move",
      key: "Move",
      stats: analytics.pillars.move,
      metric:
        analytics.pillars.move.weeklyAvg == null
          ? "Log steps/workouts"
          : `${Math.round(analytics.today.steps)} steps today`,
    },
    {
      id: "fuel",
      key: "Fuel",
      stats: analytics.pillars.fuel,
      metric:
        analytics.pillars.fuel.weeklyAvg == null
          ? "Log calories + hydration"
          : `${(analytics.today.waterMl / 1000).toFixed(1)}L water today`,
    },
    {
      id: "recover",
      key: "Recover",
      stats: analytics.pillars.recover,
      metric:
        analytics.sleepAvgWeek == null
          ? "Log sleep hours + bedtime"
          : `${analytics.sleepAvgWeek.toFixed(1)}h sleep avg`,
    },
    {
      id: "mood",
      key: "Mood",
      stats: analytics.pillars.mood,
      metric:
        analytics.moodAvgWeek == null
          ? "Log mood + stress"
          : `${analytics.moodAvgWeek.toFixed(1)}/5 mood avg`,
    },
    {
      id: "habits",
      key: "Habits",
      stats: analytics.pillars.habits,
      metric:
        analytics.pillars.habits.weeklyAvg == null
          ? "Log completed habits"
          : `${Math.round(analytics.pillars.habits.weeklyAvg)}% completion avg`,
    },
  ];

  const topLever = pillarCards
    .map((p) => ({
      ...p,
      score:
        p.stats.consistency7 / 7 +
        (p.stats.trend.label === "Improving" ? 0.2 : 0),
    }))
    .sort((a, b) => a.score - b.score)[0];

  const baselinePillars = pillarCards.filter(
    (p) => p.stats.consistency7 < 3,
  ).length;

  return (
    <div className="ins-page">
      <div className="ins-shell">
        <header className="ins-top">
          <Link href="/dashboard" className="ins-back">
            ← Dashboard
          </Link>
          <button
            className="ins-ghost"
            type="button"
            onClick={() => setCoachOpen(true)}
          >
            AI Coach
          </button>
        </header>

        <section className="card overview">
          <div>
            <h1 className="ins-title">Insights & Analysis</h1>
            <p className="ins-sub">
              Cross-hub clinical signal across Move, Fuel, Recover, Mood, and
              Habits.
            </p>
          </div>
          <div className="score-pill major">
            <span>Weekly ecosystem score</span>
            <strong>
              {analytics.weeklyScore == null
                ? "—"
                : `${analytics.weeklyScore}%`}
            </strong>
            <em>{analytics.coach?.heading || "Building baseline"}</em>
            <div className="score-subtext">
              {analytics.validDays30 < 7
                ? "Building baseline"
                : analytics.weeklyDelta == null
                  ? `${analytics.validDays30}/30 days logged`
                  : `${analytics.weeklyDelta >= 0 ? "+" : ""}${analytics.weeklyDelta} vs last week`}
            </div>
            <details className="score-breakdown">
              <summary>Pillar breakdown</summary>
              <div>
                Move:{" "}
                {analytics.pillars.move.weeklyAvg == null
                  ? "Building baseline"
                  : `${Math.round(analytics.pillars.move.weeklyAvg)}%`}
              </div>
              <div>
                Fuel:{" "}
                {analytics.pillars.fuel.weeklyAvg == null
                  ? "Building baseline"
                  : `${Math.round(analytics.pillars.fuel.weeklyAvg)}%`}
              </div>
              <div>
                Recover:{" "}
                {analytics.pillars.recover.weeklyAvg == null
                  ? "Building baseline"
                  : `${Math.round(analytics.pillars.recover.weeklyAvg)}%`}
              </div>
              <div>
                Mood:{" "}
                {analytics.pillars.mood.weeklyAvg == null
                  ? "Building baseline"
                  : `${Math.round(analytics.pillars.mood.weeklyAvg)}%`}
              </div>
              <div>
                Habits:{" "}
                {analytics.pillars.habits.weeklyAvg == null
                  ? "Building baseline"
                  : `${Math.round(analytics.pillars.habits.weeklyAvg)}%`}
              </div>
            </details>
          </div>
        </section>

        <section className="card coach-brain">
          <div className="side-title">Coach summary</div>
          <div className="suggestion-main">{analytics.coach.heading}</div>
          <div className="suggestion-sub">{analytics.coach.body}</div>
          <div className="risk-flag">Risk flag: {analytics.coach.risk}</div>
          <div className="suggestion-micro emphasis">
            Next best action: {analytics.coach.action}
          </div>
          <div className="coach-confidence">
            Confidence:{" "}
            {analytics.validDays30 < 10
              ? "Low – building baseline"
              : "Moderate"}
          </div>
        </section>

        {loadError ? <div className="load-error">{loadError}</div> : null}

        <section className="card pillars-wrap">
          <div className="pillars-head">
            <div className="card-title">Pillars</div>
            {baselinePillars > 0 ? (
              <div className="baseline-label">Baseline building</div>
            ) : null}
          </div>
          <div className="pillars-grid">
            {pillarCards.map((p) => (
              <div
                key={p.key}
                className={`pillar-card ${topLever?.id === p.id ? "top" : "quiet"}`}
              >
                <div className="pillar-head">
                  <span>{p.key}</span>
                  {topLever?.id === p.id ? (
                    <em className="top-lever-tag">Top lever</em>
                  ) : null}
                </div>
                <div className="pillar-consistency">
                  Weekly consistency: {p.stats.consistency7}/7
                </div>
                <div className="pillar-metric">{p.metric}</div>
                <div className="pillar-trend">Trend: {p.stats.trend.label}</div>
                {p.stats.consistency7 < 3 ? (
                  <div className="pillar-next">
                    Next: log this pillar 3+ days/week.
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <div className="ins-layout">
          <section className="card ins-main">
            <div className="graph-grid">
              {[
                { title: "Calories 30D", series: analytics.caloriesSeries },
                { title: "Steps 30D", series: analytics.stepsSeries },
                { title: "Water 30D", series: analytics.waterSeries },
              ].map((g) => (
                <div key={g.title} className="graph-card">
                  <div className="graph-head">
                    <span>{g.title}</span>
                  </div>
                  {loading ? (
                    <div className="skeleton chart" />
                  ) : (
                    <Sparkline series={g.series} />
                  )}
                </div>
              ))}
            </div>

            <div className="period-grid trend-mini-grid">
              <div className="period-card mini-trend">
                <div className="period-label">Sleep consistency</div>
                <div className="period-metric">
                  {analytics.pillars.recover.consistency7}/7 days logged
                </div>
                <div className="period-metric">
                  Bedtime consistency: {analytics.pillars.bedtimeConsistency}%
                </div>
                <Sparkline series={analytics.sleepSeries} />
              </div>

              <div className="period-card mini-trend">
                <div className="period-label">Mood average</div>
                <div className="period-metric">
                  {analytics.moodAvgWeek == null
                    ? "Building baseline"
                    : `${analytics.moodAvgWeek.toFixed(1)}/5 this week`}
                </div>
                <div className="period-metric">
                  Trend: {analytics.pillars.mood.trend.label}
                </div>
                <Sparkline series={analytics.moodSeries} />
              </div>
            </div>
          </section>
        </div>

        {coachOpen ? (
          <div className="coach-modal" onClick={() => setCoachOpen(false)}>
            <div className="coach-card" onClick={(e) => e.stopPropagation()}>
              <div className="coach-top">
                <div className="coach-title">AI Coach</div>
                <button
                  className="ins-ghost"
                  type="button"
                  onClick={() => setCoachOpen(false)}
                >
                  Close
                </button>
              </div>

              <div className="coach-chat">
                {coachMessages.map((msg, i) => (
                  <div
                    key={`${msg.role}-${i}`}
                    className={`coach-bubble ${msg.role === "user" ? "user" : "bot"}`}
                  >
                    {msg.text}
                  </div>
                ))}
                {coachTyping ? (
                  <div className="coach-typing">Typing…</div>
                ) : null}
              </div>

              {coachError ? (
                <div className="coach-error">{coachError}</div>
              ) : null}

              <form
                className="coach-inputRow"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await sendCoachMessage();
                }}
              >
                <input
                  className="coach-input"
                  type="text"
                  placeholder="Ask for cross-hub strategy..."
                  value={coachInput}
                  onChange={(e) => setCoachInput(e.target.value)}
                />
                <button
                  className="ins-btn"
                  type="submit"
                  disabled={coachTyping || !coachInput.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
