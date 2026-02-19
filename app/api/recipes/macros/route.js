import { NextResponse } from "next/server";

const USDA_KEY = process.env.USDA_API_KEY;

function clamp(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function extractIngredients(meal) {
  // MealDB stores strIngredient1..20 and strMeasure1..20
  const items = [];
  for (let i = 1; i <= 20; i++) {
    const ing = (meal[`strIngredient${i}`] || "").trim();
    const meas = (meal[`strMeasure${i}`] || "").trim();
    if (ing) items.push({ ingredient: ing, measure: meas });
  }
  return items;
}

async function usdaSearchTop(query) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}&query=${encodeURIComponent(query)}&pageSize=1`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  return json.foods?.[0] || null;
}

function pickMacros(food) {
  // nutrients vary by item; we try best-effort
  const nutrients = food?.foodNutrients || [];
  const get = (name) => {
    const hit = nutrients.find((n) => (n.nutrientName || "").toLowerCase().includes(name));
    return clamp(hit?.value);
  };
  return {
    calories: get("energy"),
    proteinG: get("protein"),
    carbsG: get("carbohydrate"),
    fatG: get("total lipid"),
  };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") || "").trim();
  const servings = clamp(searchParams.get("servings")) || 2;

  if (!id) return NextResponse.json({ error: "Missing recipe id" }, { status: 400 });
  if (!USDA_KEY) return NextResponse.json({ error: "Missing USDA_API_KEY" }, { status: 500 });

  // 1) get meal
  const mealRes = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`, { cache: "no-store" });
  const mealJson = await mealRes.json();
  const meal = mealJson.meals?.[0];
  if (!meal) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  // 2) ingredients list
  const ingredients = extractIngredients(meal);

  // 3) estimate macros by searching each ingredient in USDA
  let totals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

  // best-effort: treat each ingredient as 1 “unit” (not perfect, but okay for MVP)
  // later you’ll parse measures into grams.
  for (const item of ingredients.slice(0, 12)) { // cap for speed
    const top = await usdaSearchTop(item.ingredient);
    const m = pickMacros(top);
    totals.calories += m.calories;
    totals.proteinG += m.proteinG;
    totals.carbsG += m.carbsG;
    totals.fatG += m.fatG;
  }

  const perServing = {
    calories: Math.round(totals.calories / servings),
    proteinG: Math.round(totals.proteinG / servings),
    carbsG: Math.round(totals.carbsG / servings),
    fatG: Math.round(totals.fatG / servings),
  };

  return NextResponse.json({
    id,
    label: meal.strMeal,
    servingsDefault: servings,
    totals: {
      calories: Math.round(totals.calories),
      proteinG: Math.round(totals.proteinG),
      carbsG: Math.round(totals.carbsG),
      fatG: Math.round(totals.fatG),
    },
    perServing,
    ingredients,
  });
}
