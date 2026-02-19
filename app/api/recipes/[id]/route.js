// app/api/recipes/[id]/route.js
import { NextResponse } from "next/server";

export async function GET(req, ctx) {
  try {
    // ✅ 1) Try Next's params (normal case)
    let id = String(ctx?.params?.id || "").trim();

    // ✅ 2) Fallback: parse from the URL path (fixes "params undefined" cases)
    if (!id) {
      const pathname = req?.nextUrl?.pathname || new URL(req.url).pathname;
      // pathname looks like: /api/recipes/52777
      id = String(pathname.split("/").pop() || "").trim();
    }

    if (!id) {
      return NextResponse.json({ error: "Missing recipe id" }, { status: 400 });
    }

    const url = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(
      id
    )}`;

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    const meal = Array.isArray(data?.meals) ? data.meals[0] : null;
    if (!meal) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // ✅ Normalize
    const recipe = {
      id: String(meal.idMeal),
      title: meal.strMeal || "Recipe",
      image: meal.strMealThumb || null,
      category: meal.strCategory || null,
      area: meal.strArea || null,
      instructions: meal.strInstructions || "",
      ...meal, // keep raw fields for ingredient extraction
    };

    return NextResponse.json({ recipe });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Server error in recipe detail route" },
      { status: 500 }
    );
  }
}
