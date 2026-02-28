function safeObject(x) {
  return x && typeof x === "object" && !Array.isArray(x) ? x : null;
}

function parseLitres(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  const num = Number(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(num)) return null;
  return Math.max(0, num);
}

export function normalizeOnboardingData(input) {
  const obj = safeObject(input);
  if (!obj) return {};

  const next = { ...obj };

  const macroGoals = safeObject(next.macroGoals) || {};
  const legacyProtein = Number(next.proteinGoalG);
  if (!Number.isFinite(Number(macroGoals.proteinG)) && Number.isFinite(legacyProtein) && legacyProtein > 0) {
    next.macroGoals = { ...macroGoals, proteinG: legacyProtein };
  }

  const goalLitres = parseLitres(next.waterGoalLitres);
  const legacyGoal = parseLitres(next.waterGoal);
  if (goalLitres == null && legacyGoal != null) next.waterGoalLitres = legacyGoal;

  const litres = parseLitres(next.waterLitres);
  const intakeLitres = parseLitres(next.waterIntake);
  if (litres == null && intakeLitres != null) next.waterLitres = intakeLitres;

  return next;
}

export function mergeOnboardingData(base, incoming) {
  const baseObj = safeObject(base) || {};
  const incomingObj = safeObject(incoming);
  if (!incomingObj) return baseObj;

  const merged = { ...baseObj, ...incomingObj };

  if (safeObject(baseObj.macroGoals) || safeObject(incomingObj.macroGoals)) {
    merged.macroGoals = {
      ...(safeObject(baseObj.macroGoals) || {}),
      ...(safeObject(incomingObj.macroGoals) || {}),
    };
  }

  return merged;
}
