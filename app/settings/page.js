"use client";

import "./settings.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";
import { auth } from "../firebase/config";
import { getUserProfile, mergeUserProfile } from "../services/userService";
import {
  applyTheme,
  DEFAULT_THEME,
  getStoredTheme,
  setStoredTheme,
  THEME_OPTIONS,
  isValidTheme,
} from "../lib/theme";
import PageState from "../components/ui/PageState";
import BackButton from "../components/BackButton";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(getStoredTheme() || DEFAULT_THEME);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      try {
        const profile = await getUserProfile(u.uid);
        const remoteTheme = profile?.theme;
        if (isValidTheme(remoteTheme)) {
          setTheme(remoteTheme);
          setStoredTheme(remoteTheme);
          applyTheme(remoteTheme);
        }
      } catch {
        // fallback to local theme
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

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
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <div className="settings-page"><PageState type="loading" message="Redirecting to login…" /></div>;

  return (
    <div className="settings-page">
      <div className="settings-shell">
        <header className="settings-top">
          <BackButton href="/dashboard" label="Dashboard" className="settings-back" />
          <button type="button" className="settings-logout" onClick={handleLogout}>
            Log out
          </button>
        </header>

        <section className="settings-card">
          <h1>Appearance</h1>
          <p>Choose your theme for all Synera pages and hubs.</p>

          <label className="settings-field">
            Theme
            <select value={theme} onChange={(e) => onChangeTheme(e.target.value)}>
              {THEME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="settings-note">
            {saving ? "Saving theme…" : `Active theme: ${theme}`}
          </div>
        </section>
      </div>
    </div>
  );
}
