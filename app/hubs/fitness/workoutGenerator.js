export const GOAL_OPTIONS = [
  "build bigger glutes overall",
  "build upper glutes",
  "build glutes with less quad emphasis",
  "improve back definition",
  "improve posture / upper back tone",
  "strengthen back without emphasizing a wider back look",
  "tone upper body without adding much size",
  "build glutes and keep a balanced feminine shape",
];

export const AVOID_OPTIONS = [
  "avoid wider back appearance",
  "avoid too much quad growth",
  "avoid too much arm size",
  "avoid lunges",
  "avoid Bulgarian split squats",
  "lower-impact training",
  "beginner-friendly only",
  "no barbells",
  "home-only substitutions",
];

export const EQUIPMENT_PROFILES = {
  gym: ["bodyweight", "dumbbell", "barbell", "cable", "machine", "bench", "band"],
  home: ["bodyweight", "dumbbell", "band", "bench"],
  minimal: ["bodyweight", "band"],
};

export const EXERCISE_LIBRARY = [
  {
    id: "hip-thrust",
    name: "Hip Thrust",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["hamstrings", "core"],
    movementPattern: "hip hinge",
    equipment: ["barbell", "dumbbell", "bench"],
    locations: ["gym", "home"],
    level: ["beginner", "intermediate"],
    goalTags: ["glute growth", "upper glute focus", "low quad bias"],
    aestheticTags: ["balanced feminine shape"],
    conflictTags: [],
    substitutions: ["Glute Bridge", "Banded Hip Thrust"],
    explanation: "High glute loading with minimal knee travel keeps quad stress lower.",
  },
  {
    id: "rdl",
    name: "Romanian Deadlift",
    primaryMuscles: ["hamstrings", "glutes"],
    secondaryMuscles: ["erectors"],
    movementPattern: "hip hinge",
    equipment: ["barbell", "dumbbell"],
    locations: ["gym", "home"],
    level: ["intermediate", "beginner"],
    goalTags: ["glute growth", "low quad bias"],
    aestheticTags: ["balanced feminine shape"],
    conflictTags: ["no barbells"],
    substitutions: ["Dumbbell RDL", "Single-leg RDL"],
    explanation: "Builds posterior chain and supports glute size without quad-dominant squat loading.",
  },
  {
    id: "cable-kickback",
    name: "Cable Glute Kickback",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["core"],
    movementPattern: "isolation",
    equipment: ["cable", "band"],
    locations: ["gym", "home"],
    level: ["beginner", "intermediate"],
    goalTags: ["upper glute focus", "glute growth"],
    aestheticTags: ["balanced feminine shape"],
    conflictTags: [],
    substitutions: ["Banded Kickback"],
    explanation: "Direct glute isolation to increase glute volume with very low quad involvement.",
  },
  {
    id: "step-up",
    name: "Low Box Step-up",
    primaryMuscles: ["glutes", "quads"],
    secondaryMuscles: ["core"],
    movementPattern: "single-leg squat",
    equipment: ["dumbbell", "bench"],
    locations: ["gym", "home"],
    level: ["beginner", "intermediate"],
    goalTags: ["balanced lower body"],
    aestheticTags: ["balanced feminine shape"],
    conflictTags: ["lower-impact training"],
    substitutions: ["Split Squat"],
    explanation: "Single-leg strength with moderate glute focus; kept optional for balance days.",
  },
  {
    id: "chest-supported-row",
    name: "Chest-Supported Row",
    primaryMuscles: ["upper back", "mid back"],
    secondaryMuscles: ["rear delts", "biceps"],
    movementPattern: "horizontal pull",
    equipment: ["dumbbell", "machine", "bench"],
    locations: ["gym", "home"],
    level: ["beginner", "intermediate"],
    goalTags: ["back definition", "posture support"],
    aestheticTags: ["tone upper body"],
    conflictTags: [],
    substitutions: ["Seated Cable Row", "Band Row"],
    explanation: "Builds upper-back detail and posture support without over-prioritizing lat flare.",
  },
  {
    id: "neutral-row",
    name: "Neutral-Grip Seated Row",
    primaryMuscles: ["mid back"],
    secondaryMuscles: ["rear delts", "biceps"],
    movementPattern: "horizontal pull",
    equipment: ["cable", "band"],
    locations: ["gym", "home"],
    level: ["beginner", "intermediate"],
    goalTags: ["back definition", "posture support"],
    aestheticTags: ["tone upper body"],
    conflictTags: [],
    substitutions: ["Band Seated Row"],
    explanation: "Neutral pull angle emphasizes mid-back quality and postural strength.",
  },
  {
    id: "wide-lat-pulldown",
    name: "Wide-Grip Lat Pulldown",
    primaryMuscles: ["lats"],
    secondaryMuscles: ["biceps"],
    movementPattern: "vertical pull",
    equipment: ["cable", "machine"],
    locations: ["gym"],
    level: ["beginner", "intermediate"],
    goalTags: ["back width"],
    aestheticTags: ["v taper"],
    conflictTags: ["avoid wider back appearance"],
    substitutions: ["Neutral Pulldown"],
    explanation: "Strong lat-width stimulus; deprioritized when width is not desired.",
  },
  {
    id: "face-pull",
    name: "Face Pull",
    primaryMuscles: ["rear delts", "upper back"],
    secondaryMuscles: ["rotator cuff"],
    movementPattern: "posture",
    equipment: ["cable", "band"],
    locations: ["gym", "home"],
    level: ["beginner", "intermediate"],
    goalTags: ["posture support", "back definition"],
    aestheticTags: ["tone upper body"],
    conflictTags: [],
    substitutions: ["Band Pull-apart"],
    explanation: "Great posture and shoulder-balance movement for a toned upper-back look.",
  },
  {
    id: "incline-pushup",
    name: "Incline Push-up",
    primaryMuscles: ["chest", "triceps"],
    secondaryMuscles: ["core"],
    movementPattern: "horizontal press",
    equipment: ["bodyweight", "bench"],
    locations: ["gym", "home"],
    level: ["beginner"],
    goalTags: ["upper body balance"],
    aestheticTags: ["tone upper body"],
    conflictTags: [],
    substitutions: ["Dumbbell Floor Press"],
    explanation: "Simple pressing movement that supports balance without high hypertrophy complexity.",
  },
  {
    id: "db-press",
    name: "Dumbbell Shoulder Press",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["triceps", "upper chest"],
    movementPattern: "vertical press",
    equipment: ["dumbbell"],
    locations: ["gym", "home"],
    level: ["beginner", "intermediate"],
    goalTags: ["upper body balance"],
    aestheticTags: ["tone upper body"],
    conflictTags: ["avoid too much arm size"],
    substitutions: ["Arnold Press"],
    explanation: "Controlled overhead pressing for shoulder balance and posture.",
  },
  {
    id: "reverse-lunge",
    name: "Reverse Lunge",
    primaryMuscles: ["glutes", "quads"],
    secondaryMuscles: ["hamstrings"],
    movementPattern: "single-leg squat",
    equipment: ["bodyweight", "dumbbell"],
    locations: ["gym", "home"],
    level: ["beginner", "intermediate"],
    goalTags: ["balanced lower body"],
    aestheticTags: ["balanced feminine shape"],
    conflictTags: ["avoid lunges", "lower-impact training"],
    substitutions: ["Step-up"],
    explanation: "Useful unilateral pattern, excluded when lunges are disliked.",
  },
  {
    id: "bulgarian",
    name: "Bulgarian Split Squat",
    primaryMuscles: ["glutes", "quads"],
    secondaryMuscles: ["core"],
    movementPattern: "single-leg squat",
    equipment: ["dumbbell", "bench"],
    locations: ["gym", "home"],
    level: ["intermediate"],
    goalTags: ["glute growth"],
    aestheticTags: ["balanced feminine shape"],
    conflictTags: ["avoid Bulgarian split squats", "avoid too much quad growth"],
    substitutions: ["Static Split Squat"],
    explanation: "High unilateral demand; filtered when this movement is avoided.",
  },
  {
    id: "glute-bridge",
    name: "Glute Bridge",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["hamstrings"],
    movementPattern: "hip hinge",
    equipment: ["bodyweight", "dumbbell", "band"],
    locations: ["gym", "home"],
    level: ["beginner"],
    goalTags: ["glute growth", "low impact", "beginner friendly"],
    aestheticTags: ["balanced feminine shape"],
    conflictTags: [],
    substitutions: ["Hip Thrust"],
    explanation: "Beginner-friendly glute pattern with low joint stress.",
  },
  {
    id: "band-walk",
    name: "Banded Lateral Walk",
    primaryMuscles: ["glute medius"],
    secondaryMuscles: ["glutes"],
    movementPattern: "activation",
    equipment: ["band"],
    locations: ["gym", "home"],
    level: ["beginner", "intermediate"],
    goalTags: ["upper glute focus", "glute growth", "low impact"],
    aestheticTags: ["balanced feminine shape"],
    conflictTags: [],
    substitutions: ["Standing Abduction"],
    explanation: "Targets upper/side glutes for shape and hip stability.",
  },
  {
    id: "bird-dog-row",
    name: "Bird-Dog Row",
    primaryMuscles: ["upper back", "core"],
    secondaryMuscles: ["lats"],
    movementPattern: "stability pull",
    equipment: ["dumbbell"],
    locations: ["home", "gym"],
    level: ["beginner"],
    goalTags: ["posture support", "beginner friendly"],
    aestheticTags: ["tone upper body"],
    conflictTags: [],
    substitutions: ["Band Row"],
    explanation: "Posture + stability move ideal when keeping upper-body loading moderate.",
  },
];

