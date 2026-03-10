// app/hubs/fitness/page.js
"use client";

import "./fitness.css";
import HubShell from "../../components/hub/HubShell";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOnboarding } from "../../context/OnboardingContext";
import { db } from "../../firebase/config";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import PageState from "../../components/ui/PageState";
import { todayISO } from "../../utils/date";
import {
  AVOID_OPTIONS,
  EXERCISE_LIBRARY as STRUCTURED_EXERCISE_LIBRARY,
  GOAL_OPTIONS,
  generateWorkoutPlan,
  parseGeneratorPrompt,
  toTemplatePayload,
} from "./workoutGenerator";

/* ---------- Starter templates & library ---------- */

const DEFAULT_TEMPLATES = [
  {
    id: "tpl-legs-glutes",
    name: "Leg & Glute",
    exercises: ["Barbell Squat", "Hip Thrust", "RDL", "Leg Press"],
  },
  {
    id: "tpl-upper",
    name: "Upper Body",
    exercises: [
      "Bench Press",
      "Lat Pulldown (Cable)",
      "Shoulder Press (Dumbbell)",
      "Bicep Curl (Barbell)",
    ],
  },
  {
    id: "tpl-full",
    name: "Full Body",
    exercises: ["Goblet Squat", "Row", "Push-ups", "RDL"],
  },
  {
    id: "tpl-glute",
    name: "Glute Focused",
    exercises: ["Hip Thrust", "RDL", "Cable Abduction", "Back Extension"],
  },
];

const DEFAULT_TEMPLATE_IDS = new Set(DEFAULT_TEMPLATES.map((tpl) => tpl.id));

const EXERCISE_LIBRARY = [
  ...STRUCTURED_EXERCISE_LIBRARY.map((exercise) => ({
    name: exercise.name,
    category: exercise.primaryMuscles?.[0] || "General",
  })),
  { name: "Plank", category: "Core" },
  { name: "Aerobics", category: "Cardio" },
];

/* ---------- Helpers ---------- */

function isTimedCategory(cat = "") {
  return cat.toLowerCase().includes("cardio");
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function parseISODateToMs(iso) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function formatRelativeDate(iso) {
  const t = parseISODateToMs(iso);
  if (!t) return iso || "--";
  const diffMs = Date.now() - t;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 8) return `${weeks} weeks ago`;
  return iso;
}


function nowEpochMs() {
  return Date.now();
}

function nowPerfMs() {
  if (typeof performance !== "undefined" && performance?.now) {
    return performance.now();
  }
  return nowEpochMs();
}

