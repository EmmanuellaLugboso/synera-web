"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useOnboarding } from "../context/OnboardingContext";
import { db } from "../firebase/config";
import {
  collection,
  doc,
  documentId,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import "./page.css";

function clampNumber(v) {
  const n = Number(v);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function clampPercent(v) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function getLastNDaysISO(n) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < n; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(d.toISOString().split("T")[0]);
  }
  return out;
}

async function fetchLastNDaysDaily(uid, n = 30) {
  if (!uid) return [];
  const ref = collection(db, "users", uid, "daily");
  const q = query(ref, orderBy(documentId(), "desc"), limit(n));
  const snap = await getDocs(q);

  console.log("[Insights] fetched daily docs count:", snap.size);

  const docs = [];
  snap.forEach((docSnap) => {
    const d = docSnap.data() || {};
    docs.push({
      dateISO: docSnap.id,
      calories: clampNumber(d.calories),
      steps: clampNumber(d.steps),
      waterMl: clampNumber(d.waterMl),
      missing: false,
    });
  });
  return docs;
}

function normalizeDailyTimeline(fetched, n = 30) {
  const wanted = getLastNDaysISO(n).reverse();
  const byDate = new Map(fetched.map((d) => [d.dateISO, d]));

  return wanted.map((dateISO) => {
    const found = byDate.get(dateISO);
    if (found) {
      return {
        dateISO,
        calories: clampNumber(found.calories),
        steps: clampNumber(found.steps),
        waterMl: clampNumber(found.waterMl),
        missing: false,
      };
    }
    return { dateISO, calories: 0, steps: 0, waterMl: 0, missing: true };
  });
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values, avg) {
  if (!values.length) return 0;
  const variance = values.reduce((s, v) => s + (v - avg) * (v - avg), 0) / values.length;
  return Math.sqrt(variance);
}

function computeTrend(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, label: "Building baseline" };

  const xVals = points.map((p) => p.index);
  const yVals = points.map((p) => p.value);
  const xMean = mean(xVals);
  const yMean = mean(yVals);

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xVals[i] - xMean;
    numerator += dx * (yVals[i] - yMean);
    denominator += dx * dx;
  }

  const slope = denominator ? numerator / denominator : 0;
  const threshold = Math.max(0.0001, Math.abs(yMean) * 0.01);

  if (slope > threshold) return { slope, label: "Improving" };
  if (slope < -threshold) return { slope, label: "Declining" };
  return { slope, label: "Stable" };
}

