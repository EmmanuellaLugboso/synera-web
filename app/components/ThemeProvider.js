"use client";

import { useEffect } from "react";
import { DEFAULT_THEME, applyTheme, getStoredTheme } from "../lib/theme";

export default function ThemeProvider({ children }) {
  useEffect(() => {
    applyTheme(getStoredTheme() || DEFAULT_THEME);
  }, []);

  return children;
}
