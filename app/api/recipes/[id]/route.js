import {
  fetchWithTimeout,
  getRequestContext,
  jsonError,
  jsonSuccess,
  mapUpstreamError,
  safeJson,
} from "../../_utils";

export async function GET(req, ctx) {
  const { requestId } = getRequestContext();

  try {
    let id = "";
    try {
      const params = (await ctx?.params) || {};
      id = String(params?.id || "").trim();
    } catch {
      // no-op
    }

    if (!id) {
      const pathname = req?.nextUrl?.pathname || new URL(req.url).pathname;
      id = String(pathname.split("/").pop() || "").trim();
    }

    if (!id) {
      return jsonError({
        code: "BAD_REQUEST",
        message: "Missing recipe id",
        status: 400,
        requestId,
      });
    }

    const url = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`;
    const res = await fetchWithTimeout(url, { cache: "no-store" }, 9000, 1);

    if (!res.ok) {
      const body = await res.text();
      const upstream = mapUpstreamError(res, body);
      return jsonError({ ...upstream, status: 502, requestId });
    }

    const data = await safeJson(res);
    const meal = Array.isArray(data?.meals) ? data.meals[0] : null;
    if (!meal) {
      return jsonError({
        code: "NOT_FOUND",
        message: "Recipe not found",
        status: 404,
        requestId,
      });
    }

    const recipe = {
      id: String(meal.idMeal),
      title: meal.strMeal || "Recipe",
      image: meal.strMealThumb || null,
      category: meal.strCategory || null,
      area: meal.strArea || null,
      instructions: meal.strInstructions || "",
      ...meal,
    };

    return jsonSuccess({ recipe }, { requestId });
  } catch {
    return jsonError({
      code: "INTERNAL_ERROR",
      message: "Server error in recipe detail route",
      status: 500,
      requestId,
    });
  }
}