const GOAL_SIGNAL_MAP = [
  {
    goal: "build bigger glutes overall",
    signals: ["big glute", "bigger glute", "grow glute", "glute growth", "bigger butt", "bigger thighs and glutes", "bigger glutes"],
  },
  {
    goal: "build upper glutes",
    signals: ["upper glute", "top glute", "shelf glute", "rounder upper glute"],
  },
  {
    goal: "build glutes with less quad emphasis",
    signals: ["less quad", "low quad", "without quad", "glute bias"],
  },
  {
    goal: "improve back definition",
    signals: ["back definition", "toned back", "defined back", "nice back", "back with definition"],
  },
  {
    goal: "improve posture / upper back tone",
    signals: ["posture", "upper back tone", "upper back", "stand straighter"],
  },
  {
    goal: "strengthen back without emphasizing a wider back look",
    signals: ["narrow back", "not wide back", "without wider back", "avoid wide back"],
  },
  {
    goal: "tone upper body without adding much size",
    signals: ["tone upper body", "without size", "no bulky upper", "lean upper body"],
  },
  {
    goal: "build glutes and keep a balanced feminine shape",
    signals: ["feminine shape", "balanced shape", "curvy but balanced"],
  },
];

const AVOID_SIGNAL_MAP = [
  { avoid: "avoid wider back appearance", signals: ["not wide back", "avoid wide back", "narrow back"] },
  { avoid: "avoid too much quad growth", signals: ["not too muscular thighs", "less quad", "avoid quad growth"] },
  { avoid: "avoid too much arm size", signals: ["avoid arm size", "not big arms", "no bulky arms"] },
  { avoid: "avoid lunges", signals: ["avoid lunge", "no lunge"] },
  { avoid: "avoid Bulgarian split squats", signals: ["avoid bulgarian", "no bulgarian"] },
  { avoid: "lower-impact training", signals: ["low impact", "lower impact", "joint friendly"] },
  { avoid: "beginner-friendly only", signals: ["beginner", "new to training", "easy exercises"] },
  { avoid: "no barbells", signals: ["no barbell", "without barbell"] },
  { avoid: "home-only substitutions", signals: ["home", "at home", "home only"] },
];

