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

  const dayPlans = days.map((day, dayIndex) => {
    const focus = day.focus;
    const candidates = filteredLibrary
      .filter((exercise) => {
        if (focus.includes("Glute") || focus.includes("Lower")) {
          return exercise.goalTags.includes("glute growth") || exercise.goalTags.includes("upper glute focus") || exercise.primaryMuscles.includes("glutes");
        }
        if (focus.includes("Upper") || focus.includes("posture")) {
          if (avoidWidth && exercise.goalTags.includes("back width")) return false;
          return exercise.goalTags.includes("posture support") || exercise.goalTags.includes("back definition") || exercise.aestheticTags.includes("tone upper body") || exercise.goalTags.includes("upper body balance");
        }
        return true;
      })
      .slice(0, 5);

    const fallback = filteredLibrary.slice(dayIndex, dayIndex + 4);
    const selected = (candidates.length >= 4 ? candidates : fallback).slice(0, inputs.sessionStructure?.exercisesPerDay || 4);

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
