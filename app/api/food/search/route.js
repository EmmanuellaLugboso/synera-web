import {
  fetchWithTimeout,
  getRequestContext,
  jsonError,
  jsonSuccess,
  mapUpstreamError,
  safeJson,
} from "../../_utils";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function nutrientValue(nutrients, names = []) {
  const lower = names.map((x) => String(x).toLowerCase());
  const item = nutrients.find((n) => lower.includes(String(n.nutrientName || "").toLowerCase()));
  return toNumber(item?.value);
}

function normalizeUSDAFood(food) {
  const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];
  const label = food?.labelNutrients || {};

  const calories = nutrientValue(nutrients, ["energy", "energy (kcal)"]) || toNumber(label?.calories?.value);
  const protein = nutrientValue(nutrients, ["protein"]) || toNumber(label?.protein?.value);
  const carbs = nutrientValue(nutrients, ["carbohydrate, by difference", "carbohydrate"]) || toNumber(label?.carbohydrates?.value);
  const fat = nutrientValue(nutrients, ["total lipid (fat)", "fat"]) || toNumber(label?.fat?.value);

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
    calories: toNumber(n["energy-kcal_100g"] || n["energy-kcal"]),
    protein: toNumber(n.proteins_100g || n.proteins),
    carbs: toNumber(n.carbohydrates_100g || n.carbohydrates),
    fat: toNumber(n.fat_100g || n.fat),
  };
}

async function searchUSDA(q, apiKey) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`;

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: q,
        pageSize: 12,
        dataType: ["Foundation", "SR Legacy", "Branded"],
      }),
      cache: "no-store",
    },
    12000,
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
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=12`;
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

    const key =
      process.env.USDA_API_KEY ||
      process.env.USDA_FOODDATA_API_KEY ||
      process.env.FOODDATA_CENTRAL_API_KEY;

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
