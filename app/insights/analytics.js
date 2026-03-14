import { clampNumber, clampPercent } from "../utils/number.js";
export { clampNumber };


export function getLastNDaysISO(n, endDate = new Date()) {
  const out = [];
  const now = new Date(endDate);
  for (let i = 0; i < n; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(d.toISOString().split("T")[0]);
  }
  return out;
}

export function toBedtimeMinutes(v) {
  if (!v || typeof v !== "string") return null;
  const parts = v.split(":");
  if (parts.length !== 2) return null;
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function bedtimeConsistencyScore(minutes) {
  const valid = minutes.filter((m) => Number.isFinite(m));
  if (valid.length < 2) return 50;

  const avg = valid.reduce((s, x) => s + x, 0) / valid.length;
  const variance =
    valid.reduce((s, x) => s + (x - avg) * (x - avg), 0) / valid.length;
  const std = Math.sqrt(variance);
  return clampPercent(100 - (std / 90) * 100);
}

function normalizeDay(raw = {}) {
  const macros = raw?.macros || {};
  const sleep = raw?.sleep || {};
  const mood = raw?.mood || {};
  const habits = raw?.habits || {};
  const lifestyle = raw?.lifestyle || {};

  const bedtimeMin = toBedtimeMinutes(sleep.bedtime);

  return {
    calories: clampNumber(raw.calories),
    steps: clampNumber(raw.steps),
    waterMl: clampNumber(raw.waterMl),
    workouts: clampNumber(raw.workouts || raw.workoutsCount),
    cardioMinutes: clampNumber(raw.cardioMinutes || raw.cardioMins),
    proteinG: clampNumber(macros.proteinG || raw.proteinG),
    carbsG: clampNumber(macros.carbsG || raw.carbsG),
    fatG: clampNumber(macros.fatG || raw.fatG),
    mood: {
      rating: clampNumber(mood.rating),
      stress: clampNumber(mood.stress),
      note: typeof mood.note === "string" ? mood.note : "",
    },
    sleep: {
      hours: clampNumber(sleep.hours),
      quality: clampNumber(sleep.quality),
      bedtime: typeof sleep.bedtime === "string" ? sleep.bedtime : "",
      bedtimeMin,
    },
    habits: {
      completed: clampNumber(habits.completed),
      total: clampNumber(habits.total),
    },
    lifestyle: {
      focusMinutes: clampNumber(lifestyle.focusMinutes),
      screenTimeMinutes: clampNumber(lifestyle.screenTimeMinutes),
    },
  };
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function computeTrend(points) {
  const n = points.length;
  if (n < 3) return { slope: 0, label: "Building baseline" };

  const xMean = mean(points.map((p) => p.x));
  const yMean = mean(points.map((p) => p.y));
  let numerator = 0;
  let denominator = 0;

  for (const p of points) {
    const dx = p.x - xMean;
    numerator += dx * (p.y - yMean);
    denominator += dx * dx;
  }

  const slope = denominator ? numerator / denominator : 0;
  const threshold = Math.max(0.08, Math.abs(yMean) * 0.012);

  if (slope > threshold) return { slope, label: "Improving" };
  if (slope < -threshold) return { slope, label: "Declining" };
  return { slope, label: "Flat" };
}

function pillarStats(days, selector) {
  const mapped = days.map((d, i) => {
    const v = selector(d);
    return { index: i, value: v.value, valid: !!v.valid };
  });
  const valid = mapped.filter((x) => x.valid);

  if (!valid.length) {
    return {
      weeklyAvg: null,
      prevWeekAvg: null,
      monthAvg: null,
      consistency7: 0,
      consistency30: 0,
      trend: { slope: 0, label: "Building baseline" },
      validCount: 0,
    };
  }

  const week = mapped.slice(-7);
  const prevWeek = mapped.slice(-14, -7);
  const weekValid = week.filter((x) => x.valid);
  const prevValid = prevWeek.filter((x) => x.valid);

  return {
    weeklyAvg: weekValid.length ? mean(weekValid.map((x) => x.value)) : null,
    prevWeekAvg: prevValid.length ? mean(prevValid.map((x) => x.value)) : null,
    monthAvg: mean(valid.map((x) => x.value)),
    consistency7: weekValid.length,
    consistency30: valid.length,
    trend: computeTrend(valid.map((x) => ({ x: x.index, y: x.value }))),
    validCount: valid.length,
  };
}

export function normalizeDailyTimeline(fetched, n = 30) {
  const latestFetched = fetched
    .map((d) => String(d?.dateISO || ""))
    .filter(Boolean)
    .sort()
    .at(-1);
  const wanted = getLastNDaysISO(n, latestFetched || new Date()).reverse();
  const byDate = new Map(fetched.map((d) => [d.dateISO, d]));

  return wanted.map((dateISO) => {
    const found = byDate.get(dateISO);
    if (!found) {
      return {
        dateISO,
        missing: true,
        ...normalizeDay(),
      };
    }

    return {
      dateISO,
      missing: false,
      ...normalizeDay(found),
    };
  });
}

export function buildPillarAnalytics(days, goals) {
  const bedtimes = days
    .map((d) => d.sleep.bedtimeMin)
    .filter((x) => Number.isFinite(x));
  const bedtimeConsistency = bedtimeConsistencyScore(bedtimes);

  const move = pillarStats(days, (d) => {
    const score =
      clampPercent((d.steps / Math.max(1, goals.stepGoal)) * 70) +
      clampPercent((d.workouts / 1) * 15) +
      clampPercent((d.cardioMinutes / 30) * 15);
    const valid = d.steps > 0 || d.workouts > 0 || d.cardioMinutes > 0;
    return { value: Math.min(100, score), valid };
  });

  const fuel = pillarStats(days, (d) => {
    const calScore =
      d.calories > 0
        ? clampPercent(
            100 -
              (Math.abs(d.calories - goals.calorieGoal) / goals.calorieGoal) *
                100,
          )
        : 0;
    const waterScore = clampPercent(
      (d.waterMl / 1000 / Math.max(1, goals.waterGoal)) * 100,
    );
    const macroTotal = d.proteinG + d.carbsG + d.fatG;
    const macroScore =
      macroTotal > 0
        ? clampPercent((d.proteinG / Math.max(1, goals.proteinGoal)) * 100)
        : 0;
    const valid = d.calories > 0 || d.waterMl > 0 || macroTotal > 0;
    return {
      value: Math.round(calScore * 0.45 + waterScore * 0.4 + macroScore * 0.15),
      valid,
    };
  });

  const recover = pillarStats(days, (d) => {
    const sleepScore = clampPercent((d.sleep.hours / 8) * 100);
    const qualityScore = clampPercent((d.sleep.quality / 5) * 100);
    const score = Math.round(
      sleepScore * 0.65 + qualityScore * 0.35 + bedtimeConsistency * 0.15,
    );
    const valid = d.sleep.hours > 0 || d.sleep.quality > 0 || !!d.sleep.bedtime;
    return { value: Math.min(100, score), valid };
  });

  const mood = pillarStats(days, (d) => {
    const moodScore = clampPercent((d.mood.rating / 5) * 100);
    const stressScore =
      d.mood.stress > 0 ? clampPercent((1 - (d.mood.stress - 1) / 4) * 100) : 0;
    const valid = d.mood.rating > 0 || d.mood.stress > 0;
    return { value: Math.round(moodScore * 0.65 + stressScore * 0.35), valid };
  });

  const habits = pillarStats(days, (d) => {
    const rate = d.habits.total > 0 ? d.habits.completed / d.habits.total : 0;
    const valid = d.habits.total > 0;
    return { value: clampPercent(rate * 100), valid };
  });

  return { move, fuel, recover, mood, habits, bedtimeConsistency };
}

export function buildCoachSummary(pillars, days, goals) {
  const entries = [
    { key: "Move", id: "move", ...pillars.move },
    { key: "Fuel", id: "fuel", ...pillars.fuel },
    { key: "Recover", id: "recover", ...pillars.recover },
    { key: "Mood", id: "mood", ...pillars.mood },
    { key: "Habits", id: "habits", ...pillars.habits },
  ];

  const withScores = entries.map((x) => {
    const weeklyAvg = clampNumber(x.weeklyAvg);
    const deficit = Math.max(0, 100 - weeklyAvg);
    const consistencyPct = Math.round((Math.max(0, Math.min(7, x.consistency7 || 0)) / 7) * 100);
    const consistencyGap = Math.max(0, 100 - consistencyPct);

    // Constraint-first scoring:
    // 1) weekly weakness (deficit) drives lever selection
    // 2) consistency and negative trend only refine priority
    // This prevents strong pillars from becoming "top lever" in edge profiles.
    const negativeTrendOnly = clampPercent(Math.max(0, -(x?.trend?.slope || 0)) * 100);
    const leverScore =
      deficit * 0.55 +
      consistencyGap * 0.30 +
      negativeTrendOnly * 0.15;

    return {
      ...x,
      weeklyAvg,
      deficit,
      consistencyPct,
      consistencyGap,
      negativeTrendOnly,
      leverScore,
    };
  });

  const allStrong = withScores.every((x) => x.weeklyAvg >= 90);
  const eligible = allStrong
    ? withScores
    : withScores.filter((x) => x.weeklyAvg < 90);

  let lever = eligible
    .slice()
    .sort((a, b) => {
      if (b.leverScore !== a.leverScore) return b.leverScore - a.leverScore;
      if (a.weeklyAvg !== b.weeklyAvg) return a.weeklyAvg - b.weeklyAvg;
      return a.key.localeCompare(b.key);
    })[0] || null;

  if (!allStrong) {
    const move = withScores.find((x) => x.id === "move");
    const weaker = withScores.find((x) => x.weeklyAvg < 80);
    if (move && weaker && move.weeklyAvg >= 100 && lever?.id === "move") {
      lever = withScores
        .filter((x) => x.weeklyAvg < 80)
        .sort((a, b) => b.leverScore - a.leverScore || a.weeklyAvg - b.weeklyAvg)[0] || lever;
    }
  }

  const riskCandidates = withScores
    .map((x) => {
      const impactScore = x.deficit * 0.6 + x.negativeTrendOnly * 0.25 + x.consistencyGap * 0.15;
      const weakOrDeclining = x.deficit >= 18 || x.negativeTrendOnly >= 18;
      return { ...x, impactScore, weakOrDeclining };
    })
    .filter((x) => x.weakOrDeclining)
    .sort((a, b) => b.impactScore - a.impactScore);

  const riskLabelById = {
    move: "Movement inconsistency",
    fuel: "Hydration + fuel drift",
    recover: "Sleep/recovery debt",
    mood: "Mood load accumulating",
    habits: "Habit closure gap",
  };

  const risks = riskCandidates.slice(0, 3).map((x) => riskLabelById[x.id] || `${x.key} risk`);

  const latest = days[days.length - 1] || null;
  const lowHydration = (latest?.waterMl || 0) / 1000 < Math.max(1, goals.waterGoal * 0.6);
  if (lowHydration && !risks.some((x) => /Hydration/i.test(x))) {
    risks.unshift("Hydration lag");
  }

  const finalRisks = risks.slice(0, 3);

  const leverWhy = lever
    ? `${lever.key} is the clearest constraint this week (${Math.round(lever.weeklyAvg)}% avg, ${lever.consistencyPct}% consistency).`
    : "Signal quality is still building, so hold a simple baseline this week.";

  const planByLever = {
    move: [
      "Today: lock one 12-minute walk after lunch.",
      "Today: add one short evening movement block before dinner.",
      "Today: close the remaining step gap with a post-meal walk.",
    ],
    fuel: [
      "Today: drink 500ml water before noon.",
      "Today: pre-log one protein-first meal before 4pm.",
      "Today: keep dinner simple and repeatable.",
    ],
    recover: [
      "Today: set tonight’s lights-out time now.",
      "Today: no caffeine in the last 8 hours before bed.",
      "Today: run a 20-minute wind-down before sleep.",
    ],
    mood: [
      "Today: take one 5-minute downshift break before your busiest block.",
      "Today: reduce one avoidable stress input for tonight.",
      "Today: close with one short reflection line before bed.",
    ],
    habits: [
      "Today: pick two non-negotiables and finish them before 8pm.",
      "Today: stack your first habit right after an existing routine.",
      "Today: mark completion immediately after each win.",
    ],
  };

  const microPlan = (planByLever[lever?.id] || [
    "Today: log one key metric before midday.",
    "Today: complete one high-leverage habit before dinner.",
    "Today: close with a short reset plan for tomorrow.",
  ]).slice(0, 3);

  const headline = lever
    ? `${lever.key} is the lever that moves your week fastest.`
    : "Build one clean week of signal before optimizing.";

  return {
    headline,
    heading: headline,
    topLever: lever?.key || null,
    topLeverId: lever?.id || null,
    topLeverWhy: leverWhy,
    body: leverWhy,
    risks: finalRisks,
    risk: finalRisks.length ? finalRisks.join(" • ") : "No acute risk flag from current data.",
    microPlan,
    action: microPlan[0] || "Today: lock one practical action.",
  };
}

