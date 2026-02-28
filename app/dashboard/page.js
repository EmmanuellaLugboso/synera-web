"use client";

import "./dashboard.css";
import Link from "next/link";
import { useOnboarding } from "../context/OnboardingContext";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { db, auth } from "../firebase/config";
import { signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";

/* ------------------------
   helpers
------------------------ */
function todayISO() {
  return new Date().toISOString().split("T")[0];
}
function clampNumber(value) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}
function pct(val, goal) {
  const v = clampNumber(val);
  const g = clampNumber(goal);
  if (!g) return 0;
  return Math.max(0, Math.min(100, Math.round((v / g) * 100)));
}
function formatK(n) {
  const num = clampNumber(n);
  if (num >= 10000) return `${(num / 1000).toFixed(1)}k`;
  return `${Math.round(num)}`;
}
function formatTimeShort(d) {
  if (!(d instanceof Date)) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

/* ------------------------
   Simple inline SVG icons
------------------------ */
function HubIcon({ name }) {
  switch (name) {
    case "fitness":
      return (
        <svg className="hub-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 10h10M6 8v8M18 8v8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M4.5 9.2h1.2a1.3 1.3 0 0 1 1.3 1.3v3a1.3 1.3 0 0 1-1.3 1.3H4.5
               M19.5 9.2h-1.2a1.3 1.3 0 0 0-1.3 1.3v3a1.3 1.3 0 0 0 1.3 1.3h1.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "nutrition":
      return (
        <svg className="hub-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 3v8M10 3v8M13 3v8M8.5 11v10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M16 3c1.7 2 1.7 4.2 0 6.2V21"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "mind":
      return (
        <svg className="hub-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 21s-7-4.6-7-10.4A4.1 4.1 0 0 1 9.1 6.5c1.2 0 2.2.5 2.9 1.3.7-.8 1.7-1.3 2.9-1.3A4.1 4.1 0 0 1 19 10.6C19 16.4 12 21 12 21Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "lifestyle":
      return (
        <svg className="hub-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2v2M12 20v2M4 12H2M22 12h-2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M7.2 7.2l-1.4-1.4M18.2 18.2l-1.4-1.4M16.8 7.2l1.4-1.4M5.8 18.2l1.4-1.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M12 6.8A5.2 5.2 0 1 0 17.2 12 5.2 5.2 0 0 0 12 6.8Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          />
        </svg>
      );
    default:
      return null;
  }
}

export default function Dashboard() {
  const router = useRouter();
  const { data, ready, user: authUser } = useOnboarding();

  const date = todayISO();
  const greeting = getGreeting();
  const username = data?.name?.trim() || "Friend";
  const email = authUser?.email || "";

  const [daily, setDaily] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightActionLoading, setInsightActionLoading] = useState(false);
  const [insightError, setInsightError] = useState("");
  const [insightStatus, setInsightStatus] = useState("");
  const [insightUpdatedAt, setInsightUpdatedAt] = useState(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachMessages, setCoachMessages] = useState([
    { role: "assistant", text: "Hey — tell me what you need help with today." },
  ]);
  const [coachInput, setCoachInput] = useState("");
  const [coachTyping, setCoachTyping] = useState(false);
  const [coachError, setCoachError] = useState("");

  useEffect(() => {
    if (ready && !authUser) router.push("/login");
  }, [ready, authUser, router]);

  useEffect(() => {
    async function ensureDailyDoc() {
      if (!ready || !authUser) return;

      setDailyLoading(true);

      const ref = doc(db, "users", authUser.uid, "daily", date);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        const starterPlan = [
          { id: "water500", text: "Drink 500ml water now.", done: false },
          { id: "logmeal1", text: "Log your first meal (anything counts).", done: false },
          { id: "walk10", text: "10-min walk = easy step bump.", done: false },
        ];

        await setDoc(ref, {
          date,
          waterMl: 0,
          steps: 0,
          calories: 0,
          plan: starterPlan,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const snap2 = await getDoc(ref);
      setDaily(snap2.data());
      setDailyLoading(false);
    }

    ensureDailyDoc();
  }, [ready, authUser, date]);

  async function addWater(ml) {
    if (!authUser) return;
    const ref = doc(db, "users", authUser.uid, "daily", date);

    await updateDoc(ref, {
      waterMl: increment(ml),
      updatedAt: serverTimestamp(),
    });

    setDaily((prev) => ({ ...(prev || {}), waterMl: (prev?.waterMl || 0) + ml }));
  }

  async function togglePlanItem(itemId) {
    if (!authUser) return;

    const current = Array.isArray(daily?.plan) ? daily.plan : [];
    const next = current.map((p) => (p.id === itemId ? { ...p, done: !p.done } : p));

    const ref = doc(db, "users", authUser.uid, "daily", date);
    await updateDoc(ref, { plan: next, updatedAt: serverTimestamp() });

    setDaily((prev) => ({ ...(prev || {}), plan: next }));
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (e) {
      console.log("LOGOUT ERROR:", e);
      alert(e?.message || "Logout failed.");
    }
  }

  const calorieGoal = clampNumber(data?.calorieGoal) || 1800;

  const todaysFoodLogs = useMemo(() => {
    const logs = Array.isArray(data?.foodLogs) ? data.foodLogs : [];
    return logs.filter((x) => x?.date === date);
  }, [data?.foodLogs, date]);

  const caloriesToday = useMemo(() => {
    const fromDaily = clampNumber(daily?.calories);
    if (fromDaily) return fromDaily;

    let sum = 0;
    for (const entry of todaysFoodLogs) sum += clampNumber(entry?.totals?.calories);
    return Math.round(sum);
  }, [daily?.calories, todaysFoodLogs]);

  const calRemaining = Math.max(0, calorieGoal - caloriesToday);
  const calPct = pct(caloriesToday, calorieGoal);

  const stepGoal = clampNumber(data?.stepGoal) || 8000;

  const stepsToday = useMemo(() => {
    const fromDaily = clampNumber(daily?.steps);
    if (fromDaily) return fromDaily;

    const log = Array.isArray(data?.stepsLog) ? data.stepsLog : [];
    const found = log.find((x) => x?.date === date);
    return clampNumber(found?.steps);
  }, [daily?.steps, data?.stepsLog, date]);

  const stepsPct = pct(stepsToday, stepGoal);

  const waterGoal = clampNumber(data?.waterGoalLitres) || 3;
  const waterMl = clampNumber(daily?.waterMl);
  const waterLitres = waterMl / 1000;
  const waterPct = pct(waterLitres, waterGoal);

  const planItems = Array.isArray(daily?.plan) ? daily.plan : [];
  const completedPlanCount = planItems.filter((item) => item?.done).length;
  const nextPlanId = planItems.find((item) => !item?.done)?.id || null;

  const loadInsights = useCallback(async (forceRefresh = false) => {
    if (!ready || !authUser) return;

    setInsightLoading(true);
    setInsightError("");

    try {
      if (!forceRefresh && daily?.insight) {
        setInsight(daily.insight);
        setInsightUpdatedAt(new Date());
        return;
      }

      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waterLitres,
          waterGoal,
          steps: stepsToday,
          stepGoal,
          calories: caloriesToday,
          calorieGoal,
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to load insights");

      const nextInsight = payload?.insight;
      if (!nextInsight) throw new Error("Insight payload missing");

      const ref = doc(db, "users", authUser.uid, "daily", date);
      await updateDoc(ref, {
        insight: {
          kicker: nextInsight.kicker,
          headline: nextInsight.headline,
          text: nextInsight.text,
          action: nextInsight.action || null,
          createdAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });

      setInsight(nextInsight);
      setDaily((prev) => ({ ...(prev || {}), insight: nextInsight }));
      setInsightUpdatedAt(new Date());
    } catch (e) {
      setInsightError(e?.message || "Could not load insights right now.");
    } finally {
      setInsightLoading(false);
    }
  }, [ready, authUser, daily?.insight, waterLitres, waterGoal, stepsToday, stepGoal, caloriesToday, calorieGoal, date]);

  useEffect(() => {
    if (!ready || !authUser || dailyLoading) return;
    loadInsights(false);
  }, [ready, authUser, dailyLoading, loadInsights]);

  async function handleInsightAction() {
    const action = insight?.action;
    if (!action || action.type !== "water" || insightActionLoading) return;

    setInsightActionLoading(true);
    setInsightStatus("");

    try {
      const amount = action.amountMl || 500;
      await addWater(amount);
      setInsightStatus(`Done: added ${amount}ml water.`);
    } catch (e) {
      setInsightError(e?.message || "Could not apply fast win right now.");
    } finally {
      setInsightActionLoading(false);
    }
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
            name: username,
            waterLitres,
            waterGoal,
            steps: stepsToday,
            stepGoal,
            calories: caloriesToday,
            calorieGoal,
          },
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Could not get coach response.");

      setCoachMessages((prev) => [...prev, { role: "assistant", text: payload?.reply || "One small action now. You’ve got this." }]);
    } catch (e) {
      setCoachError(e?.message || "Coach is unavailable right now.");
    } finally {
      setCoachTyping(false);
    }
  }
  const hubChips = {
    fitness: [
      { label: "Steps", value: formatK(stepsToday) },
      { label: "Goal", value: formatK(stepGoal) },
    ],
    nutrition: [
      { label: "Today", value: `${formatK(caloriesToday)} kcal` },
      { label: "Left", value: `${formatK(calRemaining)} kcal` },
    ],
    mind: [
      { label: "Mood", value: "—" },
      { label: "Sleep", value: "—" },
    ],
    lifestyle: [
      { label: "Streak", value: "—" },
      { label: "Focus", value: "—" },
    ],
  };

  return (
    <div className="dash-page">
      {/* Top bar */}
      <div className="dash-topbar">
        <div className="dash-topbar-inner">
          <div className="dash-topbar-left">
            <div className="brand-badge" aria-hidden />
            <div className="brand-copy">
              <div className="brand-name">Synera</div>
              <div className="brand-sub">Daily dashboard</div>
            </div>
          </div>

          <div className="dash-topbar-mid">
            <div className="date-pill">
              <span className="date-pill-label">Today</span>
              <span className="date-pill-dot">•</span>
              <span className="date-pill-date">{date}</span>
            </div>
            <div className="thin-progress" aria-hidden>
              <div className="thin-progress-fill" style={{ width: `${calPct}%` }} />
            </div>
          </div>

          <div className="dash-topbar-right">
            <button className="icon-btn" type="button" aria-label="Timer">⏱</button>
            <button className="icon-btn" type="button" aria-label="Alerts">🔔</button>
            <button className="icon-btn" type="button" aria-label="Settings">⚙️</button>

            <button className="dash-btn" type="button" onClick={() => setCoachOpen(true)}>AI Coach</button>
            <Link className="dash-btn" href="/hubs/nutrition">Log food</Link>
            <Link className="dash-btn primary" href="/hubs/fitness">Log workout</Link>
          </div>
        </div>
      </div>

      <div className="dash-shell">
        {!ready ? <div className="dash-loading">Loading your data…</div> : null}
        {dailyLoading ? <div className="dash-loading">Loading today’s log…</div> : null}

        <div className="dash-grid">
          {/* Hero */}
          <section className="card hero">
            <div className="hero-top">
              <div className="hero-title">
                <div className="hero-greeting">{greeting},</div>
                <div className="hero-name">
                  <span className="accent">{username}</span>
                </div>
              </div>

              <div className="mini-user">
                <div className="mini-user-avatar" aria-hidden />
                <div className="mini-user-copy">
                  <div className="mini-user-name">{username}</div>
                  <div className="mini-user-email" title={email}>
                    {email || "—"}
                  </div>
                </div>

                {/* ✅ Controls: settings + logout */}
                <div className="mini-user-actions">
                  <button className="mini-user-gear" type="button" aria-label="Open settings">
                    ⚙️
                  </button>
                  <button
                    className="mini-user-logout"
                    type="button"
                    onClick={handleLogout}
                    aria-label="Log out"
                    title="Log out"
                  >
                    ⎋
                  </button>
                </div>
              </div>
            </div>

            <div className="hero-sub">Clean overview. Calm progress. Premium vibes.</div>

            <div className="mini-kpis">
              <div className="mini-kpi">
                <div className="mini-kpi-label">Calories</div>
                <div className="mini-kpi-big">{formatK(caloriesToday)}</div>
                <div className="mini-kpi-sub">{formatK(calRemaining)} kcal left</div>
              </div>

              <div className="mini-kpi">
                <div className="mini-kpi-label">Steps</div>
                <div className="mini-kpi-big">{formatK(stepsToday)}</div>
                <div className="mini-kpi-sub">{stepsPct}% of goal</div>
              </div>

              <div className="mini-kpi">
                <div className="mini-kpi-label">Water</div>
                <div className="mini-kpi-big">{waterLitres.toFixed(1)}L</div>
                <div className="mini-kpi-sub">{waterPct}% of goal</div>
              </div>
            </div>

            <div className="hero-actions">
              <button className="pill-btn" type="button" onClick={() => addWater(250)}>
                + 250ml water
              </button>
              <button className="pill-btn primary" type="button" onClick={() => addWater(500)}>
                + 500ml
              </button>
            </div>

            <div className="hero-note">Quick actions are placeholders — we’ll wire to logs next.</div>
          </section>

          {/* Profile */}
          <section className="card profile">
            <div className="card-head">
              <div>
                <div className="card-title">Profile</div>
                <div className="card-sub">Your setup</div>
              </div>
              <Link className="pill-link" href="/onboarding">Edit</Link>
            </div>

            <div className="profile-user">
              <div className="profile-avatar" aria-hidden />
              <div className="profile-copy">
                <div className="profile-name">{username}</div>
                <div className="profile-email" title={email}>
                  {email || "—"}
                </div>
              </div>
            </div>

            <div className="profile-grid">
              <div className="profile-field">
                <div className="profile-field-label">Height</div>
                <div className="profile-field-value">{data?.height || "—"}</div>
              </div>
              <div className="profile-field">
                <div className="profile-field-label">Weight</div>
                <div className="profile-field-value">{data?.weight || "—"}</div>
              </div>
              <div className="profile-field wide">
                <div className="profile-field-label">Focus</div>
                <div className="profile-field-value">
                  {Array.isArray(data?.focus) && data.focus.length ? data.focus.join(", ") : "—"}
                </div>
              </div>
            </div>
          </section>

          {/* Hubs */}
          <section className="card hubs">
            <div className="card-head">
              <div>
                <div className="card-title">Hubs</div>
                <div className="card-sub">Pick a lane. No clutter.</div>
              </div>
            </div>

            <div className="hub-grid">
              <Link href="/hubs/fitness" className="hub-card white">
                <div className="hub-left">
                  <div className="hub-iconWrap">
                    <HubIcon name="fitness" />
                  </div>
                </div>
                <div className="hub-body">
                  <div className="hub-rowTop">
                    <div className="hub-name">Fitness</div>
                    <div className="hub-pill">Open</div>
                  </div>
                  <div className="hub-desc">Workouts • Steps</div>

                  <div className="hub-chips">
                    {hubChips.fitness.map((c) => (
                      <div key={c.label} className="hub-chip">
                        <span className="hub-chip-label">{c.label}</span>
                        <span className="hub-chip-value">{c.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hub-arrow" aria-hidden>→</div>
              </Link>

              <Link href="/hubs/nutrition" className="hub-card white">
                <div className="hub-left">
                  <div className="hub-iconWrap">
                    <HubIcon name="nutrition" />
                  </div>
                </div>
                <div className="hub-body">
                  <div className="hub-rowTop">
                    <div className="hub-name">Nutrition</div>
                    <div className="hub-pill">Open</div>
                  </div>
                  <div className="hub-desc">Meals • Hydration</div>

                  <div className="hub-chips">
                    {hubChips.nutrition.map((c) => (
                      <div key={c.label} className="hub-chip">
                        <span className="hub-chip-label">{c.label}</span>
                        <span className="hub-chip-value">{c.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hub-arrow" aria-hidden>→</div>
              </Link>

              <Link href="/hubs/mind-sleep" className="hub-card white">
                <div className="hub-left">
                  <div className="hub-iconWrap">
                    <HubIcon name="mind" />
                  </div>
                </div>
                <div className="hub-body">
                  <div className="hub-rowTop">
                    <div className="hub-name">Mind & Sleep</div>
                    <div className="hub-pill">Open</div>
                  </div>
                  <div className="hub-desc">Mood • Sleep</div>

                  <div className="hub-chips">
                    {hubChips.mind.map((c) => (
                      <div key={c.label} className="hub-chip">
                        <span className="hub-chip-label">{c.label}</span>
                        <span className="hub-chip-value">{c.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hub-arrow" aria-hidden>→</div>
              </Link>

              <Link href="/hubs/lifestyle" className="hub-card white">
                <div className="hub-left">
                  <div className="hub-iconWrap">
                    <HubIcon name="lifestyle" />
                  </div>
                </div>
                <div className="hub-body">
                  <div className="hub-rowTop">
                    <div className="hub-name">Lifestyle</div>
                    <div className="hub-pill">Open</div>
                  </div>
                  <div className="hub-desc">Habits • Routine</div>

                  <div className="hub-chips">
                    {hubChips.lifestyle.map((c) => (
                      <div key={c.label} className="hub-chip">
                        <span className="hub-chip-label">{c.label}</span>
                        <span className="hub-chip-value">{c.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hub-arrow" aria-hidden>→</div>
              </Link>
            </div>
          </section>

          {/* Insights */}
          <section className="card insights">
            <div className="card-head insight-head-row">
              <div>
                <div className="card-title">Insights</div>
                <div className="card-sub">Today’s coaching signal</div>
              </div>
              <Link className="insight-link" href="/insights">Full analysis</Link>
            </div>

            <div className="insight-main">
              <div className="insight-kicker">{insight?.kicker || "COACH SIGNAL"}</div>
              <div className="insight-headline">
                {insight?.headline || "Hydration is the fastest ROI."}
              </div>
              <div className="insight-text">
                {insight?.text || "Take one small action now. The next decision gets easier."}
              </div>
              {insight?.action?.type === "water" ? (
                <button
                  className="insight-primary-action"
                  type="button"
                  onClick={handleInsightAction}
                  disabled={insightLoading || insightActionLoading}
                >
                  {insightActionLoading ? "Applying…" : `Add ${insight?.action?.amountMl || 500}ml`}
                </button>
              ) : null}
            </div>

            <div className="insight-metrics">
              <div className="insight-metric">
                <div className="insight-metric-label">Calories</div>
                <div className="insight-metric-val">{formatK(caloriesToday)}</div>
              </div>
              <div className="insight-metric">
                <div className="insight-metric-label">Water</div>
                <div className="insight-metric-val">{waterLitres.toFixed(1)}L</div>
              </div>
              <div className="insight-metric">
                <div className="insight-metric-label">Steps</div>
                <div className="insight-metric-val">{formatK(stepsToday)}</div>
              </div>
            </div>

            <div className="insight-note">
              <span>Small wins compound.</span>
              {insightUpdatedAt ? <span className="insight-meta">Updated {formatTimeShort(insightUpdatedAt)}</span> : null}
              {insightStatus ? <span className="insight-status">{insightStatus}</span> : null}
              {insightError ? <span className="insight-status">{insightError}</span> : null}
            </div>
          </section>

          {/* Plan */}
          <section className="card plan">
            <div className="card-title">Today’s protocol</div>
            <div className="card-sub">Coach-guided actions. Keep momentum tight.</div>

            <div className="plan-progress" aria-label="Plan progress">
              <div className="plan-progress-top">
                <span>Plan progress</span>
                <strong>{completedPlanCount} / {planItems.length}</strong>
              </div>
              <div className="plan-progress-track">
                <div
                  className="plan-progress-fill"
                  style={{ width: `${planItems.length ? (completedPlanCount / planItems.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="plan-actions">
              {planItems.map((p) => {
                const status = p.done ? "Done" : p.id === nextPlanId ? "Next" : "Later";
                const statusTone = p.done ? "done" : p.id === nextPlanId ? "next" : "later";

                return (
                  <div
                    key={p.id}
                    className={`plan-action ${p.done ? "is-done" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => togglePlanItem(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        togglePlanItem(p.id);
                      }
                    }}
                  >
                    <span className={`plan-status ${statusTone}`}>{status}</span>
                    <span className="plan-action-text">{p.text}</span>
                    {!p.done ? (
                      <button
                        className="plan-quick-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCoachOpen(true);
                        }}
                      >
                        Guide
                      </button>
                    ) : (
                      <span className="plan-action-dot" aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {coachOpen ? (
          <div className="coach-modal" onClick={() => setCoachOpen(false)}>
            <div className="coach-card" onClick={(e) => e.stopPropagation()}>
              <div className="coach-top">
                <div className="coach-title">AI Coach</div>
                <button className="pill-btn" type="button" onClick={() => setCoachOpen(false)}>
                  Close
                </button>
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
                  placeholder="Ask for a practical next step..."
                  value={coachInput}
                  onChange={(e) => setCoachInput(e.target.value)}
                />
                <button className="pill-btn primary" type="submit" disabled={coachTyping || !coachInput.trim()}>
                  Send
                </button>
              </form>
            </div>
          </div>
        ) : null}

        <div className="dash-footnote">
          <span className="dot" /> Small logs → big momentum.
        </div>
      </div>
    </div>
  );
}