import { SUPPLEMENTS } from "@/app/data/supplements";
import { getRequestContext, jsonError, jsonSuccess } from "../_utils";

export async function GET(req) {
  const { requestId } = getRequestContext();

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

    results = results.slice().sort((a, b) => a.name.localeCompare(b.name));

    return jsonSuccess({ results }, { requestId });
  } catch {
    return jsonError({
      code: "INTERNAL_ERROR",
      message: "Server error in /api/supplements",
      status: 500,
      requestId,
    });
  }
}
