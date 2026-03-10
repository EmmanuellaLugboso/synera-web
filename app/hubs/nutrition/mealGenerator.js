export const NUTRITION_GOALS = [
  "fat loss",
  "fat loss with glute retention",
  "muscle gain",
  "glute growth support",
  "general healthy eating",
  "maintenance",
  "high protein tone/recomp",
];

export const EATING_STYLE_OPTIONS = [
  "balanced",
  "high protein",
  "low carb",
  "plant-based",
  "Mediterranean",
  "pescatarian",
  "simple comfort meals",
  "budget-friendly meals",
];

export const COOKING_EFFORT_OPTIONS = ["low", "medium", "high"];
export const BUDGET_OPTIONS = ["budget", "standard", "premium"];

export const MEAL_LIBRARY = [
  {
    id: "greek-yogurt-bowl",
    name: "Greek Yogurt Protein Bowl",
    mealType: "breakfast",
    calories: 390,
    protein: 34,
    carbs: 38,
    fat: 11,
    eatingStyleTags: ["balanced", "high protein", "budget-friendly meals"],
    goalTags: ["fat loss", "high protein tone/recomp", "glute growth support", "maintenance"],
    allergens: ["dairy"],
    ingredients: ["0% greek yogurt", "berries", "chia", "granola"],
    prepEffort: "low",
    budgetLevel: "budget",
    substitutions: ["soy yogurt", "cottage cheese", "banana instead of berries"],
    explanation: "Front-loads protein early to improve fullness and support recovery.",
    vibes: ["quick and easy", "aesthetic healthy meals", "meal prep friendly", "filling meals"],
  },
  {
    id: "egg-avocado-toast",
    name: "Savory Egg + Avocado Toast",
    mealType: "breakfast",
    calories: 430,
    protein: 26,
    carbs: 34,
    fat: 20,
    eatingStyleTags: ["balanced", "simple comfort meals"],
    goalTags: ["maintenance", "general healthy eating", "muscle gain"],
    allergens: ["eggs", "gluten"],
    ingredients: ["eggs", "sourdough", "avocado", "tomato"],
    prepEffort: "low",
    budgetLevel: "standard",
    substitutions: ["egg whites", "gluten-free bread", "hummus"],
    explanation: "Balanced breakfast with stable energy and moderate protein.",
    vibes: ["savory breakfasts", "quick and easy", "filling meals"],
  },
  {
    id: "overnight-oats-pro",
    name: "Protein Overnight Oats",
    mealType: "breakfast",
    calories: 440,
    protein: 35,
    carbs: 49,
    fat: 10,
    eatingStyleTags: ["balanced", "high protein", "budget-friendly meals"],
    goalTags: ["fat loss", "glute growth support", "high protein tone/recomp"],
    allergens: ["dairy", "gluten"],
    ingredients: ["oats", "milk", "protein powder", "banana", "cinnamon"],
    prepEffort: "low",
    budgetLevel: "budget",
    substitutions: ["almond milk", "chia pudding base", "berries"],
    explanation: "Meal-prep ready breakfast to hit protein without morning cooking.",
    vibes: ["meal prep friendly", "quick and easy", "gym girl meals", "sweeter breakfasts"],
  },
  {
    id: "chicken-rice-bowl",
    name: "Chicken Rice Bowl",
    mealType: "lunch",
    calories: 560,
    protein: 44,
    carbs: 61,
    fat: 15,
    eatingStyleTags: ["balanced", "high protein", "simple comfort meals"],
    goalTags: ["muscle gain", "glute growth support", "high protein tone/recomp"],
    allergens: [],
    ingredients: ["chicken breast", "jasmine rice", "bell peppers", "olive oil"],
    prepEffort: "medium",
    budgetLevel: "standard",
    substitutions: ["turkey", "tofu", "sweet potato"],
    explanation: "Reliable high-protein lunch with enough carbs for training support.",
    vibes: ["gym girl meals", "meal prep friendly", "filling meals"],
  },
  {
    id: "salmon-quinoa-bowl",
    name: "Salmon Quinoa Bowl",
    mealType: "lunch",
    calories: 590,
    protein: 40,
    carbs: 48,
    fat: 25,
    eatingStyleTags: ["Mediterranean", "pescatarian", "balanced"],
    goalTags: ["general healthy eating", "maintenance", "fat loss with glute retention"],
    allergens: ["fish"],
    ingredients: ["salmon", "quinoa", "cucumber", "spinach", "lemon"],
    prepEffort: "medium",
    budgetLevel: "premium",
    substitutions: ["cod", "tuna", "chickpeas"],
    explanation: "Higher omega-3 meal for recovery and satiety with clean carbs.",
    vibes: ["aesthetic healthy meals", "filling meals"],
  },
  {
    id: "tofu-stirfry",
    name: "Tofu Stir-Fry Noodle Bowl",
    mealType: "lunch",
    calories: 520,
    protein: 31,
    carbs: 59,
    fat: 17,
    eatingStyleTags: ["plant-based", "balanced"],
    goalTags: ["maintenance", "general healthy eating", "muscle gain"],
    allergens: ["soy", "gluten"],
    ingredients: ["firm tofu", "rice noodles", "broccoli", "ginger sauce"],
    prepEffort: "medium",
    budgetLevel: "standard",
    substitutions: ["edamame", "tempeh", "brown rice"],
    explanation: "Plant-forward high-protein lunch with diverse micronutrient coverage.",
    vibes: ["aesthetic healthy meals", "more variety"],
  },
  {
    id: "turkey-chili",
    name: "Turkey Bean Chili",
    mealType: "dinner",
    calories: 540,
    protein: 43,
    carbs: 45,
    fat: 19,
    eatingStyleTags: ["high protein", "simple comfort meals", "budget-friendly meals"],
    goalTags: ["fat loss with glute retention", "high protein tone/recomp", "maintenance"],
    allergens: [],
    ingredients: ["lean turkey", "kidney beans", "tomato", "onion"],
    prepEffort: "medium",
    budgetLevel: "budget",
    substitutions: ["lean beef", "lentils", "black beans"],
    explanation: "High-protein comfort meal that keeps hunger low in evening hours.",
    vibes: ["simple comfort meals", "meal prep friendly", "filling meals"],
  },
  {
    id: "shrimp-tacos",
    name: "Shrimp Taco Plate",
    mealType: "dinner",
    calories: 510,
    protein: 39,
    carbs: 46,
    fat: 18,
    eatingStyleTags: ["pescatarian", "balanced"],
    goalTags: ["general healthy eating", "maintenance", "fat loss"],
    allergens: ["shellfish"],
    ingredients: ["shrimp", "corn tortillas", "cabbage", "yogurt lime sauce"],
    prepEffort: "medium",
    budgetLevel: "standard",
    substitutions: ["white fish", "chicken", "tofu"],
    explanation: "Lighter dinner with high protein and controlled calories.",
    vibes: ["aesthetic healthy meals", "savory breakfasts"],
  },
  {
    id: "beef-potato-skillet",
    name: "Lean Beef + Potato Skillet",
    mealType: "dinner",
    calories: 620,
    protein: 45,
    carbs: 54,
    fat: 24,
    eatingStyleTags: ["high protein", "simple comfort meals"],
    goalTags: ["muscle gain", "glute growth support"],
    allergens: [],
    ingredients: ["lean beef", "potatoes", "zucchini", "parmesan"],
    prepEffort: "medium",
    budgetLevel: "standard",
    substitutions: ["ground turkey", "sweet potato", "tempeh"],
    explanation: "Dense protein + carb dinner built for performance and growth phases.",
    vibes: ["gym girl meals", "filling meals", "savory breakfasts"],
  },
  {
    id: "protein-smoothie",
    name: "Protein Smoothie",
    mealType: "snack",
    calories: 300,
    protein: 30,
    carbs: 24,
    fat: 8,
    eatingStyleTags: ["high protein", "balanced", "low carb"],
    goalTags: ["fat loss", "glute growth support", "high protein tone/recomp"],
    allergens: ["dairy"],
    ingredients: ["protein powder", "frozen berries", "spinach", "milk"],
    prepEffort: "low",
    budgetLevel: "standard",
    substitutions: ["plant protein", "water + ice", "banana"],
    explanation: "Quick protein top-up to close daily target gaps.",
    vibes: ["quick and easy", "more snack options", "meal prep friendly"],
  },
  {
    id: "cottage-fruit-cup",
    name: "Cottage Cheese Fruit Cup",
    mealType: "snack",
    calories: 250,
    protein: 24,
    carbs: 18,
    fat: 9,
    eatingStyleTags: ["high protein", "balanced", "budget-friendly meals"],
    goalTags: ["fat loss", "maintenance", "high protein tone/recomp"],
    allergens: ["dairy"],
    ingredients: ["cottage cheese", "pineapple", "pumpkin seeds"],
    prepEffort: "low",
    budgetLevel: "budget",
    substitutions: ["greek yogurt", "soy yogurt", "berries"],
    explanation: "Snack with strong protein density and good satiety per calorie.",
    vibes: ["quick and easy", "filling meals"],
  },
  {
    id: "hummus-wrap",
    name: "Hummus Veggie Wrap",
    mealType: "snack",
    calories: 310,
    protein: 13,
    carbs: 36,
    fat: 12,
    eatingStyleTags: ["plant-based", "Mediterranean", "budget-friendly meals"],
    goalTags: ["general healthy eating", "maintenance", "fat loss"],
    allergens: ["gluten", "sesame"],
    ingredients: ["whole wheat wrap", "hummus", "cucumber", "carrot"],
    prepEffort: "low",
    budgetLevel: "budget",
    substitutions: ["gluten-free wrap", "bean spread", "tofu strips"],
    explanation: "Simple high-fiber snack for appetite control and consistency.",
    vibes: ["quick and easy", "budget-friendly meals"],
  },
  {
    id: "chickpea-salad",
    name: "Mediterranean Chickpea Salad",
    mealType: "lunch",
    calories: 460,
    protein: 24,
    carbs: 52,
    fat: 17,
    eatingStyleTags: ["Mediterranean", "plant-based", "balanced"],
    goalTags: ["fat loss", "general healthy eating", "maintenance"],
    allergens: [],
    ingredients: ["chickpeas", "cucumber", "tomato", "feta", "olive oil"],
    prepEffort: "low",
    budgetLevel: "budget",
    substitutions: ["tofu cubes", "quinoa", "extra greens"],
    explanation: "High-fiber lunch to keep calories controlled without feeling restrictive.",
    vibes: ["aesthetic healthy meals", "meal prep friendly"],
  },
  {
    id: "sheet-pan-chicken",
    name: "Sheet-Pan Chicken + Veg",
    mealType: "dinner",
    calories: 500,
    protein: 42,
    carbs: 34,
    fat: 20,
    eatingStyleTags: ["balanced", "high protein", "low carb"],
    goalTags: ["fat loss", "fat loss with glute retention", "maintenance"],
    allergens: [],
    ingredients: ["chicken thighs", "broccoli", "carrots", "olive oil"],
    prepEffort: "low",
    budgetLevel: "standard",
    substitutions: ["salmon", "tofu", "cauliflower"],
    explanation: "Low-effort, high-protein dinner with simple cleanup.",
    vibes: ["low effort", "meal prep friendly", "filling meals"],
  },
  {
    id: "protein-pancakes",
    name: "Protein Oat Pancakes",
    mealType: "breakfast",
    calories: 470,
    protein: 33,
    carbs: 50,
    fat: 14,
    eatingStyleTags: ["high protein", "simple comfort meals"],
    goalTags: ["muscle gain", "glute growth support", "maintenance"],
    allergens: ["eggs", "dairy", "gluten"],
    ingredients: ["oats", "eggs", "protein powder", "banana"],
    prepEffort: "medium",
    budgetLevel: "standard",
    substitutions: ["egg white carton", "plant protein", "buckwheat"],
    explanation: "Higher-carb breakfast option for training-heavy days.",
    vibes: ["sweeter breakfasts", "gym girl meals", "more variety"],
  },
];

