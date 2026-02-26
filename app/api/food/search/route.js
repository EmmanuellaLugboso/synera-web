import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const key = process.env.USDA_API_KEY;

    if (!key) {
      return NextResponse.json(
        { error: "Missing USDA_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: q,
        pageSize: 12,
        dataType: ["Foundation", "SR Legacy", "Branded"],
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `USDA request failed: ${text}` },
        { status: res.status }
      );
    }

    const json = await res.json();

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

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Server error in /api/food/search" },
      { status: 500 }
    );
  }
}