function computeStreaks(series, goal) {
  if (!goal) return { current: 0, best: 0 };

  let current = 0;
  for (let i = series.length - 1; i >= 0; i -= 1) {
    if (series[i] >= goal) current += 1;
    else break;
  }

  let best = 0;
  let run = 0;
  for (const v of series) {
    if (v >= goal) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  return { current, best };
}

function computeStats(days, selector, goal, minValidDays) {
  const mapped = days.map((d, index) => {
    const value = selector(d);
    return {
      index,
      value,
      valid: !d.missing || value > 0,
    };
  });

  const valid = mapped.filter((m) => m.valid);
  if (valid.length < minValidDays) {
    return {
      enoughData: false,
      validCount: valid.length,
      avg: null,
      adherence: null,
      consistency: null,
      trend: { slope: 0, label: "Building baseline" },
      streaks: { current: 0, best: 0 },
    };
  }

  const values = valid.map((v) => v.value);
  const avg = mean(values);
  const adherence = goal ? clampPercent((avg / goal) * 100) : null;
  const sd = stdDev(values, avg);
  const consistency = avg === 0 ? 0 : clampPercent(100 - (sd / avg) * 100);
  const trend = computeTrend(valid.map((v) => ({ index: v.index, value: v.value })));
  const streaks = computeStreaks(days.map((d) => selector(d)), goal);

  return {
    enoughData: true,
    validCount: valid.length,
    avg,
    adherence,
    consistency,
    trend,
    streaks,
  };
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

function StarterChart({ todayHasValue }) {
  return (
    <div className="starter-overlay">
      <div className="starter-baseline" />
      {todayHasValue ? <div className="starter-dot" /> : null}
      <div className="starter-copy">
        <div>No trend yet</div>
        <div>Log a few days to reveal patterns.</div>
      </div>
    </div>
  );
}

function formatAvg(value, fallbackToday, unit = "") {
  if (value == null) {
    if (fallbackToday > 0) {
      return unit ? `${fallbackToday.toFixed(1)}${unit} avg` : `${Math.round(fallbackToday)} avg`;
    }
    return "— avg";
  }
  return unit ? `${value.toFixed(1)}${unit} avg` : `${Math.round(value)} avg`;
}

export default function InsightsPage() {
  const { data, user: authUser, ready } = useOnboarding();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [days30, setDays30] = useState([]);

  const [coachOpen, setCoachOpen] = useState(false);
  const [coachMessages, setCoachMessages] = useState([
    { role: "assistant", text: "Hey — tell me what you need help with today." },
  ]);
  const [coachInput, setCoachInput] = useState("");
  const [coachTyping, setCoachTyping] = useState(false);
  const [coachError, setCoachError] = useState("");
  const [walkDone, setWalkDone] = useState(false);

  const calorieGoal = clampNumber(data?.calorieGoal) || 1800;
  const stepGoal = clampNumber(data?.stepGoal) || 8000;
  const waterGoal = clampNumber(data?.waterGoalLitres) || 3;

  useEffect(() => {
    let cancelled = false;

    async function loadTimeline() {
      if (!ready) return;

      if (!authUser?.uid) {
        if (!cancelled) {
          setDays30(normalizeDailyTimeline([], 30));
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setLoadError("");

      try {
        const fetched = await fetchLastNDaysDaily(authUser.uid, 30);
        const normalized = normalizeDailyTimeline(fetched, 30);
        if (!cancelled) setDays30(normalized);
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
    const priorWeek = base.slice(-14, -7);

    const today =
      base[base.length - 1] || {
        dateISO: todayISO(),
        calories: 0,
        steps: 0,
        waterMl: 0,
        missing: true,
      };

    const validDayFlag = (d) => !d.missing || d.calories > 0 || d.steps > 0 || d.waterMl > 0;
    const validDays30 = base.filter(validDayFlag).length;
    const validDays7 = week.filter(validDayFlag).length;

    const weekStats = {
      calories: computeStats(week, (d) => d.calories, calorieGoal, 4),
      steps: computeStats(week, (d) => d.steps, stepGoal, 4),
      water: computeStats(week, (d) => d.waterMl / 1000, waterGoal, 4),
    };

    const monthStats = {
      calories: computeStats(base, (d) => d.calories, calorieGoal, 10),
      steps: computeStats(base, (d) => d.steps, stepGoal, 10),
      water: computeStats(base, (d) => d.waterMl / 1000, waterGoal, 10),
    };

    const priorWeekStats = {
      calories: computeStats(priorWeek, (d) => d.calories, calorieGoal, 4),
      steps: computeStats(priorWeek, (d) => d.steps, stepGoal, 4),
      water: computeStats(priorWeek, (d) => d.waterMl / 1000, waterGoal, 4),
    };

    const weeklyScoreReady =
      weekStats.calories.enoughData && weekStats.steps.enoughData && weekStats.water.enoughData;

    let weeklyScore = null;
    let weeklyLabel = "Building baseline";
    let weeklyDelta = null;

    if (weeklyScoreReady) {
      const avgAdherence = mean([
        weekStats.calories.adherence || 0,
        weekStats.steps.adherence || 0,
        weekStats.water.adherence || 0,
      ]);
      const avgConsistency = mean([
        weekStats.calories.consistency || 0,
        weekStats.steps.consistency || 0,
        weekStats.water.consistency || 0,
      ]);
      weeklyScore = clampPercent(0.55 * avgAdherence + 0.45 * avgConsistency);

      const trends = [
        monthStats.calories.trend.label,
        monthStats.steps.trend.label,
        monthStats.water.trend.label,
      ];
      weeklyLabel =
        trends.filter((x) => x === "Improving").length >= 2
          ? "Improving"
          : trends.filter((x) => x === "Declining").length >= 2
            ? "Declining"
            : "Stable";

      const priorReady =
        priorWeekStats.calories.enoughData &&
        priorWeekStats.steps.enoughData &&
        priorWeekStats.water.enoughData;

      if (priorReady) {
        const priorAdherence = mean([
          priorWeekStats.calories.adherence || 0,
          priorWeekStats.steps.adherence || 0,
          priorWeekStats.water.adherence || 0,
        ]);
        const priorConsistency = mean([
          priorWeekStats.calories.consistency || 0,
          priorWeekStats.steps.consistency || 0,
          priorWeekStats.water.consistency || 0,
        ]);
        const priorScore = clampPercent(0.55 * priorAdherence + 0.45 * priorConsistency);
        weeklyDelta = weeklyScore - priorScore;
      }
    }

    return {
      base,
      today,
      validDays30,
      validDays7,
      caloriesSeries: base.map((d) => d.calories),
      stepsSeries: base.map((d) => d.steps),
      waterSeries: base.map((d) => d.waterMl / 1000),
      seriesValidDays: {
        calories: base.filter((d) => !d.missing || d.calories > 0).length,
        steps: base.filter((d) => !d.missing || d.steps > 0).length,
        water: base.filter((d) => !d.missing || d.waterMl > 0).length,
      },
      weekStats,
      monthStats,
      weeklyScore,
      weeklyLabel,
      weeklyDelta,
      starterMode: validDays7 < 4,
    };
  }, [days30, calorieGoal, stepGoal, waterGoal]);

  const coachSummary = useMemo(() => {
    if (analytics.starterMode) {
      return {
        heading: "Start simple. Build consistency.",
        body: "Log one metric per day for the next 4 days. That is enough to generate a real weekly signal.",
        micro: "Aim: 4 logged days. Any one metric counts.",
      };
    }

    const candidates = [
      {
        key: "Calories",
        adherence: analytics.weekStats.calories.adherence || 0,
        consistency: analytics.weekStats.calories.consistency || 0,
        trend: analytics.monthStats.calories.trend.label,
      },
      {
        key: "Steps",
        adherence: analytics.weekStats.steps.adherence || 0,
        consistency: analytics.weekStats.steps.consistency || 0,
        trend: analytics.monthStats.steps.trend.label,
      },
      {
        key: "Hydration",
        adherence: analytics.weekStats.water.adherence || 0,
        consistency: analytics.weekStats.water.consistency || 0,
        trend: analytics.monthStats.water.trend.label,
      },
    ]
      .map((c) => ({ ...c, limiting: Math.min(c.adherence, c.consistency) }))
      .sort((a, b) => a.limiting - b.limiting);

    const primary = candidates[0];

    const heading =
      primary.key === "Hydration"
        ? "Hydration is your limiting factor this week."
        : primary.key === "Steps"
          ? "Step consistency is your limiting factor this week."
          : "Calorie consistency is your limiting factor this week.";

    const body =
      primary.key === "Hydration"
        ? "Front-load water intake. Two 500ml blocks before lunch improves daily adherence."
        : primary.key === "Steps"
          ? "Anchor movement to fixed times. A short walk after lunch stabilizes your day."
          : "Pre-log dinner before 3pm. It reduces evening drift and improves consistency.";

    const micro =
      primary.key === "Hydration"
        ? "Commitment: 500ml before 10:30am each day."
        : primary.key === "Steps"
          ? "Commitment: 10-minute walk after lunch each day."
          : "Commitment: log dinner before first bite each day.";

    return { heading, body, micro };
  }, [analytics]);

  async function handleDrink500() {
    if (!authUser?.uid) return;

    const dateISO = todayISO();
    const ref = doc(db, "users", authUser.uid, "daily", dateISO);

    await setDoc(
      ref,
      {
        date: dateISO,
        calories: 0,
        steps: 0,
        waterMl: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await updateDoc(ref, {
      waterMl: increment(500),
      updatedAt: serverTimestamp(),
    });

    const fetched = await fetchLastNDaysDaily(authUser.uid, 30);
    setDays30(normalizeDailyTimeline(fetched, 30));
  }

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
          },
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Could not get coach response.");

      setCoachMessages((prev) => [
        ...prev,
        { role: "assistant", text: payload?.reply || "Take one practical action now." },
      ]);
    } catch (e) {
      setCoachError(e?.message || "Coach is unavailable right now.");
    } finally {
      setCoachTyping(false);
    }
  }

  return (
    <div className="ins-page">
      <div className="ins-shell">
        <header className="ins-top">
          <Link href="/dashboard" className="ins-back">← Dashboard</Link>
          <button className="ins-ghost" type="button" onClick={() => setCoachOpen(true)}>
            AI Coach
          </button>
        </header>

        <section className="card overview">
          <div>
            <h1 className="ins-title">Insights & Analysis</h1>
            <p className="ins-sub">Clinical progress review with practical guidance.</p>
          </div>

          <div className="score-pill major">
            <span>Weekly score</span>
            <strong>{analytics.weeklyScore == null ? "—" : `${analytics.weeklyScore}%`}</strong>
            <em>{analytics.weeklyScore == null ? "Building baseline" : analytics.weeklyLabel}</em>
            {analytics.weeklyScore == null ? (
              <>
                <div className="score-subtext">Need 4 logged days for a reliable weekly score.</div>
                <div className="unlock-mini">{Math.min(4, analytics.validDays7)} / 4 days logged</div>
                <div className="unlock-bar">
                  <div className="unlock-fill" style={{ width: `${(Math.min(4, analytics.validDays7) / 4) * 100}%` }} />
                </div>
              </>
            ) : analytics.weeklyDelta != null ? (
              <div className="score-subtext">
                {analytics.weeklyDelta >= 0 ? `+${analytics.weeklyDelta}` : `${analytics.weeklyDelta}`} vs last week
              </div>
            ) : null}
          </div>
        </section>

        <section className="card data-status">
          <div className="data-title">Data status</div>
          <div className="data-copy">30-day timeline started.</div>
          <div className="data-copy">{analytics.validDays30} / 30 days recorded.</div>
          <div className="unlock-bar">
            <div className="unlock-fill" style={{ width: `${(analytics.validDays30 / 30) * 100}%` }} />
          </div>
          <div className="data-foot">Weekly analysis activates after 4 valid days.</div>
        </section>

        {loadError ? <div className="load-error">{loadError}</div> : null}

        <div className="ins-layout">
          <section className="card ins-main">
            <div className="graph-grid">
              {[
                {
                  title: "Calories 30D",
                  avg: formatAvg(analytics.monthStats.calories.avg, analytics.today.calories),
                  series: analytics.caloriesSeries,
                  starter: analytics.seriesValidDays.calories < 2,
                  todayHasValue: analytics.today.calories > 0,
                },
                {
                  title: "Steps 30D",
                  avg: formatAvg(analytics.monthStats.steps.avg, analytics.today.steps),
                  series: analytics.stepsSeries,
                  starter: analytics.seriesValidDays.steps < 2,
                  todayHasValue: analytics.today.steps > 0,
                },
                {
                  title: "Water 30D",
                  avg: formatAvg(analytics.monthStats.water.avg, analytics.today.waterMl / 1000, "L"),
                  series: analytics.waterSeries,
                  starter: analytics.seriesValidDays.water < 2,
                  todayHasValue: analytics.today.waterMl > 0,
                },
              ].map((g) => (
                <div key={g.title} className="graph-card">
                  <div className="graph-head">
                    <span>{g.title}</span>
                    <strong>{g.avg}</strong>
                  </div>
                  {loading ? (
                    <div className="skeleton chart" />
                  ) : (
                    <div className="chart-wrap">
                      <Sparkline series={g.series} />
                      {g.starter ? <StarterChart todayHasValue={g.todayHasValue} /> : null}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="period-grid">
              <div className="period-card">
                <div className="period-label">This week</div>
                <div className="period-metric">{analytics.weekStats.steps.avg == null ? "— avg" : `${Math.round(analytics.weekStats.steps.avg)} steps avg`}</div>
                <div className="period-metric">{analytics.weekStats.water.avg == null ? "— avg" : `${analytics.weekStats.water.avg.toFixed(1)}L water avg`}</div>
                <div className="period-metric">{analytics.weekStats.calories.avg == null ? "— avg" : `${Math.round(analytics.weekStats.calories.avg)} kcal avg`}</div>
              </div>

              <div className="period-card">
                <div className="period-label">This month</div>
                <div className="period-metric">{analytics.monthStats.steps.avg == null ? "— avg" : `${Math.round(analytics.monthStats.steps.avg)} steps avg`}</div>
                <div className="period-metric">{analytics.monthStats.water.avg == null ? "— avg" : `${analytics.monthStats.water.avg.toFixed(1)}L water avg`}</div>
                <div className="period-metric">{analytics.monthStats.calories.avg == null ? "— avg" : `${Math.round(analytics.monthStats.calories.avg)} kcal avg`}</div>
              </div>
            </div>

            <div className="metric-list">
              <div className="metric-card">
                <div className="metric-head"><span>Calories consistency</span><strong>{analytics.monthStats.calories.consistency == null ? "—" : `${analytics.monthStats.calories.consistency}%`}</strong></div>
                <div className="track"><div className="fill" style={{ width: `${analytics.monthStats.calories.consistency || 0}%` }} /></div>
                <div className="trend-note">Trend: {analytics.monthStats.calories.trend.label}</div>
              </div>

              <div className="metric-card">
                <div className="metric-head"><span>Hydration adherence</span><strong>{analytics.weekStats.water.adherence == null ? "—" : `${analytics.weekStats.water.adherence}%`}</strong></div>
                <div className="track"><div className="fill" style={{ width: `${analytics.weekStats.water.adherence || 0}%` }} /></div>
                <div className="trend-note">Trend: {analytics.monthStats.water.trend.label}</div>
              </div>

              <div className="metric-card">
                <div className="metric-head"><span>Step consistency</span><strong>{analytics.monthStats.steps.consistency == null ? "—" : `${analytics.monthStats.steps.consistency}%`}</strong></div>
                <div className="track"><div className="fill" style={{ width: `${analytics.monthStats.steps.consistency || 0}%` }} /></div>
                <div className="trend-note">Trend: {analytics.monthStats.steps.trend.label}</div>
              </div>
            </div>
          </section>

          <aside className="ins-side card">
            <div className="side-title">Coach summary</div>
            <div className="suggestion-main">{coachSummary.heading}</div>
            <div className="suggestion-sub">{coachSummary.body}</div>

            {analytics.starterMode ? (
              <div className="starter-actions">
                <button className="starter-btn" type="button" onClick={handleDrink500}>500ml water now</button>
                <button className={walkDone ? "starter-btn done" : "starter-btn"} type="button" onClick={() => setWalkDone((v) => !v)}>
                  {walkDone ? "10-minute walk logged" : "10-minute walk after lunch"}
                </button>
                <Link className="starter-btn link" href="/hubs/nutrition">Log one meal</Link>
              </div>
            ) : null}

            <div className="suggestion-micro">{coachSummary.micro}</div>

            <div className="side-title side-gap">Today snapshot</div>
            <div className="metric-card compact"><div className="metric-head"><span>Calories</span><strong>{Math.round(analytics.today.calories)} / {Math.round(calorieGoal)}</strong></div></div>
            <div className="metric-card compact"><div className="metric-head"><span>Water</span><strong>{(analytics.today.waterMl / 1000).toFixed(1)}L / {waterGoal}L</strong></div></div>
            <div className="metric-card compact"><div className="metric-head"><span>Steps</span><strong>{Math.round(analytics.today.steps)} / {Math.round(stepGoal)}</strong></div></div>
          </aside>
        </div>

        {coachOpen ? (
          <div className="coach-modal" onClick={() => setCoachOpen(false)}>
            <div className="coach-card" onClick={(e) => e.stopPropagation()}>
              <div className="coach-top">
                <div className="coach-title">AI Coach</div>
                <button className="ins-ghost" type="button" onClick={() => setCoachOpen(false)}>Close</button>
              </div>

              <div className="coach-chat">
                {coachMessages.map((msg, i) => (
                  <div key={`${msg.role}-${i}`} className={`coach-bubble ${msg.role === "user" ? "user" : "bot"}`}>
                    {msg.text}
                  </div>
                ))}
                {coachTyping ? <div className="coach-typing">Typing…</div> : null}
              </div>

              {coachError ? <div className="coach-error">{coachError}</div> : null}

              <form className="coach-inputRow" onSubmit={async (e) => { e.preventDefault(); await sendCoachMessage(); }}>
                <input className="coach-input" type="text" placeholder="Ask for weekly strategy, habit fixes, or next move..." value={coachInput} onChange={(e) => setCoachInput(e.target.value)} />
                <button className="ins-btn" type="submit" disabled={coachTyping || !coachInput.trim()}>Send</button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
