"use client";

import Link from "next/link";
import "../hub.css";
import { useOnboarding } from "../../context/OnboardingContext";
import { useMemo, useState } from "react";

/* ------------------------
   Helpers
------------------------ */
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clampNumber(v) {
  const n = Number(v);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function startOfWeekISO(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // make Monday start
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtDateLabel(iso) {
  // "2026-02-14" -> "Sat 14 Feb"
  try {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function countDone(arr) {
  return (arr || []).filter((x) => !!x?.done).length;
}

/* ------------------------
   Discipline scoring
------------------------ */
function scoreClamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function calcDisciplineScore({
  sleepHours = 0,
  gymDone = false,
  steps = 0,
  waterL = 0,
  studyMin = 0,
  nutritionLogged = false,
  phoneMin = 0,
}) {
  // weights sum 100
  // Sleep 15 (7h target)
  const sleepScore = Math.min(15, (clampNumber(sleepHours) / 7) * 15);

  // Gym 15
  const gymScore = gymDone ? 15 : 0;

  // Steps 15 (10k)
  const stepsScore = Math.min(15, (clampNumber(steps) / 10000) * 15);

  // Water 10 (2.5L)
  const waterScore = Math.min(10, (clampNumber(waterL) / 2.5) * 10);

  // Study 15 (120 min)
  const studyScore = Math.min(15, (clampNumber(studyMin) / 120) * 15);

  // Nutrition logged 15
  const nutriScore = nutritionLogged ? 15 : 0;

  // Phone time 15 (<=120 min is full points; worse after)
  const p = clampNumber(phoneMin);
  let phoneScore = 15;
  if (p <= 120) phoneScore = 15;
  else if (p >= 360) phoneScore = 0;
  else {
    // linear drop between 120 and 360
    phoneScore = 15 * (1 - (p - 120) / (360 - 120));
  }

  return scoreClamp(
    sleepScore + gymScore + stepsScore + waterScore + studyScore + nutriScore + phoneScore
  );
}

/* ------------------------
   Component
------------------------ */
export default function Page() {
  const { data, updateMany } = useOnboarding();

  const tabOptions = ["admin", "goals", "habits", "discipline", "routines"];
  const [tab, setTab] = useState("admin");

  const dateISO = todayISO();
  const weekISO = startOfWeekISO(new Date());

  /* ------------------------
     Data guards
  ------------------------ */
  const lifeAdminTasks = useMemo(
    () => (Array.isArray(data.lifeAdminTasks) ? data.lifeAdminTasks : []),
    [data.lifeAdminTasks]
  );

  const goals90 = useMemo(
    () => (Array.isArray(data.goals90) ? data.goals90 : []),
    [data.goals90]
  );

  const habits = useMemo(
    () => (Array.isArray(data.habits) ? data.habits : []),
    [data.habits]
  );

  const habitLogs = useMemo(
    () => (Array.isArray(data.habitLogs) ? data.habitLogs : []),
    [data.habitLogs]
  );

  const disciplineDays = useMemo(
    () => (Array.isArray(data.disciplineDays) ? data.disciplineDays : []),
    [data.disciplineDays]
  );

  const routines = useMemo(
    () => (Array.isArray(data.routines) ? data.routines : []),
    [data.routines]
  );

  const routineLogs = useMemo(
    () => (Array.isArray(data.routineLogs) ? data.routineLogs : []),
    [data.routineLogs]
  );

  /* =========================
     1) LIFE ADMIN
  ========================= */
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState("College");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskDue, setTaskDue] = useState(dateISO);
  const [taskEst, setTaskEst] = useState("30");
  const [taskNote, setTaskNote] = useState("");

  const adminSummary = useMemo(() => {
    const total = lifeAdminTasks.length;
    const done = countDone(lifeAdminTasks);
    const overdue = lifeAdminTasks.filter((t) => !t?.done && t?.dueDateISO && t.dueDateISO < dateISO)
      .length;
    return { total, done, overdue };
  }, [lifeAdminTasks, dateISO]);

  const adminSorted = useMemo(() => {
    const prioRank = { High: 0, Medium: 1, Low: 2 };
    return lifeAdminTasks
      .slice()
      .sort((a, b) => {
        const aOver = !a?.done && a?.dueDateISO && a.dueDateISO < dateISO ? 1 : 0;
        const bOver = !b?.done && b?.dueDateISO && b.dueDateISO < dateISO ? 1 : 0;
        if (aOver !== bOver) return bOver - aOver; // overdue first
        const ad = a?.dueDateISO || "9999-99-99";
        const bd = b?.dueDateISO || "9999-99-99";
        if (ad !== bd) return ad.localeCompare(bd);
        const ap = prioRank[a?.priority] ?? 9;
        const bp = prioRank[b?.priority] ?? 9;
        if (ap !== bp) return ap - bp;
        return (b?.createdAt || 0) - (a?.createdAt || 0);
      });
  }, [lifeAdminTasks, dateISO]);

  function addTask() {
    const title = taskTitle.trim();
    if (!title) return;

    const item = {
      id: uid(),
      title,
      category: taskCategory,
      priority: taskPriority,
      dueDateISO: taskDue || "",
      estMin: clampNumber(taskEst) || 0,
      note: taskNote.trim(),
      done: false,
      createdAt: Date.now(),
      doneAt: null,
    };

    updateMany({ lifeAdminTasks: [item, ...lifeAdminTasks] });

    setTaskTitle("");
    setTaskNote("");
    setTaskEst("30");
    setTaskPriority("Medium");
    setTaskCategory("College");
    setTaskDue(dateISO);
  }

  function toggleTask(id) {
    const next = lifeAdminTasks.map((t) => {
      if (t.id !== id) return t;
      const nowDone = !t.done;
      return { ...t, done: nowDone, doneAt: nowDone ? Date.now() : null };
    });
    updateMany({ lifeAdminTasks: next });
  }

  function deleteTask(id) {
    updateMany({ lifeAdminTasks: lifeAdminTasks.filter((t) => t.id !== id) });
  }

  /* =========================
     2) GOALS & VISION
  ========================= */
  const [weeklyFocus, setWeeklyFocus] = useState(data.weeklyFocus || "");

  const [goalTitle, setGoalTitle] = useState("");
  const [goalWhy, setGoalWhy] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalProgress, setGoalProgress] = useState("0");
  const [goalStatus, setGoalStatus] = useState("active");

  function saveWeeklyFocus() {
    updateMany({ weeklyFocus: weeklyFocus.trim() });
  }

  function addGoal() {
    const title = goalTitle.trim();
    if (!title) return;

    const g = {
      id: uid(),
      title,
      why: goalWhy.trim(),
      targetDateISO: goalTarget || "",
      progress: Math.min(100, clampNumber(goalProgress)),
      status: goalStatus, // active | paused | done
      milestones: [],
      createdAt: Date.now(),
    };

    updateMany({ goals90: [g, ...goals90] });

    setGoalTitle("");
    setGoalWhy("");
    setGoalTarget("");
    setGoalProgress("0");
    setGoalStatus("active");
  }

  function updateGoal(id, patch) {
    const next = goals90.map((g) => (g.id === id ? { ...g, ...patch } : g));
    updateMany({ goals90: next });
  }

  function deleteGoal(id) {
    updateMany({ goals90: goals90.filter((g) => g.id !== id) });
  }

  /* =========================
     3) HABITS
  ========================= */
  const [habitName, setHabitName] = useState("");
  const [habitCategory, setHabitCategory] = useState("Health");
  const [habitType, setHabitType] = useState("daily"); // daily | weekly
  const [habitTargetPerWeek, setHabitTargetPerWeek] = useState("3");

  function addHabit() {
    const name = habitName.trim();
    if (!name) return;

    const h = {
      id: uid(),
      name,
      category: habitCategory,
      type: habitType,
      targetPerWeek: habitType === "weekly" ? clampNumber(habitTargetPerWeek) || 1 : 7,
      createdAt: Date.now(),
    };

    updateMany({ habits: [h, ...habits] });

    setHabitName("");
    setHabitCategory("Health");
    setHabitType("daily");
    setHabitTargetPerWeek("3");
  }

  function isHabitDoneToday(habitId) {
    return habitLogs.some((l) => l.habitId === habitId && l.dateISO === dateISO && l.value === 1);
  }

  function toggleHabitToday(habitId) {
    const exists = isHabitDoneToday(habitId);
    let next = habitLogs.slice();

    if (exists) {
      next = next.filter((l) => !(l.habitId === habitId && l.dateISO === dateISO));
    } else {
      next.push({ id: uid(), habitId, dateISO, value: 1 });
    }

    updateMany({ habitLogs: next });
  }

  function deleteHabit(habitId) {
    updateMany({
      habits: habits.filter((h) => h.id !== habitId),
      habitLogs: habitLogs.filter((l) => l.habitId !== habitId),
    });
  }

  function habitStreak(habitId) {
    // consecutive days ending today
    const doneDates = new Set(
      habitLogs
        .filter((l) => l.habitId === habitId && l.value === 1)
        .map((l) => l.dateISO)
    );
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = todayISOFromDate(d);
      if (doneDates.has(iso)) streak++;
      else break;
    }
    return streak;
  }

  function todayISOFromDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function habitLast7(habitId) {
    const doneDates = new Set(
      habitLogs
        .filter((l) => l.habitId === habitId && l.value === 1)
        .map((l) => l.dateISO)
    );
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = todayISOFromDate(d);
      arr.push({ iso, done: doneDates.has(iso) });
    }
    return arr;
  }

  function weeklyCount(habitId) {
    // count logs within current week (Mon..Sun)
    const start = weekISO;
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    return habitLogs.filter((l) => {
      if (l.habitId !== habitId || l.value !== 1) return false;
      const d = new Date(`${l.dateISO}T00:00:00`);
      return d >= startDate && d < endDate;
    }).length;
  }

  /* =========================
     4) DISCIPLINE
  ========================= */
  const todaysNutriLogged = useMemo(() => {
    // If your Nutrition hub logs food into data.foodLogs, treat "anything today" as logged
    const logs = Array.isArray(data.foodLogs) ? data.foodLogs : [];
    return logs.some((x) => x?.date === dateISO);
  }, [data.foodLogs, dateISO]);

  const existingDisciplineToday = useMemo(() => {
    return disciplineDays.find((d) => d.dateISO === dateISO) || null;
  }, [disciplineDays, dateISO]);

  const [dSleep, setDSleep] = useState(existingDisciplineToday?.sleepHours ?? "");
  const [dGym, setDGym] = useState(!!existingDisciplineToday?.gymDone);
  const [dSteps, setDSteps] = useState(existingDisciplineToday?.steps ?? "");
  const [dWater, setDWater] = useState(existingDisciplineToday?.waterL ?? "");
  const [dStudy, setDStudy] = useState(existingDisciplineToday?.studyMin ?? "");
  const [dPhone, setDPhone] = useState(existingDisciplineToday?.phoneMin ?? "");

  const disciplinePreview = useMemo(() => {
    const payload = {
      sleepHours: clampNumber(dSleep),
      gymDone: !!dGym,
      steps: clampNumber(dSteps),
      waterL: clampNumber(dWater),
      studyMin: clampNumber(dStudy),
      nutritionLogged: !!todaysNutriLogged,
      phoneMin: clampNumber(dPhone),
    };
    return {
      ...payload,
      score: calcDisciplineScore(payload),
    };
  }, [dSleep, dGym, dSteps, dWater, dStudy, dPhone, todaysNutriLogged]);

  function saveDisciplineDay() {
    const entry = {
      dateISO,
      sleepHours: disciplinePreview.sleepHours,
      gymDone: disciplinePreview.gymDone,
      steps: disciplinePreview.steps,
      waterL: disciplinePreview.waterL,
      studyMin: disciplinePreview.studyMin,
      nutritionLogged: disciplinePreview.nutritionLogged,
      phoneMin: disciplinePreview.phoneMin,
      score: disciplinePreview.score,
      updatedAt: Date.now(),
    };

    const exists = disciplineDays.some((d) => d.dateISO === dateISO);
    const next = exists
      ? disciplineDays.map((d) => (d.dateISO === dateISO ? entry : d))
      : [entry, ...disciplineDays];

    updateMany({ disciplineDays: next });
  }

  const disciplineHistory = useMemo(() => {
    return disciplineDays
      .slice()
      .sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""))
      .slice(0, 14);
  }, [disciplineDays]);

  /* =========================
     5) ROUTINES
  ========================= */
  const [routineName, setRoutineName] = useState("");
  const [routineCadence, setRoutineCadence] = useState("daily"); // daily | weekly
  const [routineItemText, setRoutineItemText] = useState("");
  const [routineItemEst, setRoutineItemEst] = useState("5");

  const [editingRoutineId, setEditingRoutineId] = useState(null);

  function addRoutine() {
    const name = routineName.trim();
    if (!name) return;

    const r = {
      id: uid(),
      name,
      cadence: routineCadence,
      items: [],
      createdAt: Date.now(),
    };

    updateMany({ routines: [r, ...routines] });
    setRoutineName("");
    setRoutineCadence("daily");
    setEditingRoutineId(r.id);
  }

  function addRoutineItem() {
    if (!editingRoutineId) return;
    const text = routineItemText.trim();
    if (!text) return;

    const next = routines.map((r) => {
      if (r.id !== editingRoutineId) return r;
      const item = { id: uid(), text, estMin: clampNumber(routineItemEst) || 0 };
      return { ...r, items: [...(r.items || []), item] };
    });

    updateMany({ routines: next });
    setRoutineItemText("");
    setRoutineItemEst("5");
  }

  function deleteRoutine(routineId) {
    updateMany({
      routines: routines.filter((r) => r.id !== routineId),
      routineLogs: routineLogs.filter((l) => l.routineId !== routineId),
    });
    if (editingRoutineId === routineId) setEditingRoutineId(null);
  }

  function deleteRoutineItem(routineId, itemId) {
    const next = routines.map((r) => {
      if (r.id !== routineId) return r;
      return { ...r, items: (r.items || []).filter((it) => it.id !== itemId) };
    });
    updateMany({ routines: next });
  }

  function routineLogKey(r) {
    // daily -> dateISO, weekly -> weekISO
    return r.cadence === "weekly" ? weekISO : dateISO;
  }

  function getRoutineLog(routineId, logDateISO) {
    return routineLogs.find((l) => l.routineId === routineId && l.dateISO === logDateISO) || null;
  }

  function toggleRoutineItem(routineId, itemId, cadence) {
    const logDate = cadence === "weekly" ? weekISO : dateISO;
    const existing = getRoutineLog(routineId, logDate);

    let nextLogs = routineLogs.slice();

    if (!existing) {
      nextLogs.push({ id: uid(), routineId, dateISO: logDate, checkedItemIds: [itemId] });
    } else {
      const has = (existing.checkedItemIds || []).includes(itemId);
      const checked = has
        ? (existing.checkedItemIds || []).filter((x) => x !== itemId)
        : [...(existing.checkedItemIds || []), itemId];

      nextLogs = nextLogs.map((l) =>
        l.id === existing.id ? { ...l, checkedItemIds: checked } : l
      );
    }

    updateMany({ routineLogs: nextLogs });
  }

  function routineCompletion(r) {
    const key = routineLogKey(r);
    const log = getRoutineLog(r.id, key);
    const total = (r.items || []).length;
    const done = (log?.checkedItemIds || []).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, pct };
  }

  /* =========================
     Header summary
  ========================= */
  const headerSummary = useMemo(() => {
    const todaysTasksDone = lifeAdminTasks.filter((t) => t?.doneAt && t?.doneAt > 0).length;
    const activeGoals = goals90.filter((g) => (g?.status || "active") === "active").length;
    const todaysHabitChecks = habitLogs.filter((l) => l.dateISO === dateISO && l.value === 1).length;

    const todaysDiscipline = existingDisciplineToday?.score ?? disciplinePreview.score;

    return {
      admin: `${adminSummary.done}/${adminSummary.total} done`,
      goals: `${activeGoals} active`,
      habits: `${todaysHabitChecks} check-ins`,
      discipline: `${todaysDiscipline}/100`,
      routines: `${routines.length} templates`,
    };
  }, [
    lifeAdminTasks,
    goals90,
    habitLogs,
    dateISO,
    existingDisciplineToday,
    disciplinePreview.score,
    adminSummary,
    routines.length,
  ]);

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
            Lifestyle Hub <span className="hub-emoji">✨</span>
          </h1>
          <p className="hub-sub">
            High-performance mode: admin, habits, goals, routines — and a discipline score.
          </p>
        </div>

        <div className="hub-badge">
          <div className="hub-badge-label">Today</div>
          <div className="hub-badge-value">{fmtDateLabel(dateISO)}</div>
        </div>
      </div>

      {/* Lifestyle tabs */}
      <div className="life-tabs">
        <button
          className={`life-tab ${tab === "admin" ? "active" : ""}`}
          onClick={() => setTab("admin")}
          type="button"
        >
          Admin
          <span className="life-tabmeta">{headerSummary.admin}</span>
        </button>
        <button
          className={`life-tab ${tab === "goals" ? "active" : ""}`}
          onClick={() => setTab("goals")}
          type="button"
        >
          Goals
          <span className="life-tabmeta">{headerSummary.goals}</span>
        </button>
        <button
          className={`life-tab ${tab === "habits" ? "active" : ""}`}
          onClick={() => setTab("habits")}
          type="button"
        >
          Habits
          <span className="life-tabmeta">{headerSummary.habits}</span>
        </button>
        <button
          className={`life-tab ${tab === "discipline" ? "active" : ""}`}
          onClick={() => setTab("discipline")}
          type="button"
        >
          Score
          <span className="life-tabmeta">{headerSummary.discipline}</span>
        </button>
        <button
          className={`life-tab ${tab === "routines" ? "active" : ""}`}
          onClick={() => setTab("routines")}
          type="button"
        >
          Routines
          <span className="life-tabmeta">{headerSummary.routines}</span>
        </button>
      </div>

      {/* ---------------- ADMIN ---------------- */}
      {tab === "admin" && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Tasks</span>
                <span className="stat-chip">{adminSummary.done}/{adminSummary.total}</span>
              </div>
              <div className="stat-value">{adminSummary.total}</div>
              <div className="stat-sub">Total</div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Overdue</span>
                <span className="stat-chip">fix</span>
              </div>
              <div className="stat-value">{adminSummary.overdue}</div>
              <div className="stat-sub">Sorts to top</div>
            </div>
          </div>

          <div className="hub-section hub-section-white">
            <div className="hub-section-title">Add Task</div>
            <div className="hub-section-sub">Keep life from spiralling.</div>

            <div className="life-formgrid">
              <div className="form-field">
                <label className="form-label">Title</label>
                <input
                  className="form-input"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Finish report draft"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Due</label>
                <input
                  className="form-input"
                  type="date"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Category</label>
                <select
                  className="life-select"
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value)}
                >
                  <option>Career</option>
                  <option>College</option>
                  <option>Health</option>
                  <option>Finance</option>
                  <option>Home</option>
                  <option>Social</option>
                  <option>Self</option>
                  <option>Errands</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Priority</label>
                <select
                  className="life-select"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Estimate (min)</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={taskEst}
                  onChange={(e) => setTaskEst(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Note (optional)</label>
                <input
                  className="form-input"
                  value={taskNote}
                  onChange={(e) => setTaskNote(e.target.value)}
                  placeholder="e.g. focus on section 2 + figures"
                />
              </div>
            </div>

            <div className="btn-row">
              <button className="primary-btn" onClick={addTask} type="button">
                Add
              </button>
            </div>
          </div>

          <div className="hub-section hub-section-white">
            <div className="hub-section-title">Your Tasks</div>
            <div className="hub-section-sub">Overdue shows first.</div>

            {adminSorted.length === 0 ? (
              <div className="fit2-mutedbox" style={{ marginTop: 10 }}>
                No tasks yet. Add one above.
              </div>
            ) : (
              <div className="life-list" style={{ marginTop: 10 }}>
                {adminSorted.map((t) => {
                  const overdue = !t?.done && t?.dueDateISO && t.dueDateISO < dateISO;
                  return (
                    <div className={`life-row ${overdue ? "overdue" : ""}`} key={t.id}>
                      <button
                        className={`life-check ${t.done ? "on" : ""}`}
                        onClick={() => toggleTask(t.id)}
                        type="button"
                        aria-label="Toggle task"
                        title="Toggle done"
                      >
                        ✓
                      </button>

                      <div className="life-main">
                        <div className="life-titleline">
                          <span className={`life-title ${t.done ? "done" : ""}`}>
                            {t.title}
                          </span>
                          {overdue && <span className="life-badge">Overdue</span>}
                          <span className={`life-pill p-${String(t.priority || "").toLowerCase()}`}>
                            {t.priority}
                          </span>
                          <span className="life-pill">{t.category}</span>
                        </div>

                        <div className="life-sub">
                          Due: <strong>{t.dueDateISO || "—"}</strong>
                          <span className="life-dot">•</span>
                          Est: <strong>{clampNumber(t.estMin)}m</strong>
                          {t.note ? (
                            <>
                              <span className="life-dot">•</span>
                              {t.note}
                            </>
                          ) : null}
                        </div>
                      </div>

                      <button
                        className="life-del"
                        onClick={() => deleteTask(t.id)}
                        type="button"
                        title="Delete"
                        aria-label="Delete task"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------------- GOALS ---------------- */}
      {tab === "goals" && (
        <>
          <div className="hub-section hub-section-white">
            <div className="hub-section-title">Weekly Focus</div>
            <div className="hub-section-sub">One thing. No chaos.</div>

            <div className="life-focus">
              <input
                className="life-focusinput"
                value={weeklyFocus}
                onChange={(e) => setWeeklyFocus(e.target.value)}
                placeholder="e.g. Finish project MVP + demo-ready UI"
              />
              <button className="primary-btn" onClick={saveWeeklyFocus} type="button">
                Save
              </button>
            </div>
          </div>

          <div className="hub-section hub-section-white">
            <div className="hub-section-title">Add 90-Day Goal</div>
            <div className="hub-section-sub">Make it trackable, not vibes.</div>

            <div className="life-formgrid">
              <div className="form-field">
                <label className="form-label">Goal</label>
                <input
                  className="form-input"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Submit Synera with full hubs + analytics"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Target date</label>
                <input
                  className="form-input"
                  type="date"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Why (optional)</label>
                <input
                  className="form-input"
                  value={goalWhy}
                  onChange={(e) => setGoalWhy(e.target.value)}
                  placeholder="e.g. builds portfolio + proof of execution"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Progress %</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  max="100"
                  value={goalProgress}
                  onChange={(e) => setGoalProgress(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Status</label>
                <select
                  className="life-select"
                  value={goalStatus}
                  onChange={(e) => setGoalStatus(e.target.value)}
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="done">done</option>
                </select>
              </div>
            </div>

            <div className="btn-row">
              <button className="primary-btn" onClick={addGoal} type="button">
                Add
              </button>
            </div>
          </div>

          <div className="hub-section hub-section-white">
            <div className="hub-section-title">Your Goals</div>
            <div className="hub-section-sub">Update progress whenever.</div>

            {goals90.length === 0 ? (
              <div className="fit2-mutedbox" style={{ marginTop: 10 }}>
                No goals yet. Add one above.
              </div>
            ) : (
              <div className="life-goallist" style={{ marginTop: 10 }}>
                {goals90.map((g) => (
                  <div className="life-goalcard" key={g.id}>
                    <div className="life-goalhead">
                      <div className="life-goaltitle">{g.title}</div>
                      <div className="life-goalright">
                        <span className={`life-pill st-${String(g.status || "active")}`}>
                          {g.status || "active"}
                        </span>
                        <button
                          className="life-del"
                          onClick={() => deleteGoal(g.id)}
                          type="button"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="life-sub" style={{ marginTop: 6 }}>
                      {g.targetDateISO ? (
                        <>
                          Target: <strong>{g.targetDateISO}</strong>
                        </>
                      ) : (
                        <>Target: <strong>—</strong></>
                      )}
                      {g.why ? (
                        <>
                          <span className="life-dot">•</span>
                          {g.why}
                        </>
                      ) : null}
                    </div>

                    <div className="life-progress">
                      <div className="life-progtrack">
                        <div
                          className="life-progfill"
                          style={{ width: `${Math.min(100, clampNumber(g.progress))}%` }}
                        />
                      </div>
                      <div className="life-progmeta">
                        <span>{Math.min(100, clampNumber(g.progress))}%</span>
                        <div className="life-inline">
                          <button
                            className="mini-btn"
                            onClick={() =>
                              updateGoal(g.id, { progress: Math.min(100, clampNumber(g.progress) + 5) })
                            }
                            type="button"
                          >
                            +5
                          </button>
                          <button
                            className="mini-btn"
                            onClick={() =>
                              updateGoal(g.id, { progress: Math.max(0, clampNumber(g.progress) - 5) })
                            }
                            type="button"
                          >
                            -5
                          </button>
                          <button
                            className="mini-btn"
                            onClick={() => updateGoal(g.id, { status: "done", progress: 100 })}
                            type="button"
                          >
                            Mark done
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------------- HABITS ---------------- */}
      {tab === "habits" && (
        <>
          <div className="hub-section hub-section-white">
            <div className="hub-section-title">Add Habit</div>
            <div className="hub-section-sub">Track consistency without it feeling childish.</div>

            <div className="life-formgrid">
              <div className="form-field">
                <label className="form-label">Habit</label>
                <input
                  className="form-input"
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  placeholder="e.g. Gym, 10k steps, journaling"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Category</label>
                <select
                  className="life-select"
                  value={habitCategory}
                  onChange={(e) => setHabitCategory(e.target.value)}
                >
                  <option>Health</option>
                  <option>College</option>
                  <option>Career</option>
                  <option>Self</option>
                  <option>Home</option>
                  <option>Finance</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Frequency</label>
                <select
                  className="life-select"
                  value={habitType}
                  onChange={(e) => setHabitType(e.target.value)}
                >
                  <option value="daily">daily</option>
                  <option value="weekly">weekly</option>
                </select>
              </div>

              {habitType === "weekly" && (
                <div className="form-field">
                  <label className="form-label">Target / week</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={habitTargetPerWeek}
                    onChange={(e) => setHabitTargetPerWeek(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="btn-row">
              <button className="primary-btn" onClick={addHabit} type="button">
                Add
              </button>
            </div>
          </div>

          <div className="hub-section hub-section-white">
            <div className="hub-section-title">Today</div>
            <div className="hub-section-sub">{fmtDateLabel(dateISO)}</div>

            {habits.length === 0 ? (
              <div className="fit2-mutedbox" style={{ marginTop: 10 }}>
                No habits yet. Add one above.
              </div>
            ) : (
              <div className="life-habitlist" style={{ marginTop: 10 }}>
                {habits.map((h) => {
                  const done = isHabitDoneToday(h.id);
                  const last7 = habitLast7(h.id);
                  const streak = habitStreak(h.id);

                  const weekly = h.type === "weekly";
                  const wCount = weekly ? weeklyCount(h.id) : 0;
                  const wTarget = weekly ? clampNumber(h.targetPerWeek) || 1 : 0;
                  const wPct = weekly ? Math.min(100, Math.round((wCount / wTarget) * 100)) : 0;

                  return (
                    <div className="life-habitcard" key={h.id}>
                      <div className="life-habithead">
                        <button
                          className={`life-check ${done ? "on" : ""}`}
                          onClick={() => toggleHabitToday(h.id)}
                          type="button"
                          title="Toggle today"
                        >
                          ✓
                        </button>

                        <div className="life-habitmain">
                          <div className="life-titleline">
                            <span className="life-title">{h.name}</span>
                            <span className="life-pill">{h.category}</span>
                            <span className="life-pill">{h.type}</span>
                            {h.type === "daily" && <span className="life-pill">streak {streak}</span>}
                            {weekly && (
                              <span className="life-pill">
                                {wCount}/{wTarget} this week
                              </span>
                            )}
                          </div>

                          <div className="life-habitbars">
                            <div className="life-miniweek">
                              {last7.map((d) => (
                                <div
                                  key={d.iso}
                                  className={`life-mini ${d.done ? "on" : ""}`}
                                  title={d.iso}
                                />
                              ))}
                            </div>

                            {weekly && (
                              <div className="life-weekprog">
                                <div className="life-progtrack small">
                                  <div className="life-progfill" style={{ width: `${wPct}%` }} />
                                </div>
                                <div className="life-sub small">
                                  Week progress: <strong>{wPct}%</strong>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          className="life-del"
                          onClick={() => deleteHabit(h.id)}
                          type="button"
                          title="Delete habit"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------------- DISCIPLINE ---------------- */}
      {tab === "discipline" && (
        <>
          <div className="hub-section hub-section-white">
            <div className="hub-section-title">Discipline Score</div>
            <div className="hub-section-sub">
              One number that tells the truth. Nutrition auto-checks if you logged food today.
            </div>

            <div className="life-scorecard">
              <div className="life-scoretop">
                <div>
                  <div className="life-kicker">Today’s score</div>
                  <div className="life-score">{disciplinePreview.score}/100</div>
                </div>

                <div className="life-scorepill">
                  Nutrition: {todaysNutriLogged ? "logged" : "not logged"}
                </div>
              </div>

              <div className="life-scoregrid">
                <div className="life-scorefield">
                  <label className="form-label">Sleep (hours)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.5"
                    value={dSleep}
                    onChange={(e) => setDSleep(e.target.value)}
                    placeholder="e.g. 7"
                  />
                </div>

                <div className="life-scorefield">
                  <label className="form-label">Gym</label>
                  <button
                    className={`life-toggle ${dGym ? "on" : ""}`}
                    onClick={() => setDGym((p) => !p)}
                    type="button"
                  >
                    {dGym ? "Done ✓" : "Not yet"}
                  </button>
                </div>

                <div className="life-scorefield">
                  <label className="form-label">Steps</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    value={dSteps}
                    onChange={(e) => setDSteps(e.target.value)}
                    placeholder="e.g. 8500"
                  />
                </div>

                <div className="life-scorefield">
                  <label className="form-label">Water (L)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.1"
                    value={dWater}
                    onChange={(e) => setDWater(e.target.value)}
                    placeholder="e.g. 2.3"
                  />
                </div>

                <div className="life-scorefield">
                  <label className="form-label">Study (min)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    value={dStudy}
                    onChange={(e) => setDStudy(e.target.value)}
                    placeholder="e.g. 120"
                  />
                </div>

                <div className="life-scorefield">
                  <label className="form-label">Phone (min)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    value={dPhone}
                    onChange={(e) => setDPhone(e.target.value)}
                    placeholder="e.g. 90"
                  />
                </div>
              </div>

              <div className="btn-row" style={{ marginTop: 10 }}>
                <button className="primary-btn" onClick={saveDisciplineDay} type="button">
                  Save today
                </button>
              </div>
            </div>
          </div>

          <div className="hub-section hub-section-white">
            <div className="hub-section-title">Recent Scores</div>
            <div className="hub-section-sub">Last 14 entries.</div>

            {disciplineHistory.length === 0 ? (
              <div className="fit2-mutedbox" style={{ marginTop: 10 }}>
                No saved scores yet. Save today above.
              </div>
            ) : (
              <div className="life-list" style={{ marginTop: 10 }}>
                {disciplineHistory.map((d) => (
                  <div className="life-row" key={d.dateISO}>
                    <div className="life-main">
                      <div className="life-titleline">
                        <span className="life-title">{fmtDateLabel(d.dateISO)}</span>
                        <span className="life-pill">score {d.score}/100</span>
                        <span className="life-pill">sleep {clampNumber(d.sleepHours)}h</span>
                        <span className="life-pill">{d.gymDone ? "gym ✓" : "gym ✕"}</span>
                      </div>
                      <div className="life-sub">
                        Steps {clampNumber(d.steps)} • Water {clampNumber(d.waterL)}L • Study{" "}
                        {clampNumber(d.studyMin)}m • Phone {clampNumber(d.phoneMin)}m •{" "}
                        {d.nutritionLogged ? "Nutrition logged" : "No nutrition log"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------------- ROUTINES ---------------- */}
      {tab === "routines" && (
        <>
          <div className="hub-section hub-section-white">
            <div className="hub-section-title">Routine Templates</div>
            <div className="hub-section-sub">
              Build “systems” (morning, night, Sunday reset). Daily routines reset daily. Weekly routines reset weekly.
            </div>

            <div className="life-formgrid">
              <div className="form-field">
                <label className="form-label">Routine name</label>
                <input
                  className="form-input"
                  value={routineName}
                  onChange={(e) => setRoutineName(e.target.value)}
                  placeholder="e.g. Morning routine, Sunday reset"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Cadence</label>
                <select
                  className="life-select"
                  value={routineCadence}
                  onChange={(e) => setRoutineCadence(e.target.value)}
                >
                  <option value="daily">daily</option>
                  <option value="weekly">weekly</option>
                </select>
              </div>
            </div>

            <div className="btn-row">
              <button className="primary-btn" onClick={addRoutine} type="button">
                Create routine
              </button>
            </div>

            {routines.length === 0 ? (
              <div className="fit2-mutedbox" style={{ marginTop: 10 }}>
                No routines yet. Create one above.
              </div>
            ) : (
              <div className="life-routinegrid" style={{ marginTop: 12 }}>
                {routines.map((r) => {
                  const comp = routineCompletion(r);
                  const selected = editingRoutineId === r.id;

                  return (
                    <div className={`life-routinecard ${selected ? "active" : ""}`} key={r.id}>
                      <div className="life-routinehead">
                        <button
                          className="life-routinebtn"
                          onClick={() => setEditingRoutineId(r.id)}
                          type="button"
                        >
                          <div className="life-routinetitle">{r.name}</div>
                          <div className="life-sub">
                            {r.cadence} • {comp.done}/{comp.total} ({comp.pct}%)
                          </div>
                        </button>

                        <button
                          className="life-del"
                          onClick={() => deleteRoutine(r.id)}
                          type="button"
                          title="Delete routine"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="life-progtrack small" style={{ marginTop: 10 }}>
                        <div className="life-progfill" style={{ width: `${comp.pct}%` }} />
                      </div>

                      <div className="life-sub small" style={{ marginTop: 8 }}>
                        {r.cadence === "weekly" ? `Week starting ${weekISO}` : `Today ${dateISO}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {editingRoutineId && (
            <div className="hub-section hub-section-white">
              {(() => {
                const r = routines.find((x) => x.id === editingRoutineId);
                if (!r) return null;

                const logDate = routineLogKey(r);
                const log = getRoutineLog(r.id, logDate);
                const checked = new Set(log?.checkedItemIds || []);

                return (
                  <>
                    <div className="hub-section-title">{r.name}</div>
                    <div className="hub-section-sub">
                      {r.cadence === "weekly" ? `This week (${weekISO})` : `Today (${dateISO})`}
                    </div>

                    <div className="life-additem">
                      <input
                        className="life-iteminput"
                        value={routineItemText}
                        onChange={(e) => setRoutineItemText(e.target.value)}
                        placeholder="Add a step… (e.g. skincare, plan day, tidy desk)"
                      />
                      <input
                        className="life-itemest"
                        type="number"
                        min="0"
                        value={routineItemEst}
                        onChange={(e) => setRoutineItemEst(e.target.value)}
                        title="Estimate minutes"
                      />
                      <button className="mini-btn" onClick={addRoutineItem} type="button">
                        Add
                      </button>
                    </div>

                    {(r.items || []).length === 0 ? (
                      <div className="fit2-mutedbox" style={{ marginTop: 10 }}>
                        No steps yet. Add the first step above.
                      </div>
                    ) : (
                      <div className="life-list" style={{ marginTop: 10 }}>
                        {(r.items || []).map((it) => (
                          <div className="life-row" key={it.id}>
                            <button
                              className={`life-check ${checked.has(it.id) ? "on" : ""}`}
                              onClick={() => toggleRoutineItem(r.id, it.id, r.cadence)}
                              type="button"
                              title="Toggle step"
                            >
                              ✓
                            </button>

                            <div className="life-main">
                              <div className="life-titleline">
                                <span className="life-title">{it.text}</span>
                                <span className="life-pill">{clampNumber(it.estMin)}m</span>
                                <span className="life-pill">{checked.has(it.id) ? "done" : "pending"}</span>
                              </div>
                            </div>

                            <button
                              className="life-del"
                              onClick={() => deleteRoutineItem(r.id, it.id)}
                              type="button"
                              title="Delete step"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