function matchesEquipment(exercise, equipmentList) {
  return exercise.equipment.some((item) => equipmentList.includes(item));
}

function hasConflicts(exercise, avoid) {
  return exercise.conflictTags.some((tag) => avoid.includes(tag));
}

function beginnerSafe(exercise, level) {
  if (level !== "beginner") return true;
  return exercise.level.includes("beginner");
}

function setsRepsForGoal(dayFocus, level) {
  if (dayFocus.includes("Glute")) return level === "beginner" ? "3 sets × 10-12 reps" : "3-4 sets × 8-12 reps";
  if (dayFocus.includes("Upper")) return "2-3 sets × 10-15 reps";
  return "2-3 sets × 8-12 reps";
}

function dayTemplateForFrequency(frequency, primaryGoals) {
  if (frequency >= 4 && primaryGoals.some((x) => x.includes("glute"))) {
    return [
      { name: "Day 1", focus: "Glute growth (hip-dominant)" },
      { name: "Day 2", focus: "Upper balance + posture" },
      { name: "Day 3", focus: "Glute growth (upper-glute bias)" },
      { name: "Day 4", focus: "Upper definition + posture" },
    ];
  }
  if (frequency === 3) {
    return [
      { name: "Day 1", focus: "Lower glute-focused" },
      { name: "Day 2", focus: "Upper posture + tone" },
      { name: "Day 3", focus: "Lower + core balance" },
    ];
  }
  return [
    { name: "Day 1", focus: "Full-body goal session" },
    { name: "Day 2", focus: "Full-body support session" },
  ];
}

