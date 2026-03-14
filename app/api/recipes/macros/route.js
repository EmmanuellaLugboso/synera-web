import {
  fetchWithTimeout,
  getRequestContext,
  jsonConfigMissing,
  jsonError,
  jsonSuccess,
  mapUpstreamError,
  safeJson,
} from "../../_utils";
import { clampNumber } from "../../../utils/helpers.js";

const USDA_KEY = process.env.USDA_API_KEY;

function extractIngredients(meal) {
  const items = [];
  for (let i = 1; i <= 20; i += 1) {
    const ing = (meal[`strIngredient${i}`] || "").trim();
    const meas = (meal[`strMeasure${i}`] || "").trim();
    if (ing) items.push({ ingredient: ing, measure: meas });
  }
  return items;
}

async function usdaSearchTop(query) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}&query=${encodeURIComponent(query)}&pageSize=1`;
  const res = await fetchWithTimeout(url, { cache: "no-store" }, 9000, 1);

  if (!res.ok) return null;
  const json = await safeJson(res);
  return json?.foods?.[0] || null;
}

function pickMacros(food) {
  const nutrients = food?.foodNutrients || [];
  const get = (name) => {
    const hit = nutrients.find((n) => (n.nutrientName || "").toLowerCase().includes(name));
    return clampNumber(hit?.value);
  };
  return {
    calories: get("energy"),
    proteinG: get("protein"),
    carbsG: get("carbohydrate"),
    fatG: get("total lipid"),
  };
}

export async function GET(req) {
  const { requestId } = getRequestContext();
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") || "").trim();
  const servings = clampNumber(searchParams.get("servings")) || 2;

  if (!id) {
    return jsonError({ code: "BAD_REQUEST", message: "Missing recipe id", status: 400, requestId });
  }

  if (!USDA_KEY) return jsonConfigMissing(requestId, "USDA_API_KEY");

  const mealRes = await fetchWithTimeout(
    `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`,
    { cache: "no-store" },
    9000,
    1,
  );

  if (!mealRes.ok) {
    const body = await mealRes.text();
    const upstream = mapUpstreamError(mealRes, body);
    return jsonError({ ...upstream, status: 502, requestId });
  }

  const mealJson = await safeJson(mealRes);
  const meal = mealJson?.meals?.[0];
  if (!meal) {
    return jsonError({ code: "NOT_FOUND", message: "Recipe not found", status: 404, requestId });
  }

  const ingredients = extractIngredients(meal);
  let totals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

  for (const item of ingredients.slice(0, 12)) {
    const top = await usdaSearchTop(item.ingredient);
    const m = pickMacros(top);
    totals.calories += m.calories;
    totals.proteinG += m.proteinG;
    totals.carbsG += m.carbsG;
    totals.fatG += m.fatG;
  }

  const data = {
    id,
    label: meal.strMeal,
    servingsDefault: servings,
    totals: {
      calories: Math.round(totals.calories),
      proteinG: Math.round(totals.proteinG),
      carbsG: Math.round(totals.carbsG),
      fatG: Math.round(totals.fatG),
    },
    perServing: {
      calories: Math.round(totals.calories / servings),
      proteinG: Math.round(totals.proteinG / servings),
      carbsG: Math.round(totals.carbsG / servings),
      fatG: Math.round(totals.fatG / servings),
    },
    ingredients,
  };

  return jsonSuccess(data, { requestId });
}