function safeNum(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function makeSet() {
  return {
    type: "Normal",
    done: false,
    weight: "",
    reps: "",
    timeSec: "",
    distance: "",
  };
}

function makeExercise(name, category = "", modeOverride = null) {
  const mode = modeOverride || (isTimedCategory(category) ? "time" : "reps");
  return { name, category, mode, note: "", sets: [makeSet()] };
}

/**
 * history map:
 * name -> { last, lastSets, best, bestDate }
 */
function buildExerciseHistoryMap(workouts = []) {
  const map = new Map();
  const sorted = workouts
    .slice()
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  for (const w of sorted) {
    const wDate = w.date || "";
    const unit = w.unit || "kg";
    const exercises = Array.isArray(w.exercises) ? w.exercises : [];

    for (const ex of exercises) {
      const name = (ex?.name || "").trim();
      if (!name) continue;

      const mode = ex?.mode || "reps";
      const sets = Array.isArray(ex?.sets) ? ex.sets : [];

      let bestReps = null;
      let bestTime = null;

      for (const s of sets) {
        if (mode === "time") {
          const t = safeNum(s?.timeSec);
          const d = safeNum(s?.distance);
          if (!bestTime || t > bestTime.timeSec)
            bestTime = { timeSec: t, distance: d };
        } else {
          const wt = safeNum(s?.weight);
          const rp = safeNum(s?.reps);
          if (!bestReps) bestReps = { weight: wt, reps: rp };
          else if (
            wt > bestReps.weight ||
            (wt === bestReps.weight && rp > bestReps.reps)
          )
            bestReps = { weight: wt, reps: rp };
        }
      }

      const summary =
        mode === "time"
          ? bestTime
            ? `${bestTime.timeSec}s${
                bestTime.distance ? ` • ${bestTime.distance}km` : ""
              }`
            : "--"
          : bestReps
            ? `${bestReps.weight}${unit} × ${bestReps.reps}`
            : "--";

      const entry = map.get(name) || {
        last: null,
        lastSets: null,
        best: null,
        bestDate: null,
      };

      entry.last = { date: wDate, unit, summary, mode };
      entry.lastSets = sets.map((s) => ({
        type: s.type || "Normal",
        done: false,
        weight: s.weight ?? "",
        reps: s.reps ?? "",
        timeSec: s.timeSec ?? "",
        distance: s.distance ?? "",
      }));

      if (!entry.best) {
        entry.best = {
          unit,
          summary,
          mode,
          weight: bestReps?.weight || 0,
          reps: bestReps?.reps || 0,
          timeSec: bestTime?.timeSec || 0,
        };
        entry.bestDate = wDate;
      } else {
        if (mode === "time") {
          const curr = bestTime?.timeSec || 0;
          const prev = entry.best.timeSec || 0;
          if (curr > prev) {
            entry.best = { unit, summary, mode, timeSec: curr };
            entry.bestDate = wDate;
          }
        } else {
          const currW = bestReps?.weight || 0;
          const currR = bestReps?.reps || 0;
          const prevW = entry.best.weight || 0;
          const prevR = entry.best.reps || 0;

          if (currW > prevW || (currW === prevW && currR > prevR)) {
            entry.best = { unit, summary, mode, weight: currW, reps: currR };
            entry.bestDate = wDate;
          }
        }
      }

      map.set(name, entry);
    }
  }

  return map;
}

/* ---------- Calendar helpers ---------- */

function getMonthDays(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const daysInMonth = last.getDate();
  const startWeekday = first.getDay();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isoFromYMD(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

const TRAINING_STYLE_OPTIONS = [
  "balanced strength",
  "glute hypertrophy",
  "posture + tone",
  "low-impact conditioning",
];

/* ---------- Steps helpers ---------- */

function upsertStepsLog(stepsLog, date, steps) {
  const next = Array.isArray(stepsLog) ? [...stepsLog] : [];
  const i = next.findIndex((x) => x.date === date);
  if (i >= 0) next[i] = { ...next[i], steps };
  else next.push({ date, steps });
  next.sort((a, b) => (a.date > b.date ? 1 : -1));
  return next;
}

function calcStepStreak(stepsLog, stepGoal) {
  const goal = Number(stepGoal) || 8000;
  const map = new Map(
    (stepsLog || []).map((x) => [x.date, Number(x.steps) || 0]),
  );

  let streak = 0;
  let cursor = new Date();
  for (;;) {
    const iso = cursor.toISOString().split("T")[0];
    const v = map.get(iso);
    if (!v || v < goal) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/* ---------- Cardio helpers ---------- */

function paceFrom(distanceKm, durationMin) {
  const d = Number(distanceKm);
  const m = Number(durationMin);
  if (!d || !m || d <= 0 || m <= 0) return "--";
  const pace = m / d;
  const mm = Math.floor(pace);
  const ss = Math.round((pace - mm) * 60);
  return `${mm}:${String(ss).padStart(2, "0")} /km`;
}

/* =========================
   BMI (BODY) HELPERS
========================= */

function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  if (!h) return null;
  return weightKg / (h * h);
}

function bmiCategory(bmi) {
  if (!bmi) return "--";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

/* =========================
   MAIN COMPONENT
========================= */

export default function FitnessHub() {
  const router = useRouter();
  const { data, updateMany, ready, user } = useOnboarding();
  const d = data || {};

  const templates = useMemo(
    () =>
      d.workoutTemplates?.length
        ? d.workoutTemplates.map((tpl) => ({ ...tpl }))
        : DEFAULT_TEMPLATES,
    [d.workoutTemplates],
  );
  const workouts = useMemo(
    () => (Array.isArray(d.workouts) ? d.workouts.map((w) => ({ ...w })) : []),
    [d.workouts],
  );
  const unit = d.weightUnit || "kg";
  const currentTemplateId = d.currentWorkoutTemplateId || "";

  // screens: hub | start | session | history | detail | cardio | steps | body
  const [screen, setScreen] = useState("hub");
  const [pickerOpen, setPickerOpen] = useState(false);

  // history detail
  const [detailWorkoutId, setDetailWorkoutId] = useState(null);

  // strength start calendar
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayISO());

  // session
  const [sessionTitle, setSessionTitle] = useState("Evening Workout");
  const [sessionDate, setSessionDate] = useState(todayISO());
  const [sessionExercises, setSessionExercises] = useState([]);

  // timer
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  // picker
  const [search, setSearch] = useState("");

  // steps screen inputs
  const [stepsToday, setStepsToday] = useState("");

  // cardio screen inputs
  const [cardioType, setCardioType] = useState("Run");
  const [cardioMin, setCardioMin] = useState("");
  const [cardioKm, setCardioKm] = useState("");
  const [cardioNote, setCardioNote] = useState("");

  // templates + sync status
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateExercisesInput, setTemplateExercisesInput] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [tweakOpen, setTweakOpen] = useState(false);
  const [goalPrompt, setGoalPrompt] = useState("Build me a 4-day plan for glute growth with low quad bias, plus upper-body tone and posture support.");
  const [goalInterpretation, setGoalInterpretation] = useState(null);
  const [templateSaveName, setTemplateSaveName] = useState("");
  const [setAsCurrentOnSave, setSetAsCurrentOnSave] = useState(true);
  const [saveNotice, setSaveNotice] = useState("");
  const [planInput, setPlanInput] = useState({
    planName: "Syra Goal-Specific Plan",
    primaryGoal: "build bigger glutes overall",
    secondaryGoal: "improve posture / upper back tone",
    avoid: ["avoid wider back appearance"],
    trainingDays: 4,
    level: "beginner",
    trainingLocation: "home",
    equipmentAccess: "home",
    preferredStyle: "glute hypertrophy",
    sessionStructure: { sessionMinutes: 50, exercisesPerDay: 4 },
  });

  const stepGoal = Number(d.stepGoal) || 8000;
  const stepsLog = useMemo(
    () => (Array.isArray(d.stepsLog) ? d.stepsLog.map((x) => ({ ...x })) : []),
    [d.stepsLog],
  );
  const cardioLogs = useMemo(
    () =>
      Array.isArray(d.cardioLogs) ? d.cardioLogs.map((x) => ({ ...x })) : [],
    [d.cardioLogs],
  );

  // maps
  const historyMap = useMemo(
    () => buildExerciseHistoryMap(workouts),
    [workouts],
  );

  const workoutDates = useMemo(() => {
    const s = new Set();
    for (const w of workouts) if (w?.date) s.add(w.date);
    return s;
  }, [workouts]);

  const calCells = useMemo(
    () => getMonthDays(calYear, calMonth),
    [calYear, calMonth],
  );

  const workoutsOnSelectedDate = useMemo(() => {
    return workouts
      .filter((w) => w?.date === selectedDate)
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [workouts, selectedDate]);

  const recentWorkouts = useMemo(
    () => workouts.slice().reverse().slice(0, 3),
    [workouts],
  );

  const streak = useMemo(
    () => calcStepStreak(stepsLog, stepGoal),
    [stepsLog, stepGoal],
  );

  const weeklyStats = useMemo(() => {
    const now = nowEpochMs();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const weekly = workouts.filter((w) => {
      const t = Number(w?.createdAt || 0);
      return t >= sevenDaysAgo;
    });

    let weeklySets = 0;
    const activeDays = new Set();
    weekly.forEach((w) => {
      if (w?.date) activeDays.add(w.date);
      (w?.exercises || []).forEach((ex) => {
        weeklySets += ex?.sets?.length || 0;
      });
    });

    return {
      workouts: weekly.length,
      sets: weeklySets,
      consistency: Math.round((activeDays.size / 7) * 100),
    };
  }, [workouts]);

  function getProgressionTip(exerciseName, mode) {
    const info = historyMap.get((exerciseName || "").trim());
    if (!info?.best) return "No history yet — aim for clean form and consistent effort.";

    if (mode === "time") {
      const sec = Number(info.best.timeSec || 0);
      return sec
        ? `Progression idea: target +${Math.max(10, Math.round(sec * 0.05))}s total time.`
        : "Progression idea: add 5–10% time or distance this week.";
    }

    const bestW = Number(info.best.weight || 0);
    const bestR = Number(info.best.reps || 0);
    if (bestW > 0) {
      const jump = unit === "lbs" ? 5 : 2.5;
      return `Progression idea: try ${bestW + jump}${unit} for ${Math.max(1, bestR)} reps.`;
    }
    return `Progression idea: keep weight, add +1 rep to top set.`;
  }

  function openTemplateCreator() {
    setTemplateName("");
    setTemplateExercisesInput("");
    setTemplateOpen(true);
  }

  function saveTemplate() {
    const name = templateName.trim();
    const exercises = templateExercisesInput
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    if (!name || exercises.length === 0) return;

    const normalizedName = name.toLowerCase();
    const existing = templates.some(
      (tpl) => (tpl?.name || "").trim().toLowerCase() === normalizedName,
    );
    if (existing) return;

    const next = [
      ...(Array.isArray(d.workoutTemplates) ? d.workoutTemplates : []),
      {
        id:
          typeof crypto !== "undefined" && crypto?.randomUUID
            ? crypto.randomUUID()
            : `tpl-${nowEpochMs()}`,
        name,
        exercises,
      },
    ];

    updateMany({ workoutTemplates: next });
    setTemplateOpen(false);
  }

  function removeTemplate(templateId) {
    if (DEFAULT_TEMPLATE_IDS.has(templateId)) return;
    const base = Array.isArray(d.workoutTemplates) ? d.workoutTemplates : [];
    const next = base.filter((tpl) => tpl.id !== templateId);
    updateMany({ workoutTemplates: next });
  }

  function buildGeneratorPayload(input) {
    return {
      ...input,
      primaryGoals: [input.primaryGoal, input.secondaryGoal].filter(Boolean),
      equipmentAccess: input.trainingLocation || input.equipmentAccess,
    };
  }

  function generatePlanFromCurrentDetails() {
    const payload = buildGeneratorPayload(planInput);
    setGeneratedPlan(generateWorkoutPlan(payload));
    setSaveNotice("");
  }

  function generatePlanFromPrompt() {
    const parsed = parseGeneratorPrompt(goalPrompt, buildGeneratorPayload(planInput));
    const interpretedGoals = parsed.planInput.primaryGoals || [];
    const nextInput = {
      ...planInput,
      primaryGoal: interpretedGoals[0] || planInput.primaryGoal,
      secondaryGoal: interpretedGoals[1] || planInput.secondaryGoal,
      avoid: parsed.planInput.avoid || planInput.avoid,
      trainingDays: parsed.planInput.trainingDays || planInput.trainingDays,
      level: parsed.planInput.level || planInput.level,
      trainingLocation: parsed.planInput.equipmentAccess || planInput.trainingLocation,
      equipmentAccess: parsed.planInput.equipmentAccess || planInput.equipmentAccess,
      sessionStructure: {
        ...planInput.sessionStructure,
        ...(parsed.planInput.sessionStructure || {}),
      },
    };
    setGoalInterpretation(parsed.interpretation);
    setPlanInput(nextInput);
    setGeneratedPlan(generateWorkoutPlan(buildGeneratorPayload(nextInput)));
    setSaveNotice("");
  }

  function saveGeneratedAsTemplate() {
    if (!generatedPlan) return;
    const nextTemplate = {
      ...toTemplatePayload(generatedPlan),
      name: templateSaveName.trim() || generatedPlan.planName,
    };
    const next = [...(Array.isArray(d.workoutTemplates) ? d.workoutTemplates : []), nextTemplate];
    updateMany({
      workoutTemplates: next,
      currentWorkoutTemplateId: setAsCurrentOnSave ? nextTemplate.id : (d.currentWorkoutTemplateId || ""),
    });
    setTemplateSaveName(nextTemplate.name);
    setSaveNotice(`Saved to My Templates as \"${nextTemplate.name}\".`);
  }

  function setCurrentTemplate(templateId) {
    updateMany({ currentWorkoutTemplateId: templateId });
  }

  function renameTemplate(templateId) {
    const nextName = window.prompt("Rename template", "");
    if (!nextName) return;
    const base = Array.isArray(d.workoutTemplates) ? d.workoutTemplates : [];
    const next = base.map((tpl) => (tpl.id === templateId ? { ...tpl, name: nextName.trim() || tpl.name } : tpl));
    updateMany({ workoutTemplates: next });
  }

  function duplicateTemplate(templateId) {
    const source = templates.find((tpl) => tpl.id === templateId);
    if (!source) return;
    const dup = {
      ...source,
      id: typeof crypto !== "undefined" && crypto?.randomUUID ? crypto.randomUUID() : `tpl-${Date.now()}`,
      name: `${source.name} Copy`,
    };
    const next = [...(Array.isArray(d.workoutTemplates) ? d.workoutTemplates : []), dup];
    updateMany({ workoutTemplates: next });
  }

  function tweakGeneratedPlan(patch) {
    if (!generatedPlan) return;
    const nextInput = {
      ...planInput,
      ...patch,
      sessionStructure: {
        ...planInput.sessionStructure,
        ...(patch.sessionStructure || {}),
      },
    };
    setPlanInput(nextInput);
    setGeneratedPlan(generateWorkoutPlan(buildGeneratorPayload(nextInput)));
    setTweakOpen(false);
  }

  function moveExercise(dayId, exerciseId, direction) {
    if (!generatedPlan) return;
    const nextDays = generatedPlan.days.map((day) => {
      if (day.id !== dayId) return day;
      const list = [...day.exercises];
      const idx = list.findIndex((item) => item.id === exerciseId);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= list.length) return day;
      [list[idx], list[target]] = [list[target], list[idx]];
      return { ...day, exercises: list };
    });
    setGeneratedPlan({ ...generatedPlan, days: nextDays });
  }

  function removeGeneratedExercise(dayId, exerciseId) {
    if (!generatedPlan) return;
    const nextDays = generatedPlan.days.map((day) =>
      day.id === dayId ? { ...day, exercises: day.exercises.filter((item) => item.id !== exerciseId) } : day,
    );
    setGeneratedPlan({ ...generatedPlan, days: nextDays });
  }

  function regenerateGeneratedDay(dayId) {
    if (!generatedPlan) return;
    const refreshed = generateWorkoutPlan(buildGeneratorPayload(planInput));
    const targetDay = refreshed.days.find((day) => day.id === dayId);
    if (!targetDay) return;

    const nextDays = generatedPlan.days.map((day) =>
      day.id === dayId ? targetDay : day,
    );

    setGeneratedPlan({ ...generatedPlan, days: nextDays });
  }

  function swapGeneratedExercise(dayId, exerciseId) {
    if (!generatedPlan) return;
    const replacementName = window.prompt("Swap with exercise", "Glute Bridge");
    if (!replacementName) return;
    const source = STRUCTURED_EXERCISE_LIBRARY.find((x) => x.name.toLowerCase() === replacementName.trim().toLowerCase());
    const nextDays = generatedPlan.days.map((day) => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        exercises: day.exercises.map((item) => {
          if (item.id !== exerciseId) return item;
          if (!source) {
            return { ...item, name: replacementName.trim(), why: `${item.why} (manual swap applied)` };
          }
          return {
            ...item,
            name: source.name,
            targets: [...source.primaryMuscles, ...source.secondaryMuscles].slice(0, 3),
            why: source.explanation,
            substitutions: source.substitutions,
            equipmentNote: source.equipment.join(" / "),
          };
        }),
      };
    });
    setGeneratedPlan({ ...generatedPlan, days: nextDays });
  }

  // timer loop
  useEffect(() => {
    if (!running) return;

    const tick = () => {
      if (startRef.current == null) return;
      const nowP = nowPerfMs();
      setElapsedMs(nowP - startRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running]);

  function setUnit(next) {
    updateMany({ weightUnit: next });
  }

  function startTimerFresh() {
    setElapsedMs(0);
    startRef.current = nowPerfMs();
    setRunning(true);
  }
  function pauseTimer() {
    setRunning(false);
  }
  function resumeTimer() {
    startRef.current = nowPerfMs() - elapsedMs;
    setRunning(true);
  }
  function resetTimer() {
    setRunning(false);
    setElapsedMs(0);
    startRef.current = null;
  }

  function startEmptyWorkout() {
    const dd = todayISO();
    setSessionTitle("Evening Workout");
    setSessionDate(dd);
    setSessionExercises([]);
    setScreen("session");
    startTimerFresh();
  }

  function startFromTemplate(tpl) {
    const exercises = tpl.exercises.map((name) => {
      const found = EXERCISE_LIBRARY.find((x) => x.name === name);
      return makeExercise(name, found?.category || "");
    });

    const dd = todayISO();
    setSessionTitle(tpl.name);
    setSessionDate(dd);
    setSessionExercises(exercises);
    setScreen("session");
    startTimerFresh();
  }

  function cancelWorkout() {
    setPickerOpen(false);
    setSearch("");
    setSessionExercises([]);
    resetTimer();
    setScreen("start");
  }

  function finishWorkout() {
    const cleanedExercises = sessionExercises
      .map((ex) => ({
        name: (ex.name || "").trim(),
        category: ex.category || "",
        mode: ex.mode || "reps",
        note: ex.note || "",
        sets: (ex.sets || []).map((s) => ({
          type: s.type || "Normal",
          done: !!s.done,
          weight: s.weight,
          reps: s.reps,
          timeSec: s.timeSec,
          distance: s.distance,
        })),
      }))
      .filter((ex) => ex.name.length > 0);

    const workout = {
      id:
        typeof crypto !== "undefined" && crypto?.randomUUID
          ? crypto.randomUUID()
          : String(nowEpochMs()),
      title: sessionTitle.trim() || "Workout",
      date: sessionDate,
      durationSec: Math.floor(elapsedMs / 1000),
      unit,
      exercises: cleanedExercises,
      createdAt: nowEpochMs(),
    };

    updateMany({ workouts: [...workouts, workout] });
    cancelWorkout();
  }

  // exercise picker
  const filteredLibrary = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EXERCISE_LIBRARY;
    return EXERCISE_LIBRARY.filter((x) => x.name.toLowerCase().includes(q));
  }, [search]);

  function addExerciseByName(name, opts = { useLast: false }) {
    const clean = (name || "").trim();
    if (!clean) return;

    const found = EXERCISE_LIBRARY.find((x) => x.name === clean);
    const category = found?.category || "Custom";
    const hist = historyMap.get(clean);

    if (opts.useLast && hist?.lastSets?.length) {
      const modeFromHist =
        hist.last?.mode || (isTimedCategory(category) ? "time" : "reps");
      const ex = makeExercise(clean, category, modeFromHist);
      ex.sets = hist.lastSets.map((s) => ({ ...s, done: false }));
      setSessionExercises((prev) => [...prev, ex]);
    } else {
      setSessionExercises((prev) => [...prev, makeExercise(clean, category)]);
    }

    setPickerOpen(false);
    setSearch("");
  }

  function updateExerciseName(exIndex, value) {
    setSessionExercises((prev) => {
      const copy = [...prev];
      copy[exIndex] = { ...copy[exIndex], name: value };
      return copy;
    });
  }

  function updateExerciseNote(exIndex, value) {
    setSessionExercises((prev) => {
      const copy = [...prev];
      copy[exIndex] = { ...copy[exIndex], note: value };
      return copy;
    });
  }

  function setExerciseMode(exIndex, mode) {
    setSessionExercises((prev) => {
      const copy = [...prev];
      const ex = copy[exIndex];
      copy[exIndex] = { ...ex, mode, sets: [makeSet()] };
      return copy;
    });
  }

  function removeExercise(exIndex) {
    setSessionExercises((prev) => prev.filter((_, i) => i !== exIndex));
  }

  function addSet(exIndex) {
    setSessionExercises((prev) => {
      const copy = [...prev];
      const ex = copy[exIndex];
      copy[exIndex] = { ...ex, sets: [...ex.sets, makeSet()] };
      return copy;
    });
  }

  function removeSet(exIndex, setIndex) {
    setSessionExercises((prev) => {
      const copy = [...prev];
      const ex = copy[exIndex];
      const nextSets = ex.sets.filter((_, i) => i !== setIndex);
      copy[exIndex] = {
        ...ex,
        sets: nextSets.length ? nextSets : [makeSet()],
      };
      return copy;
    });
  }

  function updateSet(exIndex, setIndex, field, value) {
    setSessionExercises((prev) => {
      const copy = [...prev];
      const ex = copy[exIndex];
      const sets = [...ex.sets];
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      copy[exIndex] = { ...ex, sets };
      return copy;
    });
  }

  function renderLastInfo(name) {
    const key = (name || "").trim();
    const info = historyMap.get(key);
    if (!info?.last) return <span>No history yet</span>;
    const isPR =
      info.bestDate && info.last?.date && info.bestDate === info.last.date;

    return (
      <span>
        Last: <strong>{info.last.summary}</strong> •{" "}
        {formatRelativeDate(info.last.date)}
        {isPR ? <span className="fit2-pr">PR</span> : null}
      </span>
    );
  }

  function renderBestInfo(name) {
    const key = (name || "").trim();
    const info = historyMap.get(key);
    if (!info?.best) return null;
    return (
      <span>
        Best: <strong>{info.best.summary}</strong>
      </span>
    );
  }

  // calendar nav
  function prevMonth() {
    const m = calMonth - 1;
    if (m < 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth(m);
  }

  function nextMonth() {
    const m = calMonth + 1;
    if (m > 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth(m);
  }

  const monthLabel = useMemo(() => {
    const dd = new Date(calYear, calMonth, 1);
    return dd.toLocaleString("en-GB", { month: "long", year: "numeric" });
  }, [calYear, calMonth]);

  /* ---------- Tiles actions ---------- */

  function goStrength() {
    setScreen("start");
  }
  function goHistory() {
    setScreen("history");
  }
  function goCardio() {
    setScreen("cardio");
  }
  function goSteps() {
    setScreen("steps");
  }
  function goBody() {
    setScreen("body");
  }

  /* ---------- History screens ---------- */

  const sortedWorkouts = useMemo(() => {
    return workouts
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [workouts]);

  const detailWorkout = useMemo(() => {
    if (!detailWorkoutId) return null;
    return workouts.find((w) => w.id === detailWorkoutId) || null;
  }, [workouts, detailWorkoutId]);

  /* ---------- Steps save ---------- */

  function saveSteps() {
    const steps = safeNum(stepsToday);
    const iso = todayISO();
    const next = upsertStepsLog(stepsLog, iso, steps);
    updateMany({ stepsLog: next });
    setStepsToday(String(steps));
  }

  /* ---------- Cardio save ---------- */

  function addCardio() {
    const date = todayISO();
    const durationMin = safeNum(cardioMin);
    const distanceKm = safeNum(cardioKm);

    if (!durationMin) return;

    const entry = {
      id:
        typeof crypto !== "undefined" && crypto?.randomUUID
          ? crypto.randomUUID()
          : String(nowEpochMs()),
      date,
      type: cardioType || "Run",
      durationMin,
      distanceKm,
      note: cardioNote || "",
      createdAt: nowEpochMs(),
    };

    updateMany({ cardioLogs: [entry, ...cardioLogs] });
    setCardioMin("");
    setCardioKm("");
    setCardioNote("");
  }

  /* ---------- BODY derived values ---------- */

  const weightKg =
    unit === "lbs" ? Number(d.weight || 0) * 0.453592 : Number(d.weight || 0);
  const heightCm = Number(d.height || 0);
  const bmi = calcBMI(weightKg, heightCm);

  /* ---------- DAILY SUMMARY ---------- */

  const todayIso = todayISO();

  const todaysWorkouts = useMemo(() => {
    return workouts.filter((w) => w?.date === todayIso);
  }, [workouts, todayIso]);

  const todaysSteps = useMemo(() => {
    const found = stepsLog.find((x) => x.date === todayIso);
    return found ? Number(found.steps) || 0 : 0;
  }, [stepsLog, todayIso]);

  const todaysCardio = useMemo(() => {
    return cardioLogs.filter((c) => c?.date === todayIso);
  }, [cardioLogs, todayIso]);

  const totalSetsToday = useMemo(() => {
    let count = 0;
    todaysWorkouts.forEach((w) => {
      w.exercises?.forEach((ex) => {
        count += ex.sets?.length || 0;
      });
    });
    return count;
  }, [todaysWorkouts]);

  const totalCardioMinutesToday = useMemo(() => {
    return todaysCardio.reduce(
      (sum, entry) => sum + safeNum(entry?.durationMin),
      0,
    );
  }, [todaysCardio]);


  const recentStepLogs = useMemo(() => {
    return stepsLog
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 7);
  }, [stepsLog]);

  const weeklyStepsAvg = useMemo(() => {
    if (!recentStepLogs.length) return 0;
    const total = recentStepLogs.reduce((sum, row) => sum + safeNum(row?.steps), 0);
    return Math.round(total / recentStepLogs.length);
  }, [recentStepLogs]);

  const weeklyCardioMinutes = useMemo(() => {
    return cardioLogs
      .slice(0, 7)
      .reduce((sum, row) => sum + safeNum(row?.durationMin), 0);
  }, [cardioLogs]);


  useEffect(() => {
    async function syncDailyFitness() {
      if (!ready || !user?.uid) return;
      const ref = doc(db, "users", user.uid, "daily", todayIso);

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await setDoc(
            ref,
            {
              date: todayIso,
              steps: safeNum(todaysSteps),
              workouts: todaysWorkouts.length,
              cardioMinutes: totalCardioMinutesToday,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        }
      }
    }

    syncDailyFitness();
  }, [
    ready,
    user?.uid,
    todayIso,
    todaysSteps,
    todaysWorkouts.length,
    totalCardioMinutesToday,
  ]);

  /* =========================
     RENDER
  ========================= */



  useEffect(() => {
    if (ready && !user) router.push("/login");
  }, [ready, user, router]);

  if (!ready) {
    return (
      <HubShell
        className="fit2-page"
        title="Fitness"
        subtitle="Train smarter. Track progress."
        emoji="🏋🏽"
      >
        <PageState type="loading" message="Loading your fitness hub…" />
      </HubShell>
    );
  }

  if (!user) {
    return (
      <HubShell
        className="fit2-page"
        title="Fitness"
        subtitle="Train smarter. Track progress."
        emoji="🏋🏽"
      >
        <PageState type="loading" message="Redirecting to login…" />
      </HubShell>
    );
  }

  return (
    <HubShell
      className="fit2-page"
      title="Fitness"
      subtitle="Train smarter. Track progress."
    >
      {/* ========== HUB TILES ========== */}
      {screen === "hub" && (
        <div className="fit2-hubhome">
          <div className="fit2-unitPanel">
            <div>
              <div className="fit2-unitLabel">Strength unit</div>
              <div className="fit2-unitHint">Use the same unit across workout logging and body stats.</div>
            </div>
            <div className="fit2-unit">
              <button className={`fit2-unitbtn ${unit === "kg" ? "active" : ""}`} onClick={() => setUnit("kg")} type="button">kg</button>
              <button className={`fit2-unitbtn ${unit === "lbs" ? "active" : ""}`} onClick={() => setUnit("lbs")} type="button">lbs</button>
            </div>
          </div>

          {/* DAILY SUMMARY CARD */}
          <div className="fit2-dailyCard">
            <div className="fit2-dailyHeader">
              <div>
                <div className="fit2-dailyLabel">Today</div>
                <div className="fit2-dailyDate">{todayIso}</div>
              </div>

              <div className="fit2-dailyBadge">
                {todaysWorkouts.length || todaysCardio.length || todaysSteps > 0
                  ? "Active"
                  : "Rest"}
              </div>
            </div>

            <div className="fit2-dailyGrid">
              <div className="fit2-dailyItem">
                <div className="fit2-dailyValue">{todaysWorkouts.length}</div>
                <div className="fit2-dailyText">Workouts</div>
              </div>

              <div className="fit2-dailyItem">
                <div className="fit2-dailyValue">{totalSetsToday}</div>
                <div className="fit2-dailyText">Sets</div>
              </div>

              <div className="fit2-dailyItem">
                <div className="fit2-dailyValue">{todaysSteps}</div>
                <div className="fit2-dailyText">Steps</div>
              </div>

              <div className="fit2-dailyItem">
                <div className="fit2-dailyValue">{todaysCardio.length}</div>
                <div className="fit2-dailyText">Cardio</div>
              </div>
            </div>

            <div className="fit2-weeklyRow">
              <div className="fit2-weeklyCard">
                <div className="fit2-weeklyLabel">7d workouts</div>
                <div className="fit2-weeklyValue">{weeklyStats.workouts}</div>
              </div>
              <div className="fit2-weeklyCard">
                <div className="fit2-weeklyLabel">7d sets</div>
                <div className="fit2-weeklyValue">{weeklyStats.sets}</div>
              </div>
              <div className="fit2-weeklyCard">
                <div className="fit2-weeklyLabel">Consistency</div>
                <div className="fit2-weeklyValue">{weeklyStats.consistency}%</div>
              </div>
            </div>

            <div className="fit2-dailyActions">
              <div className="fit2-actionPrimary">
                <button
                  className="fit2-primarywide"
                  onClick={goStrength}
                  type="button"
                >
                  Start Strength
                </button>
                <div className="fit2-actionHint">Launch your next workout with templates, timers, and progression tracking.</div>
              </div>

              <div className="fit2-actionSecondary">
                <button className="fit2-pillbtn" onClick={goSteps} type="button">
                  Log Steps
                </button>
                <button className="fit2-pillbtn" onClick={goCardio} type="button">
                  Log Cardio
                </button>
              </div>
            </div>
          </div>

          <section className="fit2-advancedGrid">
            <article className="fit2-simpleCard fit2-advancedCard">
              <div className="fit2-sectiontitle">Steps Intelligence</div>
              <div className="fit2-advancedValue">{todaysSteps.toLocaleString()}</div>
              <div className="fit2-recentsub">Today • {Math.round((todaysSteps / stepGoal) * 100) || 0}% of goal</div>
              <div className="fit2-recentsub">7-day avg: {weeklyStepsAvg.toLocaleString()} steps • Streak: {streak} day(s)</div>
            </article>
            <article className="fit2-simpleCard fit2-advancedCard">
              <div className="fit2-sectiontitle">Cardio Readiness</div>
              <div className="fit2-advancedValue">{totalCardioMinutesToday} min</div>
              <div className="fit2-recentsub">Today across {todaysCardio.length} session(s)</div>
              <div className="fit2-recentsub">Last 7 logs total: {weeklyCardioMinutes} min</div>
            </article>
            <article className="fit2-simpleCard fit2-advancedCard">
              <div className="fit2-sectiontitle">Body Snapshot</div>
              <div className="fit2-advancedValue">{bmi ? bmi.toFixed(1) : "--"}</div>
              <div className="fit2-recentsub">BMI • {bmiCategory(bmi)}</div>
              <div className="fit2-recentsub">Height {heightCm || "--"} cm • Weight {d.weight || "--"} {unit}</div>
            </article>
          </section>

          <section className="fit2-featureSection">
            <div className="fit2-featureTitle">Training lanes</div>
            <div className="fit2-tilegrid">
              <button className="fit2-tile" onClick={goStrength} type="button">
                <div className="fit2-tileTop">
                  <div className="fit2-tileIcon">🏋️‍♀️</div>
                  <div className="fit2-tileBadge">{workouts.length} saved</div>
                </div>
                <div className="fit2-tileTitle">Strength</div>
                <div className="fit2-tileSub">Templates • Logging • PRs</div>
              </button>

              <button className="fit2-tile" onClick={goHistory} type="button">
                <div className="fit2-tileTop">
                  <div className="fit2-tileIcon">📜</div>
                  <div className="fit2-tileBadge">View</div>
                </div>
                <div className="fit2-tileTitle">History</div>
                <div className="fit2-tileSub">All workouts • Details</div>
              </button>

              <button className="fit2-tile" onClick={goCardio} type="button">
                <div className="fit2-tileTop">
                  <div className="fit2-tileIcon">🏃‍♀️</div>
                  <div className="fit2-tileBadge">{cardioLogs.length}</div>
                </div>
                <div className="fit2-tileTitle">Cardio</div>
                <div className="fit2-tileSub">Run • Walk • Cycle logs</div>
              </button>

              <button className="fit2-tile" onClick={goSteps} type="button">
                <div className="fit2-tileTop">
                  <div className="fit2-tileIcon">👟</div>
                  <div className="fit2-tileBadge">{streak} day streak</div>
                </div>
                <div className="fit2-tileTitle">Steps</div>
                <div className="fit2-tileSub">Daily steps • Goal • streak</div>
              </button>

              <button className="fit2-tile" onClick={goBody} type="button">
                <div className="fit2-tileTop">
                  <div className="fit2-tileIcon">📊</div>
                  <div className="fit2-tileBadge">BMI</div>
                </div>
                <div className="fit2-tileTitle">Body</div>
                <div className="fit2-tileSub">BMI • Category</div>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ========== BODY (BMI) ========== */}
      {screen === "body" && (
        <div className="fit2-start">
          <div className="fit2-headerblock">
            <div className="fit2-kicker">Body</div>
            <h1 className="fit2-h1">BMI</h1>
            <div className="fit2-row" style={{ marginTop: 10 }}>
              <button
                className="fit2-pillbtn"
                type="button"
                onClick={() => setScreen("hub")}
              >
                ← Fitness Hub
              </button>
            </div>
          </div>

          <div className="fit2-simpleCard">
            <div className="fit2-small">
              Height: <strong>{heightCm ? `${heightCm} cm` : "--"}</strong>
            </div>
            <div className="fit2-small">
              Weight: <strong>{d.weight ? `${d.weight} ${unit}` : "--"}</strong>
            </div>

            <div className="fit2-small" style={{ marginTop: 10 }}>
              BMI: <strong>{bmi ? bmi.toFixed(1) : "--"}</strong>
            </div>
            <div className="fit2-small">
              Category: <strong>{bmiCategory(bmi)}</strong>
            </div>

            {!d.height || !d.weight ? (
              <div className="fit2-mutedbox" style={{ marginTop: 12 }}>
                Add your <strong>height</strong> and <strong>weight</strong> in
                onboarding to calculate BMI.
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ========== STRENGTH START ========== */}
      {screen === "start" && (
        <div className="fit2-start">
          <div className="fit2-headerblock">
            <div className="fit2-kicker">Strength</div>
            <h1 className="fit2-h1">Start Workout</h1>
            <div className="fit2-row" style={{ marginTop: 10 }}>
              <button
                className="fit2-pillbtn"
                type="button"
                onClick={() => setScreen("hub")}
              >
                ← Fitness Hub
              </button>
            </div>
          </div>

          <div className="fit2-section">
            <div className="fit2-sectiontitle">Quick Start</div>
            <button
              className="fit2-primarywide"
              onClick={startEmptyWorkout}
              type="button"
            >
              Start an Empty Workout
            </button>
          </div>

          <div className="fit2-section fit2-generatorSection">
            <div className="fit2-generatorHero">
              <div>
                <div className="fit2-kicker">Syra Signature</div>
                <div className="fit2-sectiontitle fit2-generatorTitle">Premium Personalized Workout Builder</div>
                <div className="fit2-recentsub">Describe your ideal look, movement feel, and constraints. Syra translates it into a specific training system.</div>
              </div>
              <div className="fit2-actions">
                {generatedPlan ? (
                  <button className="fit2-pillbtn fit2-pillbtn--premium" type="button" onClick={() => setTweakOpen(true)}>Tweak Plan</button>
                ) : null}
              </div>
            </div>

            <div className="fit2-simpleCard fit2-generatorCard" style={{ marginTop: 12 }}>
              <div className="fit2-label fit2-builderPromptLabel">Describe your ideal look / goals</div>
              <textarea
                className="fit2-note fit2-builderPrompt"
                value={goalPrompt}
                onChange={(e) => setGoalPrompt(e.target.value)}
                placeholder="Example: Build upper glutes with less quad emphasis, improve posture, and keep sessions at 45 minutes with home equipment."
              />
              <div className="fit2-row fit2-builderActions">
                <button className="fit2-pillbtn fit2-pillbtn--premium" type="button" onClick={generatePlanFromPrompt}>Generate from chat</button>
                <button className="fit2-primarywide fit2-primarywide--premium" type="button" onClick={generatePlanFromCurrentDetails}>Generate Plan</button>
              </div>

              {goalInterpretation ? (
                <div className="fit2-interpretCard">
                  <div className="fit2-small"><strong>Syra interpretation preview</strong></div>
                  <div className="fit2-recentsub" style={{ marginTop: 6 }}>{goalInterpretation.coachReply}</div>
                  <div className="fit2-chipRow" style={{ marginTop: 8 }}>
                    {(goalInterpretation.goals || []).slice(0, 4).map((goal) => <span key={goal} className="fit2-muscleBadge">Goal: {goal}</span>)}
                    {(goalInterpretation.avoid || []).slice(0, 4).map((avoid) => <span key={avoid} className="fit2-muscleBadge fit2-muscleBadge--muted">Avoid: {avoid}</span>)}
                  </div>
                </div>
              ) : null}

              <div className="fit2-genGrid" style={{ marginTop: 12 }}>
                <label className="fit2-label">
                  Plan title
                  <input
                    className="fit2-input"
                    value={planInput.planName}
                    onChange={(e) => setPlanInput((prev) => ({ ...prev, planName: e.target.value }))}
                  />
                </label>
                <label className="fit2-label">
                  Training style
                  <select
                    className="fit2-select"
                    value={planInput.preferredStyle}
                    onChange={(e) => setPlanInput((prev) => ({ ...prev, preferredStyle: e.target.value }))}
                  >
                    {TRAINING_STYLE_OPTIONS.map((style) => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                </label>
                <label className="fit2-label">
                  Primary goal
                  <select
                    className="fit2-select"
                    value={planInput.primaryGoal}
                    onChange={(e) => setPlanInput((prev) => ({ ...prev, primaryGoal: e.target.value }))}
                  >
                    {GOAL_OPTIONS.map((goal) => (
                      <option key={goal} value={goal}>{goal}</option>
                    ))}
                  </select>
                </label>
                <label className="fit2-label">
                  Secondary goal
                  <select
                    className="fit2-select"
                    value={planInput.secondaryGoal}
                    onChange={(e) => setPlanInput((prev) => ({ ...prev, secondaryGoal: e.target.value }))}
                  >
                    {GOAL_OPTIONS.map((goal) => (
                      <option key={goal} value={goal}>{goal}</option>
                    ))}
                  </select>
                </label>
                <label className="fit2-label">
                  Days per week
                  <input
                    className="fit2-input"
                    type="number"
                    min={2}
                    max={6}
                    value={planInput.trainingDays}
                    onChange={(e) => setPlanInput((prev) => ({ ...prev, trainingDays: Number(e.target.value) || 4 }))}
                  />
                </label>
                <label className="fit2-label">
                  Experience level
                  <select
                    className="fit2-select"
                    value={planInput.level}
                    onChange={(e) => setPlanInput((prev) => ({ ...prev, level: e.target.value }))}
                  >
                    <option value="beginner">beginner</option>
                    <option value="intermediate">intermediate</option>
                  </select>
                </label>
                <label className="fit2-label">
                  Training location
                  <select
                    className="fit2-select"
                    value={planInput.trainingLocation}
                    onChange={(e) => setPlanInput((prev) => ({ ...prev, trainingLocation: e.target.value, equipmentAccess: e.target.value }))}
                  >
                    <option value="home">home</option>
                    <option value="gym">commercial gym</option>
                    <option value="minimal">minimal equipment</option>
                  </select>
                </label>
                <label className="fit2-label">
                  Session length (min)
                  <input
                    className="fit2-input"
                    type="number"
                    min={30}
                    max={90}
                    value={planInput.sessionStructure?.sessionMinutes || 50}
                    onChange={(e) => setPlanInput((prev) => ({
                      ...prev,
                      sessionStructure: {
                        ...(prev.sessionStructure || {}),
                        sessionMinutes: Number(e.target.value) || 50,
                      },
                    }))}
                  />
                </label>
              </div>
              <div className="fit2-choiceWrap fit2-avoidWrap">
                {AVOID_OPTIONS.map((avoidItem) => {
                  const active = planInput.avoid.includes(avoidItem);
                  return (
                    <button
                      key={avoidItem}
                      type="button"
                      className={`fit2-choiceChip ${active ? "active" : ""}`}
                      onClick={() =>
                        setPlanInput((prev) => ({
                          ...prev,
                          avoid: active ? prev.avoid.filter((item) => item !== avoidItem) : [...prev.avoid, avoidItem],
                        }))
                      }
                    >
                      {avoidItem}
                    </button>
                  );
                })}
              </div>
            </div>

            {generatedPlan ? (
              <div className="fit2-generatedPlan">
                <div className="fit2-planTop">
                  <div>
                    <div className="fit2-modaltitle">{generatedPlan.planName}</div>
                    <div className="fit2-recentsub">{generatedPlan.summary}</div>
                  </div>
                  <button className="fit2-pillbtn" type="button" onClick={() => setTweakOpen(true)}>Regenerate with tweaks</button>
                </div>

                <div className="fit2-planSummaryPremium">
                  <div className="fit2-small"><strong>Why this split was selected</strong></div>
                  <div className="fit2-recentsub" style={{ marginTop: 6 }}>
                    This {generatedPlan.days.length}-day split prioritizes {planInput.primaryGoal} while supporting {planInput.secondaryGoal}. It limits {planInput.avoid.join(", ") || "unwanted movement patterns"} and fits your {planInput.level} level with {planInput.trainingLocation} setup.
                  </div>
                </div>

                <div className="fit2-muscleVisual" aria-label="Target muscle visual">
                  {generatedPlan.targetMuscles.map((muscle) => (
                    <span key={muscle} className="fit2-muscleBadge">{muscle}</span>
                  ))}
                </div>

                {generatedPlan.days.map((day) => (
                  <div key={day.id} className="fit2-dayCard">
                    <div className="fit2-dayHeader">
                      <div>
                        <div className="fit2-templatetitle">{day.name}</div>
                        <div className="fit2-recentsub">{day.focus} • {day.sessionMinutes} min</div>
                      </div>
                      <button className="fit2-templateDelete fit2-templateDelete--premium" type="button" onClick={() => regenerateGeneratedDay(day.id)}>Regenerate day</button>
                    </div>

                    <div className="fit2-planExercises">
                      {day.exercises.map((exercise, exIdx) => (
                        <div key={exercise.id} className="fit2-planExerciseCard">
                          <div className="fit2-planExerciseTop">
                            <div>
                              <div className="fit2-recenttitle">{exercise.name}</div>
                              <div className="fit2-chipRow">
                                {exercise.targets.map((target) => <span key={target} className="fit2-muscleBadge fit2-muscleBadge--muted">{target}</span>)}
                                {exercise.focusTag ? <span className="fit2-muscleBadge">{exercise.focusTag}</span> : null}
                                {exercise.difficulty ? <span className="fit2-muscleBadge fit2-muscleBadge--muted">{exercise.difficulty}</span> : null}
                              </div>
                            </div>
                            <div className="fit2-row fit2-row--tight">
                              <button className="fit2-templateDelete fit2-templateDelete--premium" type="button" onClick={() => moveExercise(day.id, exercise.id, -1)} disabled={exIdx === 0}>↑</button>
                              <button className="fit2-templateDelete fit2-templateDelete--premium" type="button" onClick={() => moveExercise(day.id, exercise.id, 1)} disabled={exIdx === day.exercises.length - 1}>↓</button>
                              <button className="fit2-templateDelete fit2-templateDelete--premium" type="button" onClick={() => swapGeneratedExercise(day.id, exercise.id)}>Swap</button>
                              <button className="fit2-templateDelete fit2-templateDelete--premium" type="button" onClick={() => removeGeneratedExercise(day.id, exercise.id)}>Remove</button>
                            </div>
                          </div>
                          <div className="fit2-recentsub"><strong>Why selected:</strong> {exercise.why}</div>
                          <div className="fit2-recentsub">{exercise.setsReps} • Equipment: {exercise.equipmentNote}</div>
                          <div className="fit2-small">Substitutions: {exercise.substitutions.join(", ")}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="fit2-saveRow">
                  <input
                    className="fit2-input"
                    value={templateSaveName}
                    onChange={(e) => setTemplateSaveName(e.target.value)}
                    placeholder="Rename template before saving"
                  />
                  <label className="fit2-saveToggle">
                    <input type="checkbox" checked={setAsCurrentOnSave} onChange={(e) => setSetAsCurrentOnSave(e.target.checked)} />
                    Set as current plan
                  </label>
                  <button className="fit2-primarywide fit2-primarywide--premium" type="button" onClick={saveGeneratedAsTemplate}>Add to My Templates</button>
                </div>
                {saveNotice ? <div className="fit2-recentsub" style={{ marginTop: 8 }}>{saveNotice}</div> : null}
              </div>
            ) : (
              <div className="fit2-mutedbox" style={{ marginTop: 12 }}>No personalized plan generated yet. Start with “Generate from chat” for a highly specific build.</div>
            )}
          </div>

          <div className="fit2-section">
            <div className="fit2-templateshead">
              <div className="fit2-sectiontitle">Templates</div>
              <div className="fit2-actions">
                <button
                  className="fit2-pillbtn"
                  type="button"
                  onClick={openTemplateCreator}
                >
                  + Template
                </button>
              </div>
            </div>

            <div className="fit2-subtitle">
              My Templates ({templates.length})
            </div>

            <div className="fit2-templategrid">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  className="fit2-templatecard"
                  onClick={() => startFromTemplate(tpl)}
                  type="button"
                >
                  <div className="fit2-templatetop">
                    <div>
                      <div className="fit2-templatetitle">{tpl.name}</div>
                      {currentTemplateId === tpl.id ? <div className="fit2-small">Current plan</div> : null}
                    </div>
                    <div className="fit2-row">
                      <button type="button" className="fit2-templateDelete" onClick={(e) => { e.stopPropagation(); setCurrentTemplate(tpl.id); }}>Set current</button>
                      {!DEFAULT_TEMPLATE_IDS.has(tpl.id) ? (
                        <>
                          <button type="button" className="fit2-templateDelete" onClick={(e) => { e.stopPropagation(); renameTemplate(tpl.id); }}>Rename</button>
                          <button type="button" className="fit2-templateDelete" onClick={(e) => { e.stopPropagation(); duplicateTemplate(tpl.id); }}>Duplicate</button>
                          <button
                            type="button"
                            className="fit2-templateDelete"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTemplate(tpl.id);
                            }}
                          >
                            Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="fit2-templatelist">
                    {tpl.exercises.slice(0, 3).join(", ")}
                    {tpl.exercises.length > 3 ? ", …" : ""}
                  </div>
                  <div className="fit2-templatemeta">
                    <span className="fit2-dot" />
                    Tap to start
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="fit2-section">
            <div className="fit2-calhead">
              <div className="fit2-sectiontitle">Calendar</div>
              <div className="fit2-calnav">
                <button
                  className="fit2-calbtn"
                  onClick={prevMonth}
                  type="button"
                >
                  ←
                </button>
                <div className="fit2-callabel">{monthLabel}</div>
                <button
                  className="fit2-calbtn"
                  onClick={nextMonth}
                  type="button"
                >
                  →
                </button>
              </div>
            </div>

            <div className="fit2-calgrid">
              {["S", "M", "T", "W", "T", "F", "S"].map((dd2, i) => (
                <div key={`${dd2}-${i}`} className="fit2-caldayhead">
                  {dd2}
                </div>
              ))}

              {calCells.map((day, idx) => {
                if (!day)
                  return (
                    <div key={`e-${idx}`} className="fit2-calcell empty" />
                  );
                const iso = isoFromYMD(calYear, calMonth, day);
                const hasWorkout = workoutDates.has(iso);
                const isSelected = selectedDate === iso;

                return (
                  <button
                    key={iso}
                    className={`fit2-calcell ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedDate(iso)}
                    type="button"
                  >
                    <div className="fit2-calnum">{day}</div>
                    {hasWorkout ? <div className="fit2-caldot" /> : null}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="fit2-subtitle">Workouts on {selectedDate}</div>
              {workoutsOnSelectedDate.length === 0 ? (
                <div className="fit2-mutedbox">
                  No workouts saved for this day.
                </div>
              ) : (
                <div className="fit2-recentlist">
                  {workoutsOnSelectedDate.map((w) => (
                    <div key={w.id} className="fit2-recentitem">
                      <div>
                        <div className="fit2-recenttitle">{w.title}</div>
                        <div className="fit2-recentsub">
                          {(w.exercises || []).length} exercises •{" "}
                          {Math.floor((w.durationSec || 0) / 60)} mins
                        </div>
                      </div>
                      <div className="fit2-recentpill">{w.unit || "kg"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="fit2-section">
            <div className="fit2-sectiontitle">Recent</div>
            {recentWorkouts.length === 0 ? (
              <div className="fit2-mutedbox">No workouts saved yet.</div>
            ) : (
              <div className="fit2-recentlist">
                {recentWorkouts.map((w) => (
                  <div key={w.id} className="fit2-recentitem">
                    <div>
                      <div className="fit2-recenttitle">{w.title}</div>
                      <div className="fit2-recentsub">
                        {w.date} • {(w.exercises || []).length} exercises
                      </div>
                    </div>
                    <div className="fit2-recentpill">
                      {Math.floor((w.durationSec || 0) / 60)}m
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== SESSION ========== */}
      {screen === "session" && (
        <div className="fit2-session">
          <div className="fit2-sessiontop">
            <button
              className="fit2-ghosticon"
              onClick={cancelWorkout}
              type="button"
              title="Cancel"
            >
              ✕
            </button>

            <div className="fit2-timer">
              <div className="fit2-timervalue">{formatTime(elapsedMs)}</div>
              <div className="fit2-timerbtns">
                {!running ? (
                  <button
                    className="fit2-pillbtn"
                    onClick={resumeTimer}
                    type="button"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    className="fit2-pillbtn"
                    onClick={pauseTimer}
                    type="button"
                  >
                    Pause
                  </button>
                )}
                <button
                  className="fit2-pillbtn ghost"
                  onClick={resetTimer}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>

            <button
              className="fit2-finish"
              onClick={finishWorkout}
              type="button"
            >
              Finish
            </button>
          </div>

          <div className="fit2-sessioncard">
            <input
              className="fit2-titleinput"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="Workout name"
            />

            <div className="fit2-meta">
              <div className="fit2-metaitem">
                <span>📅</span>
                <input
                  className="fit2-metainput"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </div>
            </div>

            <button
              className="fit2-addex"
              onClick={() => setPickerOpen(true)}
              type="button"
            >
              Add Exercises
            </button>

            <button
              className="fit2-cancel"
              onClick={cancelWorkout}
              type="button"
            >
              Cancel Workout
            </button>
          </div>

          {sessionExercises.length > 0 && (
            <div className="fit2-exlist">
              {sessionExercises.map((ex, exIndex) => (
                <div key={exIndex} className="fit2-excard">
                  <div className="fit2-exhead">
                    <div style={{ width: "100%" }}>
                      <input
                        className="fit2-exname"
                        value={ex.name}
                        onChange={(e) =>
                          updateExerciseName(exIndex, e.target.value)
                        }
                        placeholder="Exercise"
                      />
                      <div className="fit2-lastline">
                        {renderLastInfo(ex.name)}{" "}
                        {historyMap.get((ex.name || "").trim())?.best ? (
                          <>
                            <span className="fit2-divider">•</span>
                            {renderBestInfo(ex.name)}
                          </>
                        ) : null}
                      </div>
                      <div className="fit2-progressionTip">
                        {getProgressionTip(ex.name, ex.mode)}
                      </div>
                    </div>

                    <button
                      className="fit2-ghosticon"
                      onClick={() => removeExercise(exIndex)}
                      type="button"
                      title="Remove"
                    >
                      …
                    </button>
                  </div>

                  <div className="fit2-exmeta">
                    {ex.category ? (
                      <span className="fit2-tag">{ex.category}</span>
                    ) : null}

                    <div className="fit2-mode">
                      <button
                        type="button"
                        className={`fit2-modebtn ${ex.mode === "reps" ? "active" : ""}`}
                        onClick={() => setExerciseMode(exIndex, "reps")}
                      >
                        Reps
                      </button>
                      <button
                        type="button"
                        className={`fit2-modebtn ${ex.mode === "time" ? "active" : ""}`}
                        onClick={() => setExerciseMode(exIndex, "time")}
                      >
                        Time
                      </button>
                    </div>
                  </div>

                  <textarea
                    className="fit2-note"
                    value={ex.note}
                    onChange={(e) =>
                      updateExerciseNote(exIndex, e.target.value)
                    }
                    placeholder="Notes (optional) — e.g. felt heavy today, slow tempo, etc."
                  />

                  <div className="fit2-sethead">
                    <div>SET</div>
                    <div>TYPE</div>
                    {ex.mode === "reps" ? (
                      <div>{unit.toUpperCase()}</div>
                    ) : (
                      <div>TIME</div>
                    )}
                    {ex.mode === "reps" ? <div>REPS</div> : <div>DIST</div>}
                    <div>✓</div>
                    <div></div>
                  </div>

                  {ex.sets.map((s, setIndex) => (
                    <div key={setIndex} className="fit2-setrow">
                      <div className="fit2-setnum">{setIndex + 1}</div>

                      <select
                        className="fit2-select"
                        value={s.type}
                        onChange={(e) =>
                          updateSet(exIndex, setIndex, "type", e.target.value)
                        }
                      >
                        <option>Normal</option>
                        <option>Warm-up</option>
                        <option>Drop</option>
                      </select>

                      {ex.mode === "reps" ? (
                        <>
                          <input
                            className="fit2-setinput"
                            type="number"
                            min="0"
                            value={s.weight}
                            onChange={(e) =>
                              updateSet(
                                exIndex,
                                setIndex,
                                "weight",
                                e.target.value,
                              )
                            }
                            placeholder={unit}
                          />
                          <input
                            className="fit2-setinput"
                            type="number"
                            min="0"
                            value={s.reps}
                            onChange={(e) =>
                              updateSet(
                                exIndex,
                                setIndex,
                                "reps",
                                e.target.value,
                              )
                            }
                            placeholder="reps"
                          />
                        </>
                      ) : (
                        <>
                          <input
                            className="fit2-setinput"
                            type="number"
                            min="0"
                            value={s.timeSec}
                            onChange={(e) =>
                              updateSet(
                                exIndex,
                                setIndex,
                                "timeSec",
                                e.target.value,
                              )
                            }
                            placeholder="sec"
                          />
                          <input
                            className="fit2-setinput"
                            type="number"
                            min="0"
                            value={s.distance}
                            onChange={(e) =>
                              updateSet(
                                exIndex,
                                setIndex,
                                "distance",
                                e.target.value,
                              )
                            }
                            placeholder="km (opt)"
                          />
                        </>
                      )}

                      <button
                        className={`fit2-done ${s.done ? "on" : ""}`}
                        onClick={() =>
                          updateSet(exIndex, setIndex, "done", !s.done)
                        }
                        type="button"
                      >
                        {s.done ? "✓" : ""}
                      </button>

                      <button
                        className="fit2-minus"
                        onClick={() => removeSet(exIndex, setIndex)}
                        type="button"
                        title="Remove set"
                      >
                        −
                      </button>
                    </div>
                  ))}

                  <div className="fit2-exfooter">
                    <button
                      className="fit2-pillbtn"
                      onClick={() => addSet(exIndex)}
                      type="button"
                    >
                      + Add Set
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== HISTORY ========== */}
      {screen === "history" && (
        <div className="fit2-start">
          <div className="fit2-headerblock">
            <div className="fit2-kicker">History</div>
            <h1 className="fit2-h1">All Workouts</h1>
            <div className="fit2-row" style={{ marginTop: 10 }}>
              <button
                className="fit2-pillbtn"
                type="button"
                onClick={() => setScreen("hub")}
              >
                ← Fitness Hub
              </button>
            </div>
          </div>

          {sortedWorkouts.length === 0 ? (
            <div className="fit2-mutedbox">No workouts saved yet.</div>
          ) : (
            <div className="fit2-recentlist">
              {sortedWorkouts.map((w) => (
                <button
                  key={w.id}
                  className="fit2-recentitem"
                  onClick={() => {
                    setDetailWorkoutId(w.id);
                    setScreen("detail");
                  }}
                  type="button"
                >
                  <div style={{ textAlign: "left" }}>
                    <div className="fit2-recenttitle">{w.title}</div>
                    <div className="fit2-recentsub">
                      {w.date} • {(w.exercises || []).length} exercises •{" "}
                      {Math.floor((w.durationSec || 0) / 60)} mins
                    </div>
                  </div>
                  <div className="fit2-recentpill">Open</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== WORKOUT DETAIL ========== */}
      {screen === "detail" && (
        <div className="fit2-start">
          <div className="fit2-headerblock">
            <div className="fit2-kicker">Workout</div>
            <h1 className="fit2-h1">Details</h1>
            <div className="fit2-row" style={{ marginTop: 10 }}>
              <button
                className="fit2-pillbtn"
                type="button"
                onClick={() => setScreen("history")}
              >
                ← Back to History
              </button>
            </div>
          </div>

          {!detailWorkout ? (
            <div className="fit2-mutedbox">Workout not found.</div>
          ) : (
            <div className="fit2-simpleCard">
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                {detailWorkout.title}
              </div>
              <div className="fit2-small" style={{ marginTop: 6 }}>
                {detailWorkout.date} •{" "}
                {Math.floor((detailWorkout.durationSec || 0) / 60)} mins •{" "}
                {detailWorkout.unit}
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {(detailWorkout.exercises || []).map((ex, idx) => (
                  <div
                    key={`${ex.name}-${idx}`}
                    className="fit2-simpleCard"
                    style={{ boxShadow: "none" }}
                  >
                    <div style={{ fontWeight: 900 }}>{ex.name}</div>
                    {ex.note ? (
                      <div className="fit2-small" style={{ marginTop: 6 }}>
                        {ex.note}
                      </div>
                    ) : null}

                    <div className="fit2-small" style={{ marginTop: 10 }}>
                      {(ex.sets || []).length} sets
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {(ex.sets || []).map((s, sIdx) => (
                        <div key={sIdx} className="fit2-row">
                          <div className="fit2-recentpill">#{sIdx + 1}</div>
                          <div className="fit2-small">
                            {ex.mode === "time"
                              ? `${s.timeSec || 0}s ${s.distance ? `• ${s.distance}km` : ""}`
                              : `${s.weight || 0}${detailWorkout.unit} × ${s.reps || 0}`}
                            {s.type ? ` • ${s.type}` : ""}
                            {s.done ? " • ✓" : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <button
                  className="fit2-pillbtn fit2-danger"
                  type="button"
                  onClick={() => {
                    const next = workouts.filter(
                      (w) => w.id !== detailWorkout.id,
                    );
                    updateMany({ workouts: next });
                    setScreen("history");
                  }}
                >
                  Delete workout
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== CARDIO ========== */}
      {screen === "cardio" && (
        <div className="fit2-start">
          <div className="fit2-headerblock">
            <div className="fit2-kicker">Cardio</div>
            <h1 className="fit2-h1">Quick Log</h1>
            <div className="fit2-row" style={{ marginTop: 10 }}>
              <button
                className="fit2-pillbtn"
                type="button"
                onClick={() => setScreen("hub")}
              >
                ← Fitness Hub
              </button>
            </div>
          </div>

          <div className="fit2-simpleCard">
            <div className="fit2-row">
              <select
                className="fit2-input"
                value={cardioType}
                onChange={(e) => setCardioType(e.target.value)}
              >
                <option>Run</option>
                <option>Walk</option>
                <option>Cycle</option>
                <option>Stairmaster</option>
                <option>Row</option>
              </select>
            </div>

            <div className="fit2-row" style={{ marginTop: 10 }}>
              <input
                className="fit2-input"
                type="number"
                placeholder="Duration (mins)"
                value={cardioMin}
                onChange={(e) => setCardioMin(e.target.value)}
              />
              <input
                className="fit2-input"
                type="number"
                placeholder="Distance (km) optional"
                value={cardioKm}
                onChange={(e) => setCardioKm(e.target.value)}
              />
            </div>

            <div className="fit2-small" style={{ marginTop: 10 }}>
              Pace: <strong>{paceFrom(cardioKm, cardioMin)}</strong>
            </div>

            <div className="fit2-row" style={{ marginTop: 10 }}>
              <input
                className="fit2-input"
                placeholder="Note (optional)"
                value={cardioNote}
                onChange={(e) => setCardioNote(e.target.value)}
              />
            </div>

            <div className="fit2-row" style={{ marginTop: 12 }}>
              <button
                className="fit2-primarywide"
                type="button"
                onClick={addCardio}
              >
                Save Cardio
              </button>
            </div>
          </div>

          <div className="fit2-section">
            <div className="fit2-sectiontitle">Recent Cardio</div>
            {cardioLogs.length === 0 ? (
              <div className="fit2-mutedbox">No cardio logs yet.</div>
            ) : (
              <div className="fit2-recentlist">
                {cardioLogs.slice(0, 10).map((c) => (
                  <div key={c.id} className="fit2-recentitem">
                    <div>
                      <div className="fit2-recenttitle">{c.type}</div>
                      <div className="fit2-recentsub">
                        {c.date} • {c.durationMin} min
                        {c.distanceKm ? ` • ${c.distanceKm}km` : ""} •{" "}
                        {paceFrom(c.distanceKm, c.durationMin)}
                      </div>
                    </div>
                    <div className="fit2-recentpill">Saved</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== STEPS ========== */}
      {screen === "steps" && (
        <div className="fit2-start">
          <div className="fit2-headerblock">
            <div className="fit2-kicker">Steps</div>
            <h1 className="fit2-h1">Daily Movement</h1>
            <div className="fit2-row" style={{ marginTop: 10 }}>
              <button
                className="fit2-pillbtn"
                type="button"
                onClick={() => setScreen("hub")}
              >
                ← Fitness Hub
              </button>
            </div>
          </div>

          <div className="fit2-simpleCard">
            <div className="fit2-small">
              Goal: <strong>{stepGoal}</strong> steps
            </div>
            <div className="fit2-small" style={{ marginTop: 6 }}>
              Streak: <strong>{streak}</strong> day(s)
            </div>

            <div className="fit2-row" style={{ marginTop: 12 }}>
              <input
                className="fit2-input"
                type="number"
                placeholder="Steps today"
                value={stepsToday === "" ? String(todaysSteps || "") : stepsToday}
                onChange={(e) => setStepsToday(e.target.value)}
              />
            </div>

            <div className="fit2-row" style={{ marginTop: 12 }}>
              <button
                className="fit2-primarywide"
                type="button"
                onClick={saveSteps}
              >
                Save Steps
              </button>
            </div>
          </div>

          <div className="fit2-section">
            <div className="fit2-sectiontitle">Recent Step Logs</div>
            {stepsLog.length === 0 ? (
              <div className="fit2-mutedbox">No steps logged yet.</div>
            ) : (
              <div className="fit2-recentlist">
                {stepsLog
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map((s) => (
                    <div key={s.date} className="fit2-recentitem">
                      <div>
                        <div className="fit2-recenttitle">{s.date}</div>
                        <div className="fit2-recentsub">
                          {s.steps} steps{" "}
                          {Number(s.steps) >= stepGoal ? "• ✅ goal hit" : ""}
                        </div>
                      </div>
                      <div className="fit2-recentpill">
                        {Math.round((Number(s.steps) / stepGoal) * 100)}%
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tweakOpen && generatedPlan ? (
        <div className="fit2-modal">
          <div className="fit2-modalcard fit2-templateModal">
            <div className="fit2-modaltop">
              <button className="fit2-ghosticon" onClick={() => setTweakOpen(false)} type="button">✕</button>
              <div className="fit2-modaltitle">Premium Plan Tweaks</div>
              <button className="fit2-pillbtn fit2-pillbtn--premium" type="button" onClick={() => tweakGeneratedPlan({})}>Apply + Regenerate</button>
            </div>
            <div className="fit2-recentsub">Choose one or combine multiple chips for more specific recalibration.</div>
            <div className="fit2-choiceWrap" style={{ marginTop: 10 }}>
              <button className="fit2-choiceChip" type="button" onClick={() => tweakGeneratedPlan({ primaryGoal: "build glutes with less quad emphasis", avoid: [...new Set([...planInput.avoid, "avoid too much quad growth"])] })}>More glute emphasis</button>
              <button className="fit2-choiceChip" type="button" onClick={() => tweakGeneratedPlan({ avoid: [...new Set([...planInput.avoid, "avoid too much quad growth"])] })}>Less quad bias</button>
              <button className="fit2-choiceChip" type="button" onClick={() => tweakGeneratedPlan({ avoid: [...new Set([...planInput.avoid, "lower-impact training"])] })}>Lower impact</button>
              <button className="fit2-choiceChip" type="button" onClick={() => tweakGeneratedPlan({ level: "beginner" })}>Beginner-friendly</button>
              <button className="fit2-choiceChip" type="button" onClick={() => tweakGeneratedPlan({ sessionStructure: { sessionMinutes: 35, exercisesPerDay: 3 } })}>Shorter workouts</button>
              <button className="fit2-choiceChip" type="button" onClick={() => tweakGeneratedPlan({ secondaryGoal: "tone upper body without adding much size" })}>More upper-body balance</button>
              <button className="fit2-choiceChip" type="button" onClick={() => tweakGeneratedPlan({ secondaryGoal: "improve posture / upper back tone" })}>More posture work</button>
              <button className="fit2-choiceChip" type="button" onClick={() => tweakGeneratedPlan({ preferredStyle: "definition sculpt" })}>More definition focus</button>
              <button className="fit2-choiceChip" type="button" onClick={() => tweakGeneratedPlan({ trainingLocation: "home", equipmentAccess: "home", avoid: [...new Set([...planInput.avoid, "home-only substitutions"])] })}>Home-only alternatives</button>
            </div>
          </div>
        </div>
      ) : null}

      {templateOpen && (
        <div className="fit2-modal">
          <div className="fit2-modalcard fit2-templateModal">
            <div className="fit2-modaltop">
              <button
                className="fit2-ghosticon"
                onClick={() => setTemplateOpen(false)}
                type="button"
              >
                ✕
              </button>
              <div className="fit2-modaltitle">Create Template</div>
              <button className="fit2-pillbtn" onClick={saveTemplate} type="button">
                Save
              </button>
            </div>

            <input
              className="fit2-search"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
            />

            <textarea
              className="fit2-note"
              value={templateExercisesInput}
              onChange={(e) => setTemplateExercisesInput(e.target.value)}
              placeholder="One exercise per line (e.g. Squat)"
            />

            <div className="fit2-small">
              Tip: add 3-8 exercises. You can start from this template immediately.
            </div>
          </div>
        </div>
      )}

      {/* ========== EXERCISE PICKER MODAL ========== */}
      {pickerOpen && (
        <div className="fit2-modal">
          <div className="fit2-modalcard">
            <div className="fit2-modaltop">
              <button
                className="fit2-ghosticon"
                onClick={() => setPickerOpen(false)}
                type="button"
              >
                ✕
              </button>
              <div className="fit2-modaltitle">Add Exercise</div>
              <button
                className="fit2-pillbtn"
                onClick={() => setPickerOpen(false)}
                type="button"
              >
                Done
              </button>
            </div>

            <input
              className="fit2-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
            />

            {search.trim().length > 0 &&
              !EXERCISE_LIBRARY.some(
                (x) => x.name.toLowerCase() === search.trim().toLowerCase(),
              ) && (
                <button
                  className="fit2-addcustom"
                  onClick={() =>
                    addExerciseByName(search.trim(), { useLast: false })
                  }
                  type="button"
                >
                  + Add “{search.trim()}” (Custom)
                </button>
              )}

            <div className="fit2-list">
              {filteredLibrary.map((item) => {
                const info = historyMap.get(item.name);
                const lastText = info?.last
                  ? `Last: ${info.last.summary} • ${formatRelativeDate(info.last.date)}`
                  : "No history yet";
                const bestText = info?.best ? `Best: ${info.best.summary}` : "";
                const isPR =
                  info?.bestDate &&
                  info?.last?.date &&
                  info.bestDate === info.last.date;

                return (
                  <div key={item.name} className="fit2-listrowwrap">
                    <button
                      className="fit2-listrow"
                      onClick={() =>
                        addExerciseByName(item.name, { useLast: false })
                      }
                      type="button"
                    >
                      <div>
                        <div className="fit2-listname">
                          {item.name}{" "}
                          {isPR ? <span className="fit2-pr">PR</span> : null}
                        </div>
                        <div className="fit2-listsub">{item.category}</div>
                        <div className="fit2-historyline">
                          {lastText}
                          {bestText ? ` • ${bestText}` : ""}
                        </div>
                      </div>
                      <div className="fit2-qmark">+</div>
                    </button>

                    {info?.lastSets?.length ? (
                      <button
                        className="fit2-uselast"
                        onClick={() =>
                          addExerciseByName(item.name, { useLast: true })
                        }
                        type="button"
                      >
                        Use last
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </HubShell>
  );
}
