/**
 * Insights Analytics Engine
 * Calculates cross-hub pillar scores (Move, Fuel, Recover, Mood, Habits)
 */

/**
 * Normalize a daily record from Firestore
 */
function normalizeDay(doc) {
  return {
    date: String(doc?.date || ""),
    waterMl: Number(doc?.waterMl || 0),
    steps: Number(doc?.steps || 0),
    calories: Number(doc?.calories || 0),
    workouts: Number(doc?.workouts || 0),
    cardioMinutes: Number(doc?.cardioMinutes || 0),
    macros: {
      proteinG: Number(doc?.macros?.proteinG || 0),
      carbsG: Number(doc?.macros?.carbsG || 0),
      fatG: Number(doc?.macros?.fatG || 0),
    },
    mood: {
      rating: Number(doc?.mood?.rating || 0),
      stress: Number(doc?.mood?.stress || 0),
      note: String(doc?.mood?.note || ""),
    },
    sleep: {
      hours: Number(doc?.sleep?.hours || 0),
      quality: Number(doc?.sleep?.quality || 0),
      bedtime: String(doc?.sleep?.bedtime || ""),
    },
    habits: {
      completed: Number(doc?.habits?.completed || 0),
      total: Number(doc?.habits?.total || 0),
    },
    lifestyle: {
      focusMinutes: Number(doc?.lifestyle?.focusMinutes || 0),
      screenTimeMinutes: Number(doc?.lifestyle?.screenTimeMinutes || 0),
    },
  };
}

/**
 * Compute trend direction (up/down/flat) based on 3+ data points
 */
function computeTrend(values) {
  if (values.length < 3) return null;

  const validValues = values.filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (validValues.length < 3) return null;

  // Simple slope: (last 3 avg) - (first 3 avg)
  const lastThree = validValues.slice(-3);
  const firstThree = validValues.slice(0, 3);

  const lastAvg = lastThree.reduce((a, b) => a + b, 0) / 3;
  const firstAvg = firstThree.reduce((a, b) => a + b, 0) / 3;

  const slope = lastAvg - firstAvg;

  if (Math.abs(slope) < 1) return null;

  return {
    direction: slope > 0 ? "up" : "down",
    label: Math.abs(Math.round(slope)) === 0 ? "Flat" : `${Math.abs(Math.round(slope))} ${slope > 0 ? "up" : "down"}`,
  };
}

/**
 * Build pillar analytics from daily records
 * Returns structured pillar scores and insights
 */
