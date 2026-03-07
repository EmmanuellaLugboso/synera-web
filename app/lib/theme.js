export const THEME_OPTIONS = [
  { value: "pink", label: "Pink" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "blue", label: "Blue" },
];

export const DEFAULT_THEME = "pink";

export function isValidTheme(theme) {
  return THEME_OPTIONS.some((t) => t.value === theme);
}

export function applyTheme(theme) {
  const chosen = isValidTheme(theme) ? theme : DEFAULT_THEME;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = chosen;
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
