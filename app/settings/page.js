"use client";

import "./settings.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";
import { auth } from "../firebase/config";
import { getUserProfile, mergeUserProfile } from "../services/userService";
import {
  applyTheme,
  DEFAULT_THEME,
  getStoredTheme,
  setStoredTheme,
  THEME_OPTIONS,
} from "../lib/theme";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(getStoredTheme() || DEFAULT_THEME);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const darkModeEnabled = theme === "dark";
  const systemThemeEnabled = theme === "system";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }

      setUser(u);

      try {
        const profile = await getUserProfile(u.uid);
        const remoteTheme = profile?.theme || null;
        if (remoteTheme && THEME_OPTIONS.some((opt) => opt.value === remoteTheme)) {
          setTheme(remoteTheme);
          setStoredTheme(remoteTheme);
          applyTheme(remoteTheme);
        }

        const updated = profile?.themeUpdatedAt;
        if (updated?.toDate) setSavedAt(updated.toDate());
      } catch {
        // keep local fallback
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  async function onChangeTheme(next) {
    setTheme(next);
    setStoredTheme(next);
    applyTheme(next);

    if (!user?.uid) return;
    setSaving(true);
    try {
      await mergeUserProfile(user.uid, {
        theme: next,
        themeUpdatedAt: serverTimestamp(),
      });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-shell">
        <header className="settings-top">
          <Link href="/dashboard" className="settings-back">
            ← Dashboard
          </Link>
        </header>

        <section className="settings-card">
          <h1>Appearance</h1>
          <p>Choose how Synera looks across the app.</p>

          <div className="settings-toggleRow">
            <div>
              <div className="settings-toggleTitle">Dark mode</div>
              <div className="settings-toggleSub">
                Force dark mode regardless of system preference.
              </div>
            </div>
            <button
              type="button"
              className={`settings-switch ${darkModeEnabled ? "on" : ""}`}
              onClick={() => onChangeTheme(darkModeEnabled ? "light" : "dark")}
              aria-pressed={darkModeEnabled}
              aria-label="Toggle dark mode"
            >
              <span className="settings-switch-knob" />
            </button>
          </div>

          <div className="settings-toggleRow">
            <div>
              <div className="settings-toggleTitle">Use system theme</div>
              <div className="settings-toggleSub">
                Match your device light/dark setting automatically.
              </div>
            </div>
            <button
              type="button"
              className={`settings-switch ${systemThemeEnabled ? "on" : ""}`}
              onClick={() => onChangeTheme(systemThemeEnabled ? "light" : "system")}
              aria-pressed={systemThemeEnabled}
              aria-label="Toggle system theme"
            >
              <span className="settings-switch-knob" />
            </button>
          </div>

          <label className="settings-field">
            Theme preset
            <select
              value={theme}
              onChange={(e) => onChangeTheme(e.target.value)}
            >
              {THEME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="settings-note">
            {saving
              ? "Saving theme…"
              : savedAt
                ? `Saved ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                : `Theme: ${theme}. Saved to this device and your account.`}
          </div>
        </section>
      </div>
    </div>
  );
}
