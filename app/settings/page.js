"use client";

import "./settings.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
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
      await setDoc(
        doc(db, "users", user.uid),
        { theme: next },
        { merge: true },
      );
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

          <label className="settings-field">
            Theme
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
              : "Theme saved to this device and your account."}
          </div>
        </section>
      </div>
    </div>
  );
}
