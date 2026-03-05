import {
  fetchWithTimeout,
  getRequestContext,
  jsonConfigMissing,
  jsonError,
  jsonSuccess,
  mapUpstreamError,
  safeJson,
} from "../../_utils";

export async function GET(req) {
  const { requestId } = getRequestContext();

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return jsonSuccess({ results: [] }, { requestId });
    }

    const key = process.env.USDA_API_KEY;
    if (!key) return jsonConfigMissing(requestId, "USDA_API_KEY");

    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}`;

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
      10000,
      1,
    );

    if (!res.ok) {
      const text = await res.text();
      const upstream = mapUpstreamError(res, text);
      return jsonError({ ...upstream, status: 502, requestId });
    }

    const json = await safeJson(res);
    const foods = Array.isArray(json?.foods) ? json.foods : [];

    const results = foods.map((f) => ({
      fdcId: f.fdcId,
      description: f.description || "Food",
      brandName: f.brandName || "",
      nutrients: Array.isArray(f.foodNutrients)
        ? f.foodNutrients.map((n) => ({
            nutrientName: n.nutrientName,
            value: n.value,
            unitName: n.unitName,
          }))
        : [],
    }));

    return jsonSuccess({ results }, { requestId });
  } catch {
    return jsonError({
      code: "INTERNAL_ERROR",
      message: "Server error in /api/food/search",
      status: 500,
      requestId,
    });
  }
}