export function buildPillarAnalytics(dailyRecords) {
  if (!Array.isArray(dailyRecords) || dailyRecords.length === 0) {
    return null;
  }

  const normalized = dailyRecords.map((d) => normalizeDay(d));

  // ━━━ MOVE PILLAR (Steps + Cardio) ━━━
  const moveScore = (() => {
    const stepValues = normalized.map((n) => n.steps);
    const avgSteps = stepValues.reduce((a, b) => a + b, 0) / stepValues.length;

    // 8000 steps = target
    const stepScore = Math.min(100, Math.max(0, (avgSteps / 8000) * 100));

    const cardioValues = normalized.map((n) => n.cardioMinutes);
    const avgCardio = cardioValues.reduce((a, b) => a + b, 0) / cardioValues.length;
    const cardioScore = Math.min(100, (avgCardio / 30) * 100); // 30 min = target

    return Math.round((stepScore * 0.7 + cardioScore * 0.3) / 10) * 10; // Round to nearest 10
  })();

  // ━━━ FUEL PILLAR (Calories + Macros + Water) ━━━
  const fuelScore = (() => {
    const calValues = normalized.map((n) => n.calories);
    const avgCals = calValues.reduce((a, b) => a + b, 0) / calValues.length;
    const calScore = Math.min(100, Math.max(0, (avgCals / 1800) * 100)); // 1800 cal = target

    const waterValues = normalized.map((n) => n.waterMl / 1000); // Convert to liters
    const avgWater = waterValues.reduce((a, b) => a + b, 0) / waterValues.length;
    const waterScore = Math.min(100, (avgWater / 3) * 100); // 3L = target

    const proteinValues = normalized.map((n) => n.macros.proteinG);
    const avgProtein = proteinValues.reduce((a, b) => a + b, 0) / proteinValues.length;
    const proteinScore = Math.min(100, (avgProtein / 100) * 100); // 100g = target

    return Math.round((calScore * 0.4 + waterScore * 0.4 + proteinScore * 0.2) / 10) * 10;
  })();

  // ━━━ RECOVER PILLAR (Sleep + Stress) ━━━
  const recoverScore = (() => {
    const sleepValues = normalized.map((n) => n.sleep.hours);
    const avgSleep = sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length;
    const sleepScore = Math.min(100, Math.max(0, (avgSleep / 8) * 100)); // 8 hours = target

    const qualityValues = normalized.map((n) => n.sleep.quality);
    const avgQuality = qualityValues.filter((q) => q > 0).length
      ? qualityValues.filter((q) => q > 0).reduce((a, b) => a + b, 0) /
        qualityValues.filter((q) => q > 0).length
      : 0;
    const qualityScore = avgQuality * 20; // 5 = 100

    const stressValues = normalized.map((n) => n.mood.stress);
    const avgStress = stressValues.filter((s) => s > 0).length
      ? stressValues.filter((s) => s > 0).reduce((a, b) => a + b, 0) /
        stressValues.filter((s) => s > 0).length
      : 0;
    const stressScore = Math.max(0, 100 - avgStress * 20); // Lower stress = higher score

    return Math.round((sleepScore * 0.5 + qualityScore * 0.3 + stressScore * 0.2) / 10) * 10;
  })();

  // ━━━ MOOD PILLAR (Mood Rating) ━━━
  const moodScore = (() => {
    const moodValues = normalized
      .map((n) => n.mood.rating)
      .filter((m) => m > 0);

    if (moodValues.length === 0) return 0;

    const avgMood = moodValues.reduce((a, b) => a + b, 0) / moodValues.length;
    return Math.round((avgMood / 5) * 100 / 10) * 10; // 5 = 100
  })();

  // ━━━ HABITS PILLAR (Habit Completion) ━━━
  const habitsScore = (() => {
    const completionRates = normalized
      .map((n) => {
        if (n.habits.total === 0) return 0;
        return (n.habits.completed / n.habits.total) * 100;
      })
      .filter((r) => r > 0);

    if (completionRates.length === 0) return 0;

    const avgRate = completionRates.reduce((a, b) => a + b, 0) / completionRates.length;
    return Math.round(avgRate / 10) * 10;
  })();

  // ━━━ COMPUTE TRENDS ━━━
  const moveTrend = computeTrend(normalized.map((n) => n.steps));
  const fuelTrend = computeTrend(
    normalized.map((n) => n.waterMl + n.calories * 0.1), // Combined score
  );
  const recoverTrend = computeTrend(normalized.map((n) => n.sleep.hours));
  const moodTrend = computeTrend(normalized.map((n) => n.mood.rating));
  const habitsTrend = computeTrend(
    normalized.map((n) => {
      if (n.habits.total === 0) return 0;
      return (n.habits.completed / n.habits.total) * 100;
    }),
  );

  // ━━━ PILLAR DEFINITIONS ━━━
  const pillars = [
    {
      name: "Move",
      icon: "🏃",
      score: moveScore,
      color: "#FF6B6B",
      description: "Steps + Cardio",
      trend: moveTrend,
      insight:
        moveScore >= 80
          ? "You're crushing movement goals."
          : moveScore >= 50
            ? "Build consistent daily steps."
            : "Let's get more movement in today.",
    },
    {
      name: "Fuel",
      icon: "🥗",
      score: fuelScore,
      color: "#4ECDC4",
      description: "Calories + Macros + Water",
      trend: fuelTrend,
      insight:
        fuelScore >= 80
          ? "Nutrition is dialed in."
          : fuelScore >= 50
            ? "Hydrate and log meals consistently."
            : "Hydrate more, log at least one meal.",
    },
    {
      name: "Recover",
      icon: "😴",
      score: recoverScore,
      color: "#95E1D3",
      description: "Sleep + Stress",
      trend: recoverTrend,
      insight:
        recoverScore >= 80
          ? "Sleep and stress are in a good place."
          : recoverScore >= 50
            ? "Prioritize sleep quality."
            : "Get more rest—at least 7 hours tonight.",
    },
    {
      name: "Mood",
      icon: "😊",
      score: moodScore,
      color: "#FFD93D",
      description: "Daily Mood Rating",
      trend: moodTrend,
      insight:
        moodScore >= 80
          ? "Your mood is strong."
          : moodScore >= 50
            ? "Small moments can lift your mood."
            : "Check in with yourself—what would help right now?",
    },
    {
      name: "Habits",
      icon: "✨",
      score: habitsScore,
      color: "#6C5CE7",
      description: "Habit Completion Rate",
      trend: habitsTrend,
      insight:
        habitsScore >= 80
          ? "You're on a habits roll."
          : habitsScore >= 50
            ? "One more habit can shift your day."
            : "Start with one easy habit.",
    },
  ];

  return {
    move: { score: moveScore, trend: moveTrend },
    fuel: { score: fuelScore, trend: fuelTrend },
    recover: { score: recoverScore, trend: recoverTrend },
    mood: { score: moodScore, trend: moodTrend },
    habits: { score: habitsScore, trend: habitsTrend },
    pillars,
  };
}

/**
 * Build coach summary from pillar analytics
 */
export function buildCoachSummary(pillarAnalytics) {
  if (!pillarAnalytics) return null;

  const { pillars } = pillarAnalytics;
  const avgScore = Math.round(pillars.reduce((sum, p) => sum + p.score, 0) / pillars.length);

  // Find weakest pillar
  const weakest = pillars.reduce((min, p) =>
    p.score < min.score ? p : min
  );

  // Determine kicker
  let kicker = "COACH SIGNAL";
  if (avgScore >= 80) kicker = "MOMENTUM UP";
  else if (avgScore >= 60) kicker = "ON TRACK";
  else if (avgScore >= 40) kicker = "BUILDING";
  else kicker = "RESET TIME";

  // Build headline
  let headline = "One small action now shifts your day.";
  if (weakest.score < 30) {
    headline = `${weakest.name} needs attention. Start with one small win.`;
  } else if (avgScore >= 80) {
    headline = `Keep up the momentum. You're crushing it.`;
  }

  // Build text
  let text = "The next 3 hours matter most. What's one action you can take?";
  if (weakest.score < 30) {
    text = `${weakest.description} is the biggest opportunity right now. Focus there.`;
  }

  // Build action
  const action = {
    type: "hub",
    link: weakest.name === "Move" 
      ? "/hubs/fitness" 
      : weakest.name === "Fuel" 
      ? "/hubs/nutrition" 
      : weekest.name === "Recover"
      ? "/hubs/mind-sleep"
      : weakest.name === "Mood"
      ? "/hubs/mind-sleep"
      : "/hubs/lifestyle",
    text: `Improve ${weakest.name}`,
  };

  return {
    kicker,
    headline,
    text,
    action,
    avgScore,
  };
}
