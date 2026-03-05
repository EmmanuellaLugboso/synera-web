import {
  fetchWithTimeout,
  getRequestContext,
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

    if (!q) return jsonSuccess({ results: [] }, { requestId });

    const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`;
    const res = await fetchWithTimeout(url, { cache: "no-store" }, 9000, 1);

    if (!res.ok) {
      const body = await res.text();
      const upstream = mapUpstreamError(res, body);
      return jsonError({ ...upstream, status: 502, requestId });
    }

    const data = await safeJson(res);
    const meals = Array.isArray(data?.meals) ? data.meals : [];

    const results = meals.map((m) => ({
      id: String(m.idMeal),
      title: m.strMeal || "Recipe",
      image: m.strMealThumb || null,
      category: m.strCategory || null,
      area: m.strArea || null,
    }));

    return jsonSuccess({ results }, { requestId });
  } catch {
    return jsonError({
      code: "INTERNAL_ERROR",
      message: "Server error in recipe search route",
      status: 500,
      requestId,
    });
  }
}
