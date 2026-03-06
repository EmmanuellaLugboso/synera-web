import {
  fetchWithTimeout,
  getRequestContext,
  jsonError,
  jsonSuccess,
  mapUpstreamError,
  safeJson,
} from "../../_utils";

function normalizeUSDAFood(food) {
  const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];
  const get = (names) => {
    const hit = nutrients.find((n) => names.includes(String(n.nutrientName || "").toLowerCase()));
    return Number(hit?.value || 0);
  };

  const calories = get(["energy", "energy (kcal)"]);
  const protein = get(["protein"]);
  const carbs = get(["carbohydrate, by difference", "carbohydrate"]);
  const fat = get(["total lipid (fat)", "fat"]);

  return {
    id: String(food?.fdcId || food?.description || Math.random()),
    source: "usda",
    description: food?.description || "Food",
    brandName: food?.brandName || "",
    calories,
    protein,
    carbs,
    fat,
  };
}

function normalizeOFFFood(product) {
  const n = product?.nutriments || {};
  return {
    id: String(product?.id || product?.code || Math.random()),
    source: "openfoodfacts",
    description: product?.product_name || product?.generic_name || "Food",
    brandName: product?.brands || "",
    calories: Number(n["energy-kcal_100g"] || n["energy-kcal"] || 0),
    protein: Number(n.proteins_100g || n.proteins || 0),
    carbs: Number(n.carbohydrates_100g || n.carbohydrates || 0),
    fat: Number(n.fat_100g || n.fat || 0),
  };
}

async function searchUSDA(q, key) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}`;

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: q,
        pageSize: 10,
        dataType: ["Foundation", "SR Legacy", "Branded"],
      }),
      cache: "no-store",
    },
    10000,
    1,
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(mapUpstreamError(res, text)?.message || "USDA search failed");
  }

  const json = await safeJson(res);
  const foods = Array.isArray(json?.foods) ? json.foods : [];
  return foods.map(normalizeUSDAFood).filter((x) => x.description);
}

async function searchOpenFoodFacts(q) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10`;
  const res = await fetchWithTimeout(url, { cache: "no-store" }, 10000, 1);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(mapUpstreamError(res, text)?.message || "OpenFoodFacts search failed");
  }

  const json = await safeJson(res);
  const products = Array.isArray(json?.products) ? json.products : [];
  return products.map(normalizeOFFFood).filter((x) => x.description);
}

export async function GET(req) {
  const { requestId } = getRequestContext();

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) return jsonSuccess({ results: [] }, { requestId });

    const key = process.env.USDA_API_KEY;
    let results = [];
    let source = "openfoodfacts";

    if (key) {
      try {
        results = await searchUSDA(q, key);
        source = "usda";
      } catch {
        results = [];
      }
    }

    if (!results.length) {
      results = await searchOpenFoodFacts(q);
      source = "openfoodfacts";
    }

    return jsonSuccess({ results, source }, { requestId });
  } catch {
    return jsonError({
      code: "INTERNAL_ERROR",
      message: "Server error in /api/food/search",
      status: 500,
      requestId,
    });
  }
}
