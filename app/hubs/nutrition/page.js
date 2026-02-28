// app/hubs/nutrition/page.js
"use client";

import Link from "next/link";
import Image from "next/image";
import "./nutrition.css";
import { useOnboarding } from "../../context/OnboardingContext";
import { db } from "../../firebase/config";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";

/* ------------------------
   utils
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

function clampNumber(value) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function pct(val, goal) {
  const v = clampNumber(val);
  const g = clampNumber(goal);
  if (!g) return 0;
  return Math.max(0, Math.min(100, Math.round((v / g) * 100)));
}

/* =========================
   BODY & CALORIE ENGINE
========================= */
function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  return weightKg / (h * h);
}

function bmiCategory(bmi) {
  if (!bmi) return "--";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function activityMultiplier(level) {
  switch (level) {
    case "Sedentary":
      return 1.2;
    case "Lightly Active":
      return 1.375;
    case "Moderately Active":
      return 1.55;
    case "Very Active":
      return 1.725;
    default:
      return 1.4;
  }
}

/**
 * female default:
 * Mifflin-St Jeor BMR = 10W + 6.25H - 5A - 161
 */
function estimateMaintenance(weightKg, heightCm, age, activity) {
  if (!weightKg || !heightCm || !age) return null;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  return Math.round(bmr * activityMultiplier(activity));
}

function adjustForGoal(maintenance, goal) {
  if (!maintenance) return null;
  switch (goal) {
    case "Lose 0.5kg/week":
      return maintenance - 500;
    case "Lose 1kg/week":
      return maintenance - 1000;
    case "Gain 0.25kg/week":
      return maintenance + 250;
    case "Gain 0.5kg/week":
      return maintenance + 500;
    default:
      return maintenance;
  }
}

/* ------------------------
   MealDB helpers
------------------------ */
function mealDBIngredients(meal) {
  // MealDB returns strIngredient1..20 + strMeasure1..20
  const out = [];
  if (!meal) return out;

  for (let i = 1; i <= 20; i++) {
    const ing = String(meal[`strIngredient${i}`] || "").trim();
    const meas = String(meal[`strMeasure${i}`] || "").trim();
    if (!ing) continue;
    out.push({ ingredient: ing, measure: meas });
  }
  return out;
}

function normalizeRecipeCard(recipe) {
  if (!recipe || typeof recipe !== "object") return null;

  const id = recipe.id ?? recipe.idMeal ?? recipe.recipeId;
  if (!id) return null;

  return {
    ...recipe,
    id: String(id),
    title: recipe.title || recipe.strMeal || "Recipe",
    image: recipe.image || recipe.strMealThumb || null,
  };
}

/* ------------------------
   UI components
------------------------ */
function Section({ title, sub, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="nutri-section">
      <button
        type="button"
        className="nutri-sectionHead"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="nutri-sectionHeadLeft">
          <div className="nutri-sectionTitle">{title}</div>
          {sub ? <div className="nutri-sectionSub">{sub}</div> : null}
        </div>
        <div className="nutri-chev">{open ? "–" : "+"}</div>
      </button>

      {open ? <div className="nutri-sectionBody">{children}</div> : null}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="nutri-modal" onClick={onClose} role="presentation">
      <div
        className="nutri-modalCard"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="nutri-modalTop">
          <div className="nutri-modalTitle">{title}</div>
          <button
            type="button"
            className="nutri-iconBtn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Swipe-to-delete row
 */
function SwipeRow({ children, onDelete, deleteLabel = "Delete" }) {
  const startX = useRef(0);
  const dragging = useRef(false);
  const [x, setX] = useState(0);
  const [open, setOpen] = useState(false);

  const MAX_LEFT = -88;
  const THRESH_OPEN = -44;

  function onTouchStart(e) {
    dragging.current = true;
    startX.current = e.touches[0].clientX;
  }

  function onTouchMove(e) {
    if (!dragging.current) return;
    const currentX = e.touches[0].clientX;
    const dx = currentX - startX.current;

    const base = open ? MAX_LEFT : 0;
    let next = base + dx;

    if (next > 0) next = 0;
    if (next < MAX_LEFT) next = MAX_LEFT;

    setX(next);
  }

  function onTouchEnd() {
    dragging.current = false;

    if (!open) {
      if (x <= THRESH_OPEN) {
        setX(MAX_LEFT);
        setOpen(true);
      } else {
        setX(0);
        setOpen(false);
      }
    } else {
      if (x > THRESH_OPEN) {
        setX(0);
        setOpen(false);
      } else {
        setX(MAX_LEFT);
        setOpen(true);
      }
    }
  }

  function close() {
    setX(0);
    setOpen(false);
  }

  return (
    <div className="nutri-swipeWrap">
      <button type="button" className="nutri-swipeDelete" onClick={onDelete}>
        {deleteLabel}
      </button>

      <div
        className="nutri-swipeCard"
        style={{ transform: `translateX(${x}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => {
          if (open) close();
        }}
        role="presentation"
      >
        {children}
      </div>
    </div>
  );
}

export default function Page() {
  const { data, updateMany, ready, user } = useOnboarding();

  /* ------------------------
     ALL hooks must be here (no early return before hooks)
  ------------------------ */
  const [tab, setTab] = useState("tracker"); // tracker | recipes | supplements
  const date = todayISO();

  // sticky mini header
  const [stickyOn, setStickyOn] = useState(false);
  useEffect(() => {
    const onScroll = () => setStickyOn(window.scrollY > 160);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ------------------------
     HYDRATION
  ------------------------ */
  const [water, setWater] = useState("0");
  const [goal, setGoal] = useState("3");

  useEffect(() => {
    if (!ready) return;
    setWater(String(data?.waterLitres ?? 0));
    setGoal(String(data?.waterGoalLitres ?? 3));
  }, [ready, data?.waterLitres, data?.waterGoalLitres]);

  const hydrationPreview = useMemo(() => {
    const litres = clampNumber(water);
    const goalLitres = clampNumber(goal) || 3;
    const pctVal = Math.min(100, Math.round((litres / goalLitres) * 100));
    return { litres, goalLitres, pct: pctVal };
  }, [water, goal]);

  function saveHydration() {
    updateMany({
      waterLitres: hydrationPreview.litres,
      waterGoalLitres: hydrationPreview.goalLitres,
      waterIntake: `${hydrationPreview.litres}L`,
      hydrationProgress: hydrationPreview.pct,
    });
  }

  function addQuickWater(amount) {
    const current = clampNumber(water);
    const next = round1(current + amount);
    setWater(String(next));
  }

  function resetHydration() {
    updateMany({
      waterLitres: 0,
      waterIntake: "0L",
      hydrationProgress: 0,
    });
    setWater("0");
  }

  /* ------------------------
     TRACKER (Food logs)
  ------------------------ */
  const [meal, setMeal] = useState("breakfast");

  // log food modal
  const [logFoodOpen, setLogFoodOpen] = useState(false);

  // manual add
  const [quickName, setQuickName] = useState("");
  const [quickServings, setQuickServings] = useState("1");
  const [quickCals, setQuickCals] = useState("");
  const [quickP, setQuickP] = useState("");
  const [quickC, setQuickC] = useState("");
  const [quickF, setQuickF] = useState("");

  const todaysLogs = useMemo(() => {
    const logs = Array.isArray(data?.foodLogs) ? data.foodLogs : [];
    return logs.filter((x) => x?.date === date);
  }, [data?.foodLogs, date]);

  const totals = useMemo(() => {
    const sum = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    for (const entry of todaysLogs) {
      sum.calories += clampNumber(entry?.totals?.calories);
      sum.proteinG += clampNumber(entry?.totals?.proteinG);
      sum.carbsG += clampNumber(entry?.totals?.carbsG);
      sum.fatG += clampNumber(entry?.totals?.fatG);
    }
    return {
      calories: Math.round(sum.calories),
      proteinG: Math.round(sum.proteinG),
      carbsG: Math.round(sum.carbsG),
      fatG: Math.round(sum.fatG),
    };
  }, [todaysLogs]);

  const goals = useMemo(() => {
    const cal = clampNumber(data?.calorieGoal) || 1800;
    const mg = data?.macroGoals || {};
    return {
      cal,
      proteinG: clampNumber(mg.proteinG) || 120,
      carbsG: clampNumber(mg.carbsG) || 200,
      fatG: clampNumber(mg.fatG) || 60,
    };
  }, [data?.calorieGoal, data?.macroGoals]);

  const remaining = useMemo(
    () => Math.round(goals.cal - totals.calories),
    [goals.cal, totals.calories],
  );

  useEffect(() => {
    async function syncDailyNutrition() {
      if (!ready || !user?.uid) return;
      const ref = doc(db, "users", user.uid, "daily", date);
      await setDoc(
        ref,
        {
          date,
          calories: totals.calories,
          waterMl: Math.round((clampNumber(data?.waterLitres) || 0) * 1000),
          macros: {
            proteinG: totals.proteinG,
            carbsG: totals.carbsG,
            fatG: totals.fatG,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    syncDailyNutrition();
  }, [
    ready,
    user?.uid,
    date,
    totals.calories,
    totals.proteinG,
    totals.carbsG,
    totals.fatG,
    data?.waterLitres,
  ]);

  function addQuickFoodManual() {
    const name = quickName.trim();
    if (!name) return;

    const servings = clampNumber(quickServings) || 1;
    const perServing = {
      calories: clampNumber(quickCals),
      proteinG: clampNumber(quickP),
      carbsG: clampNumber(quickC),
      fatG: clampNumber(quickF),
    };

    const totalsCalc = {
      calories: Math.round(perServing.calories * servings),
      proteinG: Math.round(perServing.proteinG * servings),
      carbsG: Math.round(perServing.carbsG * servings),
      fatG: Math.round(perServing.fatG * servings),
    };

    const entry = {
      id: uid(),
      date,
      meal,
      name,
      source: "manual",
      servings,
      perServing,
      totals: totalsCalc,
      createdAt: Date.now(),
    };

    updateMany({ foodLogs: [...(data?.foodLogs || []), entry] });

    setQuickName("");
    setQuickServings("1");
    setQuickCals("");
    setQuickP("");
    setQuickC("");
    setQuickF("");
  }

  function deleteEntry(id) {
    const next = (data?.foodLogs || []).filter((x) => x.id !== id);
    updateMany({ foodLogs: next });
  }

  const bars = useMemo(() => {
    return {
      cal: pct(totals.calories, goals.cal),
      protein: pct(totals.proteinG, goals.proteinG),
      carbs: pct(totals.carbsG, goals.carbsG),
      fat: pct(totals.fatG, goals.fatG),
    };
  }, [totals, goals]);

  function MacroBar({ label, value, goal: g, percent }) {
    return (
      <div
        className={`nutri-bar ${label.toLowerCase() === "protein" ? "protein" : label.toLowerCase() === "carbs" ? "carbs" : "fat"}`}
      >
        <div className="nutri-barTop">
          <span>
            {label}: <span className="nutri-strong">{value}g</span>
          </span>
          <span>
            {value}/{g}g
          </span>
        </div>
        <div className="nutri-barTrack">
          <div className="nutri-barFill" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  /* ------------------------
     SMART calories
  ------------------------ */
  const unit = data?.weightUnit || "kg";
  const weightKg =
    unit === "lbs"
      ? Number(data?.weight || 0) * 0.453592
      : Number(data?.weight || 0);
  const heightCm = Number(data?.height || 0);
  const age = data?.dob
    ? Math.floor(
        (Date.now() - new Date(data.dob).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25),
      )
    : null;

  const bmi = calcBMI(weightKg, heightCm);
  const maintenance = estimateMaintenance(
    weightKg,
    heightCm,
    age,
    data?.activity,
  );

  const [calGoalInput, setCalGoalInput] = useState(
    String(data?.calorieGoal ?? goals.cal),
  );
  useEffect(() => {
    if (!ready) return;
    setCalGoalInput(String(data?.calorieGoal ?? goals.cal));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, data?.calorieGoal]);

  const calWarnings = useMemo(() => {
    const arr = [];
    const cg = clampNumber(calGoalInput || data?.calorieGoal || goals.cal);

    if (!data?.height || !data?.weight || !data?.dob) {
      arr.push(
        "Add height, weight, and DOB in onboarding for accurate estimates.",
      );
    }
    if (cg && cg < 1200) {
      arr.push(
        "This calorie goal is very low. If you feel weak/dizzy or your training tanks, raise it.",
      );
    }
    if (maintenance && cg) {
      const diff = maintenance - cg;
      if (diff > 1000)
        arr.push(
          "Deficit > 1000 kcal/day is aggressive. Expect fatigue + worse training.",
        );
    }
    return arr;
  }, [
    calGoalInput,
    data?.height,
    data?.weight,
    data?.dob,
    maintenance,
    data?.calorieGoal,
    goals.cal,
  ]);

  function setGoalFromDropdown(option) {
    const adjusted = adjustForGoal(maintenance, option);
    if (!adjusted) return;
    updateMany({ calorieGoal: adjusted });
    setCalGoalInput(String(adjusted));
  }

  function resetToMaintenance() {
    if (!maintenance) return;
    updateMany({ calorieGoal: maintenance });
    setCalGoalInput(String(maintenance));
  }

  function saveCalorieGoal() {
    const val = clampNumber(calGoalInput);
    updateMany({ calorieGoal: val });
  }

  /* ------------------------
     RECIPES (MealDB)
     Option 2: show recipe details in modal, no external links,
     and let user estimate macros per serving (saved per recipe).
  ------------------------ */
  const [recipeQuery, setRecipeQuery] = useState("");
  const [recipeResults, setRecipeResults] = useState([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeErr, setRecipeErr] = useState("");

  const [recipeOpen, setRecipeOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeDetailLoading, setRecipeDetailLoading] = useState(false);
  const [recipeDetailErr, setRecipeDetailErr] = useState("");
  const [recipeServings, setRecipeServings] = useState("1");

  // macro estimate inputs (per serving)
  const [estCals, setEstCals] = useState("");
  const [estP, setEstP] = useState("");
  const [estC, setEstC] = useState("");
  const [estF, setEstF] = useState("");

  // saved estimates in onboarding data
  const recipeEstimates = useMemo(() => {
    const obj = data?.recipeEstimates;
    return obj && typeof obj === "object" ? obj : {};
  }, [data?.recipeEstimates]);

  useEffect(() => {
    const q = recipeQuery.trim();
    if (tab !== "recipes") return;

    if (!q) {
      setRecipeResults([]);
      setRecipeErr("");
      return;
    }

    const t = setTimeout(async () => {
      try {
        setRecipeLoading(true);
        setRecipeErr("");

        const res = await fetch(
          `/api/recipes/search?q=${encodeURIComponent(q)}`,
          {
            cache: "no-store",
          },
        );

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Recipe search failed");

        const normalized = Array.isArray(json?.results)
          ? json.results.map(normalizeRecipeCard).filter(Boolean)
          : [];

        setRecipeResults(normalized);
      } catch (e) {
        setRecipeResults([]);
        setRecipeErr(e?.message || "Recipe search failed");
      } finally {
        setRecipeLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [recipeQuery, tab]);

  async function openRecipeModal(recipeCard) {
    const id = recipeCard?.id ?? recipeCard?.idMeal ?? recipeCard?.recipeId;
    setRecipeOpen(true);
    setSelectedRecipeId(id || null);
    setSelectedRecipe(null);
    setRecipeServings("1");
    setRecipeDetailErr("");

    // load saved estimate if exists
    const saved = id ? recipeEstimates?.[String(id)] : null;
    setEstCals(saved?.calories ? String(saved.calories) : "");
    setEstP(saved?.proteinG ? String(saved.proteinG) : "");
    setEstC(saved?.carbsG ? String(saved.carbsG) : "");
    setEstF(saved?.fatG ? String(saved.fatG) : "");

    if (!id) {
      setRecipeDetailErr("Missing recipe id");
      return;
    }

    setRecipeDetailLoading(true);
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error || "Failed to load recipe details");
      setSelectedRecipe(json?.recipe || null);
    } catch (e) {
      setRecipeDetailErr(e?.message || "Failed to load recipe details");
      setSelectedRecipe(null);
    } finally {
      setRecipeDetailLoading(false);
    }
  }

  function saveRecipeEstimate() {
    if (!selectedRecipeId) return;

    const next = {
      ...(recipeEstimates || {}),
      [String(selectedRecipeId)]: {
        calories: clampNumber(estCals),
        proteinG: clampNumber(estP),
        carbsG: clampNumber(estC),
        fatG: clampNumber(estF),
        updatedAt: Date.now(),
      },
    };
    updateMany({ recipeEstimates: next });
  }

  function addRecipeToLog() {
    if (!selectedRecipeId) return;

    const servings = clampNumber(recipeServings) || 1;
    const perServing = {
      calories: clampNumber(estCals),
      proteinG: clampNumber(estP),
      carbsG: clampNumber(estC),
      fatG: clampNumber(estF),
    };

    const totalsCalc = {
      calories: Math.round(perServing.calories * servings),
      proteinG: Math.round(perServing.proteinG * servings),
      carbsG: Math.round(perServing.carbsG * servings),
      fatG: Math.round(perServing.fatG * servings),
    };

    const name = selectedRecipe?.title || selectedRecipe?.strMeal || "Recipe";

    const entry = {
      id: uid(),
      date,
      meal,
      name,
      source: "recipe",
      recipeId: String(selectedRecipeId),
      servings,
      perServing,
      totals: totalsCalc,
      createdAt: Date.now(),
    };

    updateMany({ foodLogs: [...(data?.foodLogs || []), entry] });

    // save estimate so next time it's auto-filled
    saveRecipeEstimate();

    setRecipeOpen(false);
    setSelectedRecipe(null);
    setSelectedRecipeId(null);
    setRecipeServings("1");
  }

  /* ------------------------
     SUPPLEMENTS (back)
  ------------------------ */
  const supplementList = useMemo(() => {
    return Array.isArray(data?.supplementSchedule)
      ? data.supplementSchedule
      : [];
  }, [data?.supplementSchedule]);

  const [suppPickerOpen, setSuppPickerOpen] = useState(false);
  const [suppSearch, setSuppSearch] = useState("");
  const [suppResults, setSuppResults] = useState([]);
  const [suppLoading, setSuppLoading] = useState(false);
  const [suppErr, setSuppErr] = useState("");

  const [selectedSuppInfo, setSelectedSuppInfo] = useState(null);
  const [suppName, setSuppName] = useState("");
  const [suppTime, setSuppTime] = useState("morning");
  const [suppWithFood, setSuppWithFood] = useState(true);
  const [suppDose, setSuppDose] = useState("");
  const [suppNote, setSuppNote] = useState("");

  useEffect(() => {
    if (!suppPickerOpen) return;

    const t = setTimeout(async () => {
      try {
        setSuppLoading(true);
        setSuppErr("");

        const res = await fetch(
          `/api/supplements?q=${encodeURIComponent(suppSearch)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Supp request failed");
        setSuppResults(Array.isArray(json?.results) ? json.results : []);
      } catch (e) {
        setSuppErr(
          e?.message ||
            "Couldn’t load supplements. Check /api/supplements route.",
        );
        setSuppResults([]);
      } finally {
        setSuppLoading(false);
      }
    }, 200);

    return () => clearTimeout(t);
  }, [suppSearch, suppPickerOpen]);

  function pickSupplement(s) {
    setSelectedSuppInfo(s);
    setSuppName(s.name);

    const best =
      Array.isArray(s.bestTime) && s.bestTime.length
        ? s.bestTime[0]
        : "morning";
    setSuppTime(best);

    if (s.withFood === "with_food") setSuppWithFood(true);
    else if (s.withFood === "no_food") setSuppWithFood(false);
    else setSuppWithFood(true);

    setSuppDose(s.typicalDose || "");
    setSuppNote("");
    setSuppPickerOpen(false);
  }

  function addSupplement() {
    const name = suppName.trim();
    if (!name) return;

    const item = {
      id: uid(),
      name,
      slug: selectedSuppInfo?.slug || name.toLowerCase().replace(/\s+/g, "-"),
      time: suppTime,
      withFood: !!suppWithFood,
      dose: suppDose.trim(),
      note: suppNote.trim(),
      isActive: true,
      createdAt: Date.now(),
    };

    updateMany({ supplementSchedule: [...supplementList, item] });

    setSuppName("");
    setSuppDose("");
    setSuppNote("");
    setSuppTime("morning");
    setSuppWithFood(true);
    setSelectedSuppInfo(null);
  }

  function toggleSupplement(id) {
    const next = supplementList.map((s) =>
      s.id === id ? { ...s, isActive: !s.isActive } : s,
    );
    updateMany({ supplementSchedule: next });
  }

  function removeSupplement(id) {
    updateMany({
      supplementSchedule: supplementList.filter((s) => s.id !== id),
    });
  }

  /* ------------------------
     GUARDS (after hooks — no hook-order crash)
  ------------------------ */
  const showLoading = !ready;
  const showLoggedOut = ready && !user;

  /* ------------------------
     RENDER
  ------------------------ */
  return (
    <div className="nutri-page">
      <div className="nutri-topbar">
        <Link href="/dashboard" className="nutri-back">
          ← Back
        </Link>
      </div>

      <div className="nutri-container">
        <div className="nutri-hero">
          <div>
            <h1 className="nutri-title">
              Nutrition Hub <span className="nutri-emoji">🥗</span>
            </h1>
            <p className="nutri-sub">
              Track food, hydration, recipes, and supplements.
            </p>
          </div>

          <div
            className={`nutri-badge ${(data?.hydrationProgress || 0) >= 100 ? "is-complete" : ""}`}
          >
            <div className="nutri-badgeLabel">Hydration</div>
            <div className="nutri-badgeValue">
              {data?.hydrationProgress ?? 0}%
            </div>
          </div>
        </div>

        {showLoading ? (
          <div className="nutri-mutedBox">Loading your nutrition hub…</div>
        ) : showLoggedOut ? (
          <div className="nutri-mutedBox">
            You’re not logged in. Please log in to save food, hydration,
            recipes, and supplements.
          </div>
        ) : (
          <>
            {/* Sticky mini header */}
            {tab === "tracker" && (
              <div className={`nutri-sticky ${stickyOn ? "on" : ""}`}>
                <div>
                  <div className="nutri-stickyTitle">Today</div>
                  <div className="nutri-stickySub">
                    {totals.calories}/{goals.cal} kcal • {bars.cal}% •{" "}
                    <span
                      className={remaining < 0 ? "nutri-over" : "nutri-strong"}
                    >
                      {remaining < 0
                        ? `${Math.abs(remaining)} over`
                        : `${remaining} left`}
                    </span>
                  </div>
                </div>
                <button
                  className="nutri-stickyBtn"
                  type="button"
                  onClick={() => setLogFoodOpen(true)}
                >
                  + Log
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="nutri-tabsWrap">
              <div className="nutri-tabs">
                <button
                  className={`nutri-tab ${tab === "tracker" ? "active" : ""}`}
                  onClick={() => setTab("tracker")}
                  type="button"
                >
                  Tracker
                </button>
                <button
                  className={`nutri-tab ${tab === "recipes" ? "active" : ""}`}
                  onClick={() => setTab("recipes")}
                  type="button"
                >
                  Recipes
                </button>
                <button
                  className={`nutri-tab ${tab === "supplements" ? "active" : ""}`}
                  onClick={() => setTab("supplements")}
                  type="button"
                >
                  Supplements
                </button>
              </div>
            </div>

            {/* ---------------- TRACKER ---------------- */}
            {tab === "tracker" && (
              <>
                <div className="nutri-grid2">
                  <div className="nutri-card nutri-card-metric">
                    <div className="nutri-cardTop">
                      <div className="nutri-label">Calories</div>
                      <div className="nutri-chip">
                        {totals.calories}/{goals.cal} kcal
                      </div>
                    </div>

                    <div className="nutri-big">{totals.calories}</div>
                    <div className="nutri-small">
                      {remaining < 0 ? (
                        <span className="nutri-over">
                          {Math.abs(remaining)} kcal over
                        </span>
                      ) : (
                        `${remaining} kcal left`
                      )}
                    </div>

                    <div className="nutri-miniTrack">
                      <div
                        className="nutri-miniFill"
                        style={{ width: `${bars.cal}%` }}
                      />
                    </div>
                    <div className="nutri-tiny">{bars.cal}% of goal</div>
                  </div>

                  <div className="nutri-card nutri-card-metric">
                    <div className="nutri-cardTop">
                      <div className="nutri-label">Macros</div>
                      <div className="nutri-chip">P / C / F</div>
                    </div>
                    <div className="nutri-big">
                      {totals.proteinG} / {totals.carbsG} / {totals.fatG}g
                    </div>
                    <div className="nutri-small">
                      Goals: {goals.proteinG}/{goals.carbsG}/{goals.fatG}g
                    </div>
                  </div>
                </div>

                <div className="nutri-actions nutri-actions-main">
                  <button
                    className="nutri-primary nutri-primary-main"
                    type="button"
                    onClick={() => setLogFoodOpen(true)}
                  >
                    + Log Food
                  </button>
                  <button
                    className="nutri-pillBtn"
                    type="button"
                    onClick={() => setTab("recipes")}
                  >
                    Browse Recipes
                  </button>
                  <button
                    className="nutri-pillBtn"
                    type="button"
                    onClick={() => setTab("supplements")}
                  >
                    Supplements
                  </button>
                </div>

                <Section
                  title="Macro progress"
                  sub="Thin, controlled bars for daily macro pacing."
                  defaultOpen
                >
                  <MacroBar
                    label="Protein"
                    value={totals.proteinG}
                    goal={goals.proteinG}
                    percent={bars.protein}
                  />
                  <MacroBar
                    label="Carbs"
                    value={totals.carbsG}
                    goal={goals.carbsG}
                    percent={bars.carbs}
                  />
                  <MacroBar
                    label="Fat"
                    value={totals.fatG}
                    goal={goals.fatG}
                    percent={bars.fat}
                  />
                </Section>

                <Section
                  title="Smart calories"
                  sub="Maintenance estimate + safer goal setting."
                >
                  <div className="nutri-grid2">
                    <div className="nutri-card">
                      <div className="nutri-cardTop">
                        <div className="nutri-label">BMI</div>
                        <div className="nutri-chip">
                          {bmi ? bmiCategory(bmi) : "--"}
                        </div>
                      </div>
                      <div className="nutri-big">
                        {bmi ? bmi.toFixed(1) : "--"}
                      </div>
                      <div className="nutri-small">
                        Age: {age || "--"} • Activity: {data?.activity || "--"}
                      </div>
                    </div>

                    <div className="nutri-card">
                      <div className="nutri-cardTop">
                        <div className="nutri-label">Maintenance</div>
                        <div className="nutri-chip">estimate</div>
                      </div>
                      <div className="nutri-big">{maintenance || "--"}</div>
                      <div className="nutri-small">kcal/day</div>
                    </div>
                  </div>

                  <div className="nutri-row">
                    <select
                      className="nutri-select"
                      defaultValue="Maintenance"
                      onChange={(e) => setGoalFromDropdown(e.target.value)}
                    >
                      <option>Maintenance</option>
                      <option>Lose 0.5kg/week</option>
                      <option>Lose 1kg/week</option>
                      <option>Gain 0.25kg/week</option>
                      <option>Gain 0.5kg/week</option>
                    </select>

                    <button
                      className="nutri-pillBtn"
                      type="button"
                      onClick={resetToMaintenance}
                      disabled={!maintenance}
                      title={
                        !maintenance ? "Add height/weight/DOB first" : "Reset"
                      }
                    >
                      Reset
                    </button>
                  </div>

                  <div className="nutri-row">
                    <div className="nutri-inlineLabel">Calorie goal (kcal)</div>
                    <input
                      className="nutri-miniInput"
                      type="number"
                      min="0"
                      value={calGoalInput}
                      onChange={(e) => setCalGoalInput(e.target.value)}
                    />
                    <button
                      className="nutri-primary"
                      type="button"
                      onClick={saveCalorieGoal}
                    >
                      Save
                    </button>
                  </div>

                  {calWarnings.length ? (
                    <div className="nutri-warnBox">
                      <div className="nutri-warnTitle">Warnings</div>
                      <div className="nutri-warnList">
                        {calWarnings.map((w, i) => (
                          <div key={`cw-${i}`} className="nutri-warnItem">
                            • {w}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Section>

                <Section title="Today" sub={date} defaultOpen>
                  {todaysLogs.length === 0 ? (
                    <div className="nutri-mutedBox">
                      No food logged yet. Hit “Log Food”.
                    </div>
                  ) : (
                    ["breakfast", "lunch", "dinner", "snack"].map((m) => {
                      const mealLogs = todaysLogs
                        .slice()
                        .filter((x) => x.meal === m)
                        .sort(
                          (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
                        );

                      if (!mealLogs.length) return null;

                      const mealKcal = mealLogs.reduce(
                        (acc, x) => acc + (x.totals?.calories || 0),
                        0,
                      );

                      return (
                        <div key={`meal-${m}`} className="nutri-mealGroup">
                          <div className="nutri-mealTitle">
                            <span>
                              {m.charAt(0).toUpperCase() + m.slice(1)} •{" "}
                              {mealKcal} kcal
                            </span>
                            <span className="nutri-mealHint">
                              Swipe left to delete
                            </span>
                          </div>

                          <div className="nutri-list">
                            {mealLogs.map((x) => (
                              <SwipeRow
                                key={x.id}
                                onDelete={() => deleteEntry(x.id)}
                                deleteLabel="Delete"
                              >
                                <div className="nutri-rowCard">
                                  <div>
                                    <div className="nutri-rowName">
                                      {x.name}
                                    </div>
                                    <div className="nutri-rowSub">
                                      {x.source === "recipe"
                                        ? `${x.servings || 0} serving(s)`
                                        : `${x.servings || 0} serving(s)`}{" "}
                                      • {x.totals?.calories ?? 0} kcal
                                    </div>
                                  </div>
                                  <div className="nutri-kcalPill">
                                    {x.totals?.calories ?? 0} kcal
                                  </div>
                                </div>
                              </SwipeRow>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </Section>

                <Section
                  title="Hydration"
                  sub={`Preview: ${hydrationPreview.litres}L → ${hydrationPreview.pct}%`}
                >
                  <div className="nutri-grid2">
                    <div className="nutri-card">
                      <div className="nutri-cardTop">
                        <div className="nutri-label">Water</div>
                        <div className="nutri-chip">
                          {hydrationPreview.pct}%
                        </div>
                      </div>
                      <div className="nutri-big">{data?.waterLitres ?? 0}L</div>
                      <div className="nutri-small">
                        Goal: {data?.waterGoalLitres ?? 3}L
                      </div>
                    </div>

                    <div className="nutri-card">
                      <div className="nutri-cardTop">
                        <div className="nutri-label">Quick add</div>
                        <div className="nutri-chip">tap</div>
                      </div>

                      <div className="nutri-row">
                        <button
                          className="nutri-pillBtn"
                          onClick={() => addQuickWater(0.25)}
                          type="button"
                        >
                          +0.25
                        </button>
                        <button
                          className="nutri-pillBtn"
                          onClick={() => addQuickWater(0.5)}
                          type="button"
                        >
                          +0.5
                        </button>
                        <button
                          className="nutri-pillBtn"
                          onClick={() => addQuickWater(1)}
                          type="button"
                        >
                          +1
                        </button>
                      </div>

                      <div className="nutri-small">Adds to your input</div>
                    </div>
                  </div>

                  <div className="nutri-grid2">
                    <div className="nutri-field">
                      <label className="nutri-fieldLabel">Water (litres)</label>
                      <input
                        className="nutri-input"
                        type="number"
                        min="0"
                        step="0.1"
                        value={water}
                        onChange={(e) => setWater(e.target.value)}
                        placeholder="e.g. 2.1"
                      />
                      <div className="nutri-tiny">
                        Dashboard shows {hydrationPreview.litres}L
                      </div>
                    </div>

                    <div className="nutri-field">
                      <label className="nutri-fieldLabel">Goal (litres)</label>
                      <input
                        className="nutri-input"
                        type="number"
                        min="0"
                        step="0.1"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="e.g. 3"
                      />
                      <div className="nutri-tiny">Default goal is 3L</div>
                    </div>
                  </div>

                  <div className="nutri-row">
                    <button
                      className="nutri-primary"
                      onClick={saveHydration}
                      type="button"
                    >
                      Save
                    </button>
                    <button
                      className="nutri-ghost"
                      onClick={resetHydration}
                      type="button"
                    >
                      Reset
                    </button>
                  </div>
                </Section>

                {/* Log food modal (manual only, clean & reliable) */}
                <Modal
                  open={logFoodOpen}
                  onClose={() => setLogFoodOpen(false)}
                  title="Log Food (Manual)"
                >
                  <div className="nutri-row">
                    <select
                      className="nutri-select"
                      value={meal}
                      onChange={(e) => setMeal(e.target.value)}
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>

                  <div className="nutri-grid2" style={{ marginTop: 12 }}>
                    <div className="nutri-field">
                      <label className="nutri-fieldLabel">Name</label>
                      <input
                        className="nutri-input"
                        value={quickName}
                        onChange={(e) => setQuickName(e.target.value)}
                        placeholder="e.g. Yogurt + granola"
                      />
                    </div>

                    <div className="nutri-field">
                      <label className="nutri-fieldLabel">Servings</label>
                      <input
                        className="nutri-input"
                        type="number"
                        min="0"
                        step="0.5"
                        value={quickServings}
                        onChange={(e) => setQuickServings(e.target.value)}
                      />
                    </div>

                    <div className="nutri-field">
                      <label className="nutri-fieldLabel">
                        Calories (per serving)
                      </label>
                      <input
                        className="nutri-input"
                        type="number"
                        min="0"
                        value={quickCals}
                        onChange={(e) => setQuickCals(e.target.value)}
                      />
                    </div>

                    <div className="nutri-field">
                      <label className="nutri-fieldLabel">Protein (g)</label>
                      <input
                        className="nutri-input"
                        type="number"
                        min="0"
                        value={quickP}
                        onChange={(e) => setQuickP(e.target.value)}
                      />
                    </div>

                    <div className="nutri-field">
                      <label className="nutri-fieldLabel">Carbs (g)</label>
                      <input
                        className="nutri-input"
                        type="number"
                        min="0"
                        value={quickC}
                        onChange={(e) => setQuickC(e.target.value)}
                      />
                    </div>

                    <div className="nutri-field">
                      <label className="nutri-fieldLabel">Fat (g)</label>
                      <input
                        className="nutri-input"
                        type="number"
                        min="0"
                        value={quickF}
                        onChange={(e) => setQuickF(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="nutri-row" style={{ marginTop: 12 }}>
                    <button
                      className="nutri-primary"
                      onClick={addQuickFoodManual}
                      type="button"
                    >
                      Add
                    </button>
                    <button
                      className="nutri-ghost"
                      onClick={() => setLogFoodOpen(false)}
                      type="button"
                    >
                      Close
                    </button>
                  </div>
                </Modal>
              </>
            )}

            {/* ---------------- RECIPES ---------------- */}
            {tab === "recipes" && (
              <>
                <div className="nutri-card">
                  <div className="nutri-cardTop">
                    <div className="nutri-label">Recipe search</div>
                    <div className="nutri-chip">MealDB</div>
                  </div>

                  <input
                    className="nutri-search"
                    value={recipeQuery}
                    onChange={(e) => setRecipeQuery(e.target.value)}
                    placeholder="Search recipes… (e.g. chicken, curry, pasta)"
                  />

                  {recipeLoading ? (
                    <div className="nutri-mutedBox" style={{ marginTop: 12 }}>
                      Searching…
                    </div>
                  ) : recipeErr ? (
                    <div
                      className="nutri-mutedBox nutri-danger"
                      style={{ marginTop: 12 }}
                    >
                      {recipeErr}
                    </div>
                  ) : recipeQuery.trim() && recipeResults.length === 0 ? (
                    <div className="nutri-mutedBox" style={{ marginTop: 12 }}>
                      No recipes found.
                    </div>
                  ) : null}

                  {recipeResults.length > 0 ? (
                    <div className="nutri-recipeGrid">
                      {recipeResults.map((r) => (
                        <button
                          key={r.id} // ✅ normalized id (never missing)
                          type="button"
                          className="nutri-recipeCard"
                          onClick={() => openRecipeModal(r)}
                        >
                          {r.image ? (
                            <Image
                              className="nutri-recipeImg"
                              src={r.image}
                              alt={r.title}
                              width={360}
                              height={220}
                              unoptimized
                            />
                          ) : (
                            <div className="nutri-recipeImgPh">🍽️</div>
                          )}
                          <div className="nutri-recipeTitle">{r.title}</div>
                          <div className="nutri-recipeMeta">
                            Tap to view details + estimate macros
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <Modal
                  open={recipeOpen}
                  onClose={() => setRecipeOpen(false)}
                  title="Recipe"
                >
                  {recipeDetailLoading ? (
                    <div className="nutri-mutedBox">Loading recipe…</div>
                  ) : recipeDetailErr ? (
                    <div className="nutri-mutedBox nutri-danger">
                      {recipeDetailErr}
                    </div>
                  ) : selectedRecipe ? (
                    <>
                      <div className="nutri-recipeHeader">
                        {selectedRecipe.image ? (
                          <Image
                            className="nutri-recipeHeroImg"
                            src={selectedRecipe.image}
                            alt={selectedRecipe.title}
                            width={720}
                            height={420}
                            unoptimized
                          />
                        ) : null}
                        <div>
                          <div className="nutri-recipeH1">
                            {selectedRecipe.title}
                          </div>
                          {selectedRecipe.area || selectedRecipe.category ? (
                            <div className="nutri-tiny">
                              {selectedRecipe.area ? selectedRecipe.area : ""}
                              {selectedRecipe.area && selectedRecipe.category
                                ? " • "
                                : ""}
                              {selectedRecipe.category
                                ? selectedRecipe.category
                                : ""}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="nutri-split">
                        <div className="nutri-block">
                          <div className="nutri-blockTitle">Ingredients</div>
                          <div className="nutri-ingredList">
                            {mealDBIngredients(selectedRecipe).map(
                              (it, idx) => (
                                <div
                                  key={`${it.ingredient}-${idx}`}
                                  className="nutri-ingredRow"
                                >
                                  <span className="nutri-strong">
                                    {it.ingredient}
                                  </span>
                                  <span className="nutri-muted">
                                    {it.measure}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        </div>

                        <div className="nutri-block">
                          <div className="nutri-blockTitle">
                            Estimate macros (per serving)
                          </div>
                          <div className="nutri-grid2">
                            <div className="nutri-field">
                              <label className="nutri-fieldLabel">
                                Calories
                              </label>
                              <input
                                className="nutri-input"
                                value={estCals}
                                onChange={(e) => setEstCals(e.target.value)}
                                type="number"
                                min="0"
                              />
                            </div>
                            <div className="nutri-field">
                              <label className="nutri-fieldLabel">
                                Protein (g)
                              </label>
                              <input
                                className="nutri-input"
                                value={estP}
                                onChange={(e) => setEstP(e.target.value)}
                                type="number"
                                min="0"
                              />
                            </div>
                            <div className="nutri-field">
                              <label className="nutri-fieldLabel">
                                Carbs (g)
                              </label>
                              <input
                                className="nutri-input"
                                value={estC}
                                onChange={(e) => setEstC(e.target.value)}
                                type="number"
                                min="0"
                              />
                            </div>
                            <div className="nutri-field">
                              <label className="nutri-fieldLabel">
                                Fat (g)
                              </label>
                              <input
                                className="nutri-input"
                                value={estF}
                                onChange={(e) => setEstF(e.target.value)}
                                type="number"
                                min="0"
                              />
                            </div>
                          </div>

                          <div className="nutri-row" style={{ marginTop: 10 }}>
                            <div className="nutri-inlineLabel">
                              Servings to log
                            </div>
                            <input
                              className="nutri-miniInput"
                              type="number"
                              min="0"
                              step="0.5"
                              value={recipeServings}
                              onChange={(e) =>
                                setRecipeServings(e.target.value)
                              }
                            />
                          </div>

                          <div className="nutri-row" style={{ marginTop: 10 }}>
                            <button
                              className="nutri-primary"
                              type="button"
                              onClick={addRecipeToLog}
                            >
                              Add to {meal}
                            </button>
                            <button
                              className="nutri-pillBtn"
                              type="button"
                              onClick={saveRecipeEstimate}
                            >
                              Save estimate
                            </button>
                            <button
                              className="nutri-ghost"
                              type="button"
                              onClick={() => setRecipeOpen(false)}
                            >
                              Close
                            </button>
                          </div>

                          <div className="nutri-tiny" style={{ marginTop: 8 }}>
                            Tip: once you save an estimate, it auto-fills next
                            time.
                          </div>
                        </div>
                      </div>

                      <div className="nutri-block" style={{ marginTop: 12 }}>
                        <div className="nutri-blockTitle">Instructions</div>
                        <div className="nutri-instructions">
                          {selectedRecipe.instructions ||
                            "No instructions provided."}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="nutri-mutedBox">No recipe selected.</div>
                  )}
                </Modal>
              </>
            )}

            {/* ---------------- SUPPLEMENTS ---------------- */}
            {tab === "supplements" && (
              <>
                <div className="nutri-card">
                  <div className="nutri-cardTop">
                    <div className="nutri-label">Supplements</div>
                    <div className="nutri-chip">library</div>
                  </div>
                  <div className="nutri-small" style={{ marginTop: 6 }}>
                    General info only. If you’re on medication or have
                    conditions, double-check with a pharmacist/doctor.
                  </div>

                  <div className="nutri-row" style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="nutri-pillBtn"
                      onClick={() => {
                        setSuppPickerOpen(true);
                        setSuppSearch("");
                      }}
                    >
                      + Pick supplement (A–Z)
                    </button>

                    {selectedSuppInfo?.category ? (
                      <div className="nutri-chip">
                        {selectedSuppInfo.category}
                      </div>
                    ) : null}
                  </div>

                  <div className="nutri-grid2" style={{ marginTop: 12 }}>
                    <div className="nutri-field">
                      <label className="nutri-fieldLabel">Supplement</label>
                      <input
                        className="nutri-input"
                        value={suppName}
                        onChange={(e) => setSuppName(e.target.value)}
                        placeholder="Pick from the library (recommended)"
                      />
                      {selectedSuppInfo?.benefits?.length ? (
                        <div className="nutri-tiny">
                          {selectedSuppInfo.benefits[0]}
                        </div>
                      ) : null}
                    </div>

                    <div className="nutri-field">
                      <label className="nutri-fieldLabel">Time</label>
                      <select
                        className="nutri-select"
                        value={suppTime}
                        onChange={(e) => setSuppTime(e.target.value)}
                      >
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                        <option value="night">Night</option>
                      </select>
                    </div>

                    <div className="nutri-field">
                      <label className="nutri-fieldLabel">With food?</label>
                      <select
                        className="nutri-select"
                        value={suppWithFood ? "yes" : "no"}
                        onChange={(e) =>
                          setSuppWithFood(e.target.value === "yes")
                        }
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>

                    <div className="nutri-field">
                      <label className="nutri-fieldLabel">Dose</label>
                      <input
                        className="nutri-input"
                        value={suppDose}
                        onChange={(e) => setSuppDose(e.target.value)}
                        placeholder="e.g. 200–400 mg"
                      />
                      {selectedSuppInfo?.typicalDose ? (
                        <div className="nutri-tiny">
                          Typical: {selectedSuppInfo.typicalDose}
                        </div>
                      ) : null}
                    </div>

                    <div
                      className="nutri-field"
                      style={{ gridColumn: "1 / -1" }}
                    >
                      <label className="nutri-fieldLabel">Note</label>
                      <input
                        className="nutri-input"
                        value={suppNote}
                        onChange={(e) => setSuppNote(e.target.value)}
                        placeholder="e.g. take with dinner"
                      />
                    </div>
                  </div>

                  {selectedSuppInfo ? (
                    <div className="nutri-mutedBox" style={{ marginTop: 12 }}>
                      <div className="nutri-strong" style={{ marginBottom: 6 }}>
                        {selectedSuppInfo.name}
                      </div>

                      {selectedSuppInfo.benefits?.length ? (
                        <div
                          className="nutri-small"
                          style={{ marginBottom: 8 }}
                        >
                          <span className="nutri-strong">What it does:</span>{" "}
                          {selectedSuppInfo.benefits.join(" • ")}
                        </div>
                      ) : null}

                      {selectedSuppInfo.cautions?.length ? (
                        <div className="nutri-small">
                          <span className="nutri-strong">Watch outs:</span>{" "}
                          {selectedSuppInfo.cautions.join(" • ")}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="nutri-row" style={{ marginTop: 12 }}>
                    <button
                      className="nutri-primary"
                      onClick={addSupplement}
                      type="button"
                    >
                      Add to my stack
                    </button>
                    {selectedSuppInfo ? (
                      <button
                        className="nutri-ghost"
                        type="button"
                        onClick={() => {
                          setSelectedSuppInfo(null);
                          setSuppDose("");
                        }}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="nutri-card" style={{ marginTop: 12 }}>
                  <div className="nutri-cardTop">
                    <div className="nutri-label">My stack</div>
                    <div className="nutri-chip">{supplementList.length}</div>
                  </div>

                  {supplementList.length === 0 ? (
                    <div className="nutri-mutedBox" style={{ marginTop: 10 }}>
                      No supplements added yet.
                    </div>
                  ) : (
                    <div className="nutri-stackList">
                      {supplementList
                        .slice()
                        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                        .map((s) => (
                          <div className="nutri-rowCard" key={s.id}>
                            <div>
                              <div className="nutri-rowName">
                                {s.name}{" "}
                                {!s.isActive && (
                                  <span className="nutri-muted">(paused)</span>
                                )}
                              </div>
                              <div className="nutri-rowSub">
                                {s.time} •{" "}
                                {s.withFood ? "with food" : "no food"}
                                {s.dose ? ` • ${s.dose}` : ""}
                                {s.note ? ` • ${s.note}` : ""}
                              </div>
                            </div>

                            <div className="nutri-row">
                              <button
                                className="nutri-pillBtn"
                                onClick={() => toggleSupplement(s.id)}
                                type="button"
                              >
                                {s.isActive ? "Pause" : "Resume"}
                              </button>
                              <button
                                className="nutri-iconBtn"
                                onClick={() => removeSupplement(s.id)}
                                title="Remove"
                                type="button"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Modal Picker */}
                <Modal
                  open={suppPickerOpen}
                  onClose={() => setSuppPickerOpen(false)}
                  title="Pick a supplement"
                >
                  <input
                    className="nutri-search"
                    value={suppSearch}
                    onChange={(e) => setSuppSearch(e.target.value)}
                    placeholder="Search A–Z… (e.g. magnesium)"
                  />

                  {suppLoading ? (
                    <div className="nutri-mutedBox" style={{ marginTop: 12 }}>
                      Loading…
                    </div>
                  ) : suppErr ? (
                    <div
                      className="nutri-mutedBox nutri-danger"
                      style={{ marginTop: 12 }}
                    >
                      {suppErr}
                    </div>
                  ) : suppResults.length === 0 ? (
                    <div className="nutri-mutedBox" style={{ marginTop: 12 }}>
                      No results.
                    </div>
                  ) : (
                    <div className="nutri-list" style={{ marginTop: 12 }}>
                      {suppResults.map((s) => (
                        <button
                          key={s.slug} // ✅ key exists
                          type="button"
                          className="nutri-listRow"
                          onClick={() => pickSupplement(s)}
                        >
                          <div>
                            <div className="nutri-rowName">{s.name}</div>
                            <div className="nutri-rowSub">
                              {s.category}
                              {s.typicalDose ? ` • ${s.typicalDose}` : ""}
                            </div>
                          </div>
                          <div className="nutri-plus">＋</div>
                        </button>
                      ))}
                    </div>
                  )}
                </Modal>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
