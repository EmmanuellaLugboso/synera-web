export const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "blue", label: "Blue / White" },
  { value: "pink", label: "Pink" },
];

export const DEFAULT_THEME = "light";

export function isValidTheme(theme) {
  return THEME_OPTIONS.some((t) => t.value === theme);
}

export function applyTheme(theme) {
  const next = isValidTheme(theme) ? theme : DEFAULT_THEME;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = next;
  }
  return next;
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
