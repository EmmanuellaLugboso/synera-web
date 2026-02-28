"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
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

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u?.uid) return;
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const remoteTheme = snap.exists() ? snap.data()?.theme : null;
        if (isValidTheme(remoteTheme)) {
          applyTheme(remoteTheme);
          setStoredTheme(remoteTheme);
        }
      } catch {
        // keep local fallback
      }
    });

    return () => unsub();
  }, []);

  return null;
}