function matchesAllergies(meal, allergies = [], avoidFoods = []) {
  const blocked = [...allergies, ...avoidFoods].map((x) => String(x || "").toLowerCase());
  const mealAllergens = meal.allergens.map((x) => x.toLowerCase());
  const mealIngredients = meal.ingredients.map((x) => x.toLowerCase());
  return !blocked.some((item) => mealAllergens.includes(item) || mealIngredients.some((ing) => ing.includes(item)));
}

function scoreMeal(meal, input) {
  let score = 0;
  if (meal.goalTags.includes(input.primaryGoal)) score += 5;
  if (meal.eatingStyleTags.includes(input.eatingStyle)) score += 4;
  if (meal.vibes.includes(input.mealVibe)) score += 3;
  if (meal.prepEffort === input.cookingEffort) score += 3;
  if (meal.budgetLevel === input.budgetLevel) score += 2;
  if (input.snackPreference === "more snacks" && meal.mealType === "snack") score += 2;
  if (input.snackPreference === "fewer snacks" && meal.mealType === "snack") score -= 2;
  if (input.varietyMode === "simple") score += meal.prepEffort === "low" ? 2 : 0;
  if (input.proteinTarget >= 130) score += meal.protein >= 30 ? 2 : 0;
  return score;
}

function chooseMealsForType(candidates, count, used, varietyMode) {
  const output = [];
  const ordered = [...candidates].sort((a, b) => b.score - a.score);
  for (const item of ordered) {
    if (output.length >= count) break;
    if (varietyMode !== "meal prep" && used.has(item.id)) continue;
    output.push(item);
    used.add(item.id);
  }
  if (output.length < count) {
    for (const item of ordered) {
      if (output.length >= count) break;
      output.push(item);
    }
  }
  return output;
}

