export function clampNumber(value) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

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
