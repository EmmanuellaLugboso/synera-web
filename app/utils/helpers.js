export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clampNumber(value) {
  const number = Number(value);
  if (Number.isNaN(number) || number < 0) return 0;
  return number;
}

export function progressPercent(current, goal) {
  if (!goal) return 0;
  return Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
}

export function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
