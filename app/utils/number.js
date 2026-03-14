import { clampNumber } from "./helpers.js";

export { clampNumber };

export function pct(val, goal) {
  const v = clampNumber(val);
  const g = clampNumber(goal);
  if (!g) return 0;
  return Math.max(0, Math.min(100, Math.round((v / g) * 100)));
}
