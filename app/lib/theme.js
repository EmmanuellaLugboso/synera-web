export const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "blue", label: "Blue / White" },
  { value: "pink", label: "Pink" },
];

export const DEFAULT_THEME = "light";

export function isValidTheme(theme) {
  return THEME_OPTIONS.some((t) => t.value === theme);
}

function resolveSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
    ? "dark"
    : "light";
}

export function applyTheme(theme) {
  const chosen = isValidTheme(theme) ? theme : DEFAULT_THEME;
  const next = chosen === "system" ? resolveSystemTheme() : chosen;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = next;
  }
  return chosen;
}

export function getStoredTheme() {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem("synera_theme");
  return isValidTheme(v) ? v : null;
}

export function setStoredTheme(theme) {
  const next = isValidTheme(theme) ? theme : DEFAULT_THEME;
  if (typeof window !== "undefined") {
    localStorage.setItem("synera_theme", next);
  }
  return next;
}
