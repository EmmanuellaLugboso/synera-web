// app/api/supplements/route.js
import { NextResponse } from "next/server";
import { SUPPLEMENTS } from "@/app/data/supplements";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    let results = SUPPLEMENTS;

    if (q) {
      results = results.filter((s) => {
        const hay = `${s.name} ${s.category} ${s.slug}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // Sort A–Z by name
    results = results.slice().sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ results }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Server error in /api/supplements" },
      { status: 500 }
    );
  }
}