function uniqueById(list) {
  const seen = new Set();
  return list.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function coachFollowUpsFromPrompt(text, parsedInput, captured) {
  const followUps = [];
  const mentionsGlutes = text.includes("glute") || text.includes("butt") || text.includes("thigh");
  if (mentionsGlutes && !captured.upperGlute && !captured.overallGlute) {
    followUps.push("Do you want overall glute growth or more upper-glute emphasis?");
  }
  if (mentionsGlutes && !parsedInput.avoid.includes("avoid too much quad growth")) {
    followUps.push("Should I keep quad growth lower while we build your glutes?");
  }
  if (!captured.upperBodyPreference) {
    followUps.push("Do you want balanced upper-body training for posture and symmetry?");
  }
  if (!captured.aestheticAvoids) {
    followUps.push("Any aesthetic constraints to avoid (wider back, too much arm size, or high-impact moves)?");
  }
  if (!captured.trainingDays) followUps.push("How many days per week can you train?");
  if (!captured.level) followUps.push("What is your experience level (beginner or intermediate)?");
  if (!captured.equipmentAccess) followUps.push("Will you train at home, a full gym, or with minimal equipment?");
  if (!captured.sessionMinutes) followUps.push("How long should each session be?");
  return followUps;
}


export function parseGeneratorPrompt(prompt, currentInput = {}) {
  const text = String(prompt || "").toLowerCase();
  const nextGoals = new Set(Array.isArray(currentInput.primaryGoals) ? currentInput.primaryGoals : []);
  const nextAvoid = new Set(Array.isArray(currentInput.avoid) ? currentInput.avoid : []);

  GOAL_SIGNAL_MAP.forEach((item) => {
    if (item.signals.some((signal) => text.includes(signal))) nextGoals.add(item.goal);
  });

  AVOID_SIGNAL_MAP.forEach((item) => {
    if (item.signals.some((signal) => text.includes(signal))) nextAvoid.add(item.avoid);
  });

  const trainingDays = text.match(/([2-6])\s*(day|days)\s*(a|per)?\s*week/)?.[1];
  const sessionMinutes = text.match(/(\d{2})\s*(min|minutes)/)?.[1];

  const level = text.includes("beginner") ? "beginner" : currentInput.level || "beginner";

  const equipmentAccess = text.includes("minimal")
    ? "minimal"
    : text.includes("home")
      ? "home"
      : text.includes("gym")
        ? "gym"
        : currentInput.equipmentAccess || "home";

  if (nextGoals.size === 0) {
    nextGoals.add("build bigger glutes overall");
  }

  const planInput = {
    ...currentInput,
    primaryGoals: [...nextGoals],
    avoid: [...nextAvoid],
    trainingDays: trainingDays ? Number(trainingDays) : currentInput.trainingDays || 4,
    level,
    equipmentAccess,
    sessionStructure: {
      ...(currentInput.sessionStructure || {}),
      sessionMinutes: sessionMinutes ? Number(sessionMinutes) : currentInput.sessionStructure?.sessionMinutes || 50,
      exercisesPerDay: currentInput.sessionStructure?.exercisesPerDay || 4,
    },
  };

  const captured = {
    overallGlute: text.includes("overall glute") || text.includes("bigger glute") || text.includes("grow glute"),
    upperGlute: text.includes("upper glute") || text.includes("top glute"),
    upperBodyPreference: text.includes("upper body") || text.includes("posture") || text.includes("balanced"),
    aestheticAvoids: ["avoid", "not too", "without", "no "].some((token) => text.includes(token)),
    trainingDays: Boolean(trainingDays),
    level: text.includes("beginner") || text.includes("intermediate"),
    equipmentAccess: text.includes("home") || text.includes("gym") || text.includes("minimal"),
    sessionMinutes: Boolean(sessionMinutes),
  };

  const followUps = coachFollowUpsFromPrompt(text, planInput, captured);
  const coachReply = followUps.length
    ? "Great direction — I can build this, but I want to confirm a few details first so your plan matches your exact look and constraints."
    : "Perfect — I have enough detail to build a high-specificity plan.";

  return {
    planInput,
    interpretation: {
      goals: [...nextGoals],
      avoid: [...nextAvoid],
      followUps,
      coachReply,
      readyToGenerate: followUps.length === 0,
    },
  };
}

export function generateWorkoutPlan(inputs) {
  const avoid = inputs.avoid || [];
  const primaryGoals = inputs.primaryGoals || [];
  const equipmentPool = EQUIPMENT_PROFILES[inputs.equipmentAccess || "gym"];
  const days = dayTemplateForFrequency(Number(inputs.trainingDays) || 3, primaryGoals);

  const filteredLibrary = EXERCISE_LIBRARY.filter(
    (exercise) =>
      matchesEquipment(exercise, equipmentPool) &&
      !hasConflicts(exercise, avoid) &&
      beginnerSafe(exercise, inputs.level),
  );

  const avoidWidth = avoid.includes("avoid wider back appearance");
  const gluteBias = primaryGoals.some((goal) => goal.includes("glute"));
  const upperTone = primaryGoals.some((goal) => goal.includes("upper body") || goal.includes("posture") || goal.includes("back"));

  const usedExerciseIds = new Set();

  const dayPlans = days.map((day, dayIndex) => {
    const focus = day.focus;
    const targetCount = inputs.sessionStructure?.exercisesPerDay || 4;
    const baseCandidates = filteredLibrary.filter((exercise) => {
      if (focus.includes("Glute") || focus.includes("Lower")) {
        return exercise.goalTags.includes("glute growth") || exercise.goalTags.includes("upper glute focus") || exercise.primaryMuscles.includes("glutes");
      }
      if (focus.includes("Upper") || focus.includes("posture")) {
        if (avoidWidth && exercise.goalTags.includes("back width")) return false;
        return exercise.goalTags.includes("posture support") || exercise.goalTags.includes("back definition") || exercise.aestheticTags.includes("tone upper body") || exercise.goalTags.includes("upper body balance");
      }
      return true;
    });

    const freshCandidates = baseCandidates.filter((exercise) => !usedExerciseIds.has(exercise.id));
    const fallbackPool = filteredLibrary.filter((exercise) => !usedExerciseIds.has(exercise.id));
    const fallback = fallbackPool.length ? fallbackPool : filteredLibrary.slice(dayIndex, dayIndex + targetCount);
    let selected = uniqueById([...(freshCandidates.length ? freshCandidates : baseCandidates), ...fallback]).slice(0, targetCount);

    if ((focus.includes("Glute") || focus.includes("Lower")) && gluteBias) {
      const hasGluteMedius = selected.some((exercise) => exercise.primaryMuscles.includes("glute medius"));
      if (!hasGluteMedius) {
        const mediusOption = filteredLibrary.find((exercise) => exercise.primaryMuscles.includes("glute medius") && !selected.some((picked) => picked.id === exercise.id));
        if (mediusOption && selected.length > 0) {
          selected[selected.length - 1] = mediusOption;
        }
      }
    }

    selected.forEach((exercise) => usedExerciseIds.add(exercise.id));

    return {
      id: `${day.name.toLowerCase().replace(/\s+/g, "-")}-${dayIndex}`,
      name: day.name,
      focus,
      sessionMinutes: inputs.sessionStructure?.sessionMinutes || 50,
      exercises: selected.map((exercise, idx) => ({
        id: `${exercise.id}-${dayIndex}-${idx}`,
        name: exercise.name,
        targets: [...exercise.primaryMuscles, ...exercise.secondaryMuscles].slice(0, 3),
        why: exercise.explanation,
        setsReps: setsRepsForGoal(focus, inputs.level),
        substitutions: exercise.substitutions,
        equipmentNote: exercise.equipment.join(" / "),
      })),
    };
  });

  const summary = `Your plan uses ${dayPlans.length} training day${dayPlans.length > 1 ? "s" : ""} with ${gluteBias ? "glute-priority" : "balanced"} lower-body structure and ${upperTone ? "posture and upper-body support" : "general support"}. ${avoidWidth ? "Back work is selected for definition and posture while avoiding width-dominant patterns." : "Back work includes both support and performance-focused pulling."}`;

  return {
    id: `gen-${Date.now()}`,
    planName: inputs.planName || "Syra Personalized Plan",
    createdAt: new Date().toISOString(),
    summary,
    targetMuscles: gluteBias ? ["glutes", "hamstrings", "upper back"] : ["full body", "core"],
    inputs,
    days: dayPlans,
  };
}

export function toTemplatePayload(plan) {
  return {
    id: typeof crypto !== "undefined" && crypto?.randomUUID ? crypto.randomUUID() : `tpl-${Date.now()}`,
    name: plan.planName,
    exercises: plan.days.flatMap((day) => day.exercises.map((exercise) => `${day.name}: ${exercise.name}`)),
    generatedPlan: plan,
    createdAt: Date.now(),
  };
}
