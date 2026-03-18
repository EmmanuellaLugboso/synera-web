import { clampNumber } from "./helpers.js";

export { clampNumber };

export function pct(val, goal) {
  const v = clampNumber(val);
  const g = clampNumber(goal);
  if (!g) return 0;
  return Math.max(0, Math.min(100, Math.round((v / g) * 100)));
}

export const clamp = clampNumber;
export const progress = pct;


export function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}
