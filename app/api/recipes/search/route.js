// app/api/recipes/search/route.js
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) return NextResponse.json({ results: [] });

    const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    const meals = Array.isArray(data?.meals) ? data.meals : [];

    // ✅ Normalize to { id, title, image }
    const results = meals.map((m) => ({
      id: String(m.idMeal),                 // ✅ always exists
      title: m.strMeal || "Recipe",
      image: m.strMealThumb || null,
      category: m.strCategory || null,
      area: m.strArea || null,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Server error in recipe search route" },
      { status: 500 }
    );
  }
}
