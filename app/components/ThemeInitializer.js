"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { getUserProfile } from "../services/userService";
import {
  applyTheme,
  DEFAULT_THEME,
  getStoredTheme,
  isValidTheme,
  setStoredTheme,
} from "../lib/theme";

export default function ThemeInitializer() {
  useEffect(() => {
    const localTheme = getStoredTheme() || DEFAULT_THEME;
    applyTheme(localTheme);

    const media = typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

    const mqListener = () => {
      const stored = getStoredTheme();
      if (stored === "system") applyTheme("system");
    };

    media?.addEventListener?.("change", mqListener);

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u?.uid) return;
      try {
        const profile = await getUserProfile(u.uid);
        const remoteTheme = profile?.theme || null;
        if (isValidTheme(remoteTheme)) {
          applyTheme(remoteTheme);
          setStoredTheme(remoteTheme);
        }
      } catch {
        // keep local fallback
      }
    });

    return () => {
      media?.removeEventListener?.("change", mqListener);
      unsub();
    };
  }, []);

  return null;
}
