"use client";

import Link from "next/link";
import { useOnboarding } from "../context/OnboardingContext";
import "./hub.css";
import { useEffect, useMemo, useState } from "react";

export default function Page() {
  const { data, updateMany } = useOnboarding();

  const [habitsDone, setHabitsDone] = useState("");
  const [habitGoal, setHabitGoal] = useState("");

  useEffect(() => {
    setHabitsDone(String(data.habitsDone ?? 0));
    setHabitGoal(String(data.habitGoal ?? 5));
  }, [data.habitsDone, data.habitGoal]);

  function clampNumber(value) {
    const n = Number(value);
    if (Number.isNaN(n) || n < 0) return 0;
    return n;
  }

  const preview = useMemo(() => {
    const done = clampNumber(habitsDone);
    const goal = clampNumber(habitGoal) || 5;
    const pct = Math.min(100, Math.round((done / goal) * 100));
    return { done, goal, pct };
  }, [habitsDone, habitGoal]);

  function saveLifestyle() {
    updateMany({
      habitsDone: preview.done,
      habitGoal: preview.goal,
    });
  }

  function resetToday() {
    updateMany({ habitsDone: 0 });
    setHabitsDone("0");
  }

  return (
    <div className="hub-page">
      <div className="hub-topbar">
        <Link href="/dashboard" className="back-link">
          ← Back
        </Link>
      </div>

      <div className="hub-hero">
        <div>
          <h1 className="hub-title">
            Lifestyle Hub <span className="hub-emoji">🌸</span>
          </h1>
          <p className="hub-sub">Habits, routines, and self-care — daily wins.</p>
        </div>

        <div className="hub-badge">
          <div className="hub-badge-label">Habits</div>
          <div className="hub-badge-value">{preview.pct}%</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Habits done</span>
            <span className="stat-chip">{preview.pct}%</span>
          </div>
          <div className="stat-value">{data.habitsDone ?? 0}</div>
          <div className="stat-sub">Goal: {data.habitGoal ?? 5}</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Quick Actions</span>
            <span className="stat-chip">tap</span>
          </div>
          <div className="row">
            <div className="pill">Skincare</div>
            <div className="pill">Plan tomorrow</div>
            <div className="pill">Reset</div>
          </div>
          <div className="stat-sub">Build consistency</div>
        </div>
      </div>

      <div className="hub-section hub-section-white">
        <div className="hub-section-title">Today’s Habit Tracker</div>
        <div className="hub-section-sub">
          Preview: <strong>{preview.done}</strong> / <strong>{preview.goal}</strong>
        </div>

        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="form-field">
            <label className="form-label">Habits done</label>
            <input
              className="form-input"
              type="number"
              min="0"
              value={habitsDone}
              onChange={(e) => setHabitsDone(e.target.value)}
              placeholder="e.g. 3"
            />
            <div className="tiny-note">How many habits you completed today</div>
          </div>

          <div className="form-field">
            <label className="form-label">Daily habit goal</label>
            <input
              className="form-input"
              type="number"
              min="1"
              value={habitGoal}
              onChange={(e) => setHabitGoal(e.target.value)}
              placeholder="e.g. 5"
            />
            <div className="tiny-note">Default goal is 5</div>
          </div>
        </div>

        <div className="btn-row">
          <button className="primary-btn" onClick={saveLifestyle}>
            Save
          </button>
          <button className="ghost-btn" onClick={resetToday}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
