"use client";

import "./dashboard.css";
import Link from "next/link";
import { useOnboarding } from "../context/OnboardingContext";
import Ring from "../components/Ring";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { db } from "../firebase/config";
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
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export default function Dashboard() {
  const router = useRouter();
  const { data, ready, user: authUser } = useOnboarding();

  const date = todayISO();
  const greeting = getGreeting();
  const username = data?.name?.trim() || "Friend";

  const [daily, setDaily] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(true);

  // force login
  useEffect(() => {
    if (ready && !authUser) router.push("/login");
  }, [ready, authUser, router]);

  // Create / load today's Firestore doc: users/{uid}/daily/{YYYY-MM-DD}
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

  /* ------------------------
     Firestore actions
  ------------------------ */
  async function addWater(ml) {
    if (!authUser) return;
    const ref = doc(db, "users", authUser.uid, "daily", date);

    await updateDoc(ref, {
      waterMl: increment(ml),
      updatedAt: serverTimestamp(),
    });

    setDaily((prev) => ({
      ...(prev || {}),
      waterMl: (prev?.waterMl || 0) + ml,
    }));
  }

  async function togglePlanItem(itemId) {
    if (!authUser) return;

    const current = Array.isArray(daily?.plan) ? daily.plan : [];
    const next = current.map((p) =>
      p.id === itemId ? { ...p, done: !p.done } : p
    );

    const ref = doc(db, "users", authUser.uid, "daily", date);
    await updateDoc(ref, {
      plan: next,
      updatedAt: serverTimestamp(),
    });

    setDaily((prev) => ({ ...(prev || {}), plan: next }));
  }

  /* ------------------------
     DATA (safe even when !ready)
  ------------------------ */
  const calorieGoal = clampNumber(data?.calorieGoal) || 1800;

  // (keep your foodLogs logic for now)
  const todaysFoodLogs = useMemo(() => {
    const logs = Array.isArray(data?.foodLogs) ? data.foodLogs : [];
    return logs.filter((x) => x?.date === date);
  }, [data?.foodLogs, date]);

  const caloriesToday = useMemo(() => {
    // Prefer daily.calories if you start writing to it later
    const fromDaily = clampNumber(daily?.calories);
    if (fromDaily) return fromDaily;

    let sum = 0;
    for (const entry of todaysFoodLogs)
      sum += clampNumber(entry?.totals?.calories);
    return Math.round(sum);
  }, [daily?.calories, todaysFoodLogs]);

  const calRemaining = Math.max(0, calorieGoal - caloriesToday);
  const calPct = pct(caloriesToday, calorieGoal);

  const stepGoal = clampNumber(data?.stepGoal) || 8000;

  const stepsToday = useMemo(() => {
    // Prefer daily.steps if present
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

  const sleepMinutes = clampNumber(data?.sleepMinutes); // optional future field
  const sleepGoalMinutes = clampNumber(data?.sleepGoalMinutes) || 8 * 60;
  const sleepPct = sleepMinutes ? pct(sleepMinutes, sleepGoalMinutes) : 0;
  const sleepValue = useMemo(() => {
    if (!sleepMinutes) return "--";
    const h = Math.floor(sleepMinutes / 60);
    const m = sleepMinutes % 60;
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }, [sleepMinutes]);

  const planItems = Array.isArray(daily?.plan) ? daily.plan : [];

  /* ------------------------
     RENDER
  ------------------------ */
  return (
    <div className="dash-page">
      {/* Sticky mini header */}
      <div className="dash-sticky">
        <div className="dash-sticky-inner">
          <div className="dash-sticky-left">
            <div className="dash-sticky-kicker">Today</div>
            <div className="dash-sticky-date">{date}</div>
          </div>

          <div className="dash-sticky-mid">
            <div className="dash-sticky-metric">
              <div className="dash-sticky-label">Calories remaining</div>
              <div className="dash-sticky-value">{formatK(calRemaining)}</div>
            </div>
            <div className="dash-sticky-bar">
              <div
                className="dash-sticky-barfill"
                style={{ width: `${calPct}%` }}
              />
            </div>
          </div>

          <div className="dash-sticky-right">
            <Link className="dash-btn" href="/hubs/nutrition">
              Log food
            </Link>
            <Link className="dash-btn ghost" href="/hubs/fitness">
              Log workout
            </Link>
          </div>
        </div>
      </div>

      <div className="dash-shell">
        {/* Top header */}
        <div className="dash-header">
          <div className="dash-brand">
            <div className="dash-logo" aria-hidden />
            <div className="dash-brandtext">
              <div className="dash-brandname">Synera</div>
              <div className="dash-brandtag">Track • Adjust • Repeat</div>
            </div>
          </div>

          <h1 className="dash-title">
            {greeting}, <span className="accent">{username}</span>
          </h1>

          {!ready ? <div className="dash-loading">Loading your data…</div> : null}
          {dailyLoading ? (
            <div className="dash-loading">Loading today’s log…</div>
          ) : null}
        </div>

        {/* KPI row */}
        <div className="kpi-grid">
          <div className="kpi-card primary">
            <div className="kpi-top">
              <div className="kpi-label">Calories</div>
              <div className="kpi-chip">{calPct}%</div>
            </div>

            <div className="kpi-big">{formatK(caloriesToday)}</div>
            <div className="kpi-sub">
              of {formatK(calorieGoal)} •{" "}
              <span className="accent">{formatK(calRemaining)} left</span>
            </div>

            <div className="kpi-bar">
              <div className="kpi-barfill" style={{ width: `${calPct}%` }} />
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-label">Steps</div>
              <div className="kpi-chip">{stepsPct}%</div>
            </div>
            <div className="kpi-big">{formatK(stepsToday)}</div>
            <div className="kpi-sub">Goal {formatK(stepGoal)}</div>
            <div className="kpi-bar">
              <div className="kpi-barfill" style={{ width: `${stepsPct}%` }} />
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-label">Water</div>
              <div className="kpi-chip">{waterPct}%</div>
            </div>
            <div className="kpi-big">{waterLitres.toFixed(1)}L</div>
            <div className="kpi-sub">Goal {waterGoal.toFixed(1)}L</div>
            <div className="kpi-bar">
              <div className="kpi-barfill blue" style={{ width: `${waterPct}%` }} />
            </div>

            <div className="quick-actions">
              <button className="dash-btn" type="button" onClick={() => addWater(250)}>
                +250ml
              </button>
              <button className="dash-btn" type="button" onClick={() => addWater(500)}>
                +500ml
              </button>
              <button className="dash-btn ghost" type="button" onClick={() => addWater(1000)}>
                +1L
              </button>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <div className="kpi-label">Sleep</div>
              <div className="kpi-chip">{sleepMinutes ? `${sleepPct}%` : "—"}</div>
            </div>
            <div className="kpi-big">{sleepValue}</div>
            <div className="kpi-sub">
              {sleepMinutes
                ? `Goal ${Math.round(sleepGoalMinutes / 60)}h`
                : "Not tracked yet"}
            </div>
            <div className="kpi-bar">
              <div className="kpi-barfill violet" style={{ width: `${sleepPct}%` }} />
            </div>
          </div>
        </div>

        {/* Rings */}
        <div className="ring-row">
          <div className="ring-card">
            <Ring progress={stepsPct} label="Move" value={`${stepsPct}%`} color="#FF4F9A" />
            <div className="ring-meta">
              <div className="ring-meta-main">{formatK(stepsToday)}</div>
              <div className="ring-meta-sub">Goal {formatK(stepGoal)}</div>
            </div>
          </div>

          <div className="ring-card">
            <Ring progress={waterPct} label="Hydration" value={`${waterLitres.toFixed(1)}L`} color="#3B82F6" />
            <div className="ring-meta">
              <div className="ring-meta-main">{waterLitres.toFixed(1)}L</div>
              <div className="ring-meta-sub">Goal {waterGoal.toFixed(1)}L</div>
            </div>
          </div>

          <div className="ring-card">
            <Ring progress={sleepPct} label="Sleep" value={sleepMinutes ? `${sleepPct}%` : "--"} color="#8B5CF6" />
            <div className="ring-meta">
              <div className="ring-meta-main">{sleepValue}</div>
              <div className="ring-meta-sub">{sleepMinutes ? "Tracked" : "Not tracked"}</div>
            </div>
          </div>
        </div>

        {/* Today plan */}
        <div className="plan-card">
          <div className="plan-title">Today’s plan</div>
          <div className="plan-sub">Tick these off. Progress saves.</div>

          <ul className="plan-list plan-checklist">
            {planItems.map((p) => (
              <li key={p.id} className="plan-item">
                <input
                  type="checkbox"
                  checked={!!p.done}
                  onChange={() => togglePlanItem(p.id)}
                />
                <span className={p.done ? "plan-done" : ""}>{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Modules */}
        <div className="modules">
          <div className="modules-title">Modules</div>
          <div className="modules-sub">Open a hub and log in seconds.</div>

          <div className="module-grid">
            <Link href="/hubs/fitness" className="module-card">
              <div className="module-left">
                <div className="module-name">Fitness</div>
                <div className="module-meta">Workouts • Steps</div>
              </div>
              <div className="module-cta">→</div>
            </Link>

            <Link href="/hubs/nutrition" className="module-card">
              <div className="module-left">
                <div className="module-name">Nutrition</div>
                <div className="module-meta">Meals • Hydration</div>
              </div>
              <div className="module-cta">→</div>
            </Link>

            <Link href="/hubs/mind-sleep" className="module-card">
              <div className="module-left">
                <div className="module-name">Mind & Sleep</div>
                <div className="module-meta">Mood • Sleep</div>
              </div>
              <div className="module-cta">→</div>
            </Link>

            <Link href="/hubs/lifestyle" className="module-card">
              <div className="module-left">
                <div className="module-name">Lifestyle</div>
                <div className="module-meta">Habits • Routine</div>
              </div>
              <div className="module-cta">→</div>
            </Link>
          </div>
        </div>

        <div className="dash-footnote">
          <span className="dot" /> Small logs → big momentum.
        </div>
      </div>
    </div>
  );
}