export function buildMealGeneratorInput(profile = {}) {
  const foodGoals = Array.isArray(profile.foodGoals) ? profile.foodGoals : [];
  const mealFrequency = Number(profile.mealFrequency) || 4;
  const goal = foodGoals.includes("fat loss")
    ? "fat loss"
    : foodGoals.includes("muscle gain")
      ? "muscle gain"
      : foodGoals.includes("high protein")
        ? "high protein tone/recomp"
        : "general healthy eating";

  return {
    planName: "Syra Personalized Nutrition Plan",
    primaryGoal: goal,
    calorieTarget: Number(profile.calorieGoal) || 1800,
    proteinTarget: Number(profile?.macroGoals?.proteinG) || 120,
    eatingStyle: profile.eatingStyle || "balanced",
    allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
    avoidFoods: [],
    mealsPerDay: Math.min(6, Math.max(3, mealFrequency)),
    snackPreference: "balanced",
    cookingEffort: "low",
    budgetLevel: "standard",
    mealVibe: "quick and easy",
    varietyMode: "balanced",
  };
}

export function generateMealPlan(input) {
  const safe = { ...input, allergies: input.allergies || [], avoidFoods: input.avoidFoods || [] };
  const pool = MEAL_LIBRARY
    .filter((meal) => matchesAllergies(meal, safe.allergies, safe.avoidFoods))
    .map((meal) => ({ ...meal, score: scoreMeal(meal, safe) }));

  const mealsPerDay = Number(safe.mealsPerDay) || 4;
  const snackCount = mealsPerDay >= 5 || safe.snackPreference === "more snacks" ? 2 : mealsPerDay === 4 ? 1 : 0;
  const baseMeals = mealsPerDay - snackCount;
  const breakfastCount = 1;
  const lunchCount = baseMeals >= 3 ? 1 : 1;
  const dinnerCount = baseMeals >= 3 ? 1 : 1;
  const extraCount = Math.max(0, baseMeals - 3);

  const used = new Set();
  const breakfast = chooseMealsForType(pool.filter((m) => m.mealType === "breakfast"), breakfastCount + extraCount, used, safe.varietyMode);
  const lunch = chooseMealsForType(pool.filter((m) => m.mealType === "lunch"), lunchCount, used, safe.varietyMode);
  const dinner = chooseMealsForType(pool.filter((m) => m.mealType === "dinner"), dinnerCount, used, safe.varietyMode);
  const snacks = chooseMealsForType(pool.filter((m) => m.mealType === "snack"), snackCount, used, safe.varietyMode);

  const planMeals = [
    ...breakfast.map((m, i) => ({ ...m, slot: i === 0 ? "Breakfast" : `Breakfast ${i + 1}` })),
    ...lunch.map((m) => ({ ...m, slot: "Lunch" })),
    ...dinner.map((m) => ({ ...m, slot: "Dinner" })),
    ...snacks.map((m, i) => ({ ...m, slot: snackCount > 1 ? `Snack ${i + 1}` : "Snack" })),
  ];

  const totals = planMeals.reduce((acc, m) => ({
    calories: acc.calories + m.calories,
    protein: acc.protein + m.protein,
    carbs: acc.carbs + m.carbs,
    fat: acc.fat + m.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const summary = `This plan supports ${safe.primaryGoal} with ${planMeals.length} eating moments, approximately ${Math.round(totals.protein)}g protein/day, and ${safe.cookingEffort} effort meals matched to your ${safe.eatingStyle} style.`;

  return {
    id: `meal-plan-${Date.now()}`,
    planName: safe.planName || "Syra Personalized Nutrition Plan",
    input: safe,
    summary,
    totals,
    meals: planMeals.map((meal, idx) => ({
      id: `${meal.id}-${idx}`,
      name: meal.name,
      slot: meal.slot,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      why: meal.explanation,
      ingredients: meal.ingredients,
      substitutions: meal.substitutions,
      prepEffort: meal.prepEffort,
      budgetLevel: meal.budgetLevel,
      vibeTags: meal.vibes.slice(0, 2),
      mealType: meal.mealType,
    })),
  };
}

export function swapMealWithAlternative(plan, mealId) {
  const meal = plan.meals.find((m) => m.id === mealId);
  if (!meal) return plan;
  const replacement = MEAL_LIBRARY
    .filter((item) => item.mealType === meal.mealType && item.name !== meal.name)
    .sort((a, b) => b.protein - a.protein)[0];
  if (!replacement) return plan;

  const meals = plan.meals.map((item) => item.id === mealId ? {
    ...item,
    name: replacement.name,
    calories: replacement.calories,
    protein: replacement.protein,
    carbs: replacement.carbs,
    fat: replacement.fat,
    why: replacement.explanation,
    ingredients: replacement.ingredients,
    substitutions: replacement.substitutions,
    prepEffort: replacement.prepEffort,
    budgetLevel: replacement.budgetLevel,
    vibeTags: replacement.vibes.slice(0, 2),
  } : item);

  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + m.calories,
    protein: acc.protein + m.protein,
    carbs: acc.carbs + m.carbs,
    fat: acc.fat + m.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return { ...plan, meals, totals };
}

export function toMealTemplatePayload(plan, nameOverride = "") {
  return {
    id: typeof crypto !== "undefined" && crypto?.randomUUID ? crypto.randomUUID() : `meal-tpl-${Date.now()}`,
    name: nameOverride || plan.planName,
    createdAt: Date.now(),
    generatedMealPlan: plan,
  };
}
