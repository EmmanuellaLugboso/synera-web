"use client";

import "./settings.css";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";
import { auth } from "../firebase/config";
import { getUserProfile, mergeUserProfile, sanitizeForFirestore } from "../services/userService";
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
import { useOnboarding } from "../context/OnboardingContext";

export default function SettingsPage() {
  const router = useRouter();
  const { data, ready: onboardingReady } = useOnboarding();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [theme, setTheme] = useState(getStoredTheme() || DEFAULT_THEME);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      try {
        const remote = await getUserProfile(u.uid);
        setProfile(remote || null);
        const remoteTheme = remote?.theme;
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

  async function onChangeTheme(next) {
    setTheme(next);
    setStoredTheme(next);
    applyTheme(next);
    if (!user?.uid) return;

    setSaving(true);
    setStatus("");
    try {
      await mergeUserProfile(user.uid, {
        theme: next,
        themeUpdatedAt: serverTimestamp(),
      });
      setStatus("Theme saved.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (!user?.uid) return;
    setSaving(true);
    setStatus("");
    try {
      // flush onboarding snapshot only once remote onboarding data has loaded
      if (onboardingReady) {
        await mergeUserProfile(user.uid, {
          updatedAt: serverTimestamp(),
          data: sanitizeForFirestore(data || {}),
        });
      }
      await signOut(auth);
      router.push("/login");
    } catch {
      setStatus("Could not log out cleanly. Please retry.");
      setSaving(false);
    }
  }

  const account = useMemo(() => {
    return {
      name: profile?.name || data?.name || user?.displayName || "Friend",
      email: profile?.email || user?.email || "",
      height: profile?.height || data?.height || "—",
      weight: profile?.weight || data?.weight || "—",
      focus: Array.isArray(profile?.focus)
        ? profile.focus.join(", ")
        : Array.isArray(data?.focus)
          ? data.focus.join(", ")
          : profile?.focus || "—",
      goals: Array.isArray(profile?.goals)
        ? profile.goals.join(", ")
        : Array.isArray(data?.goals)
          ? data.goals.join(", ")
          : "—",
    };
  }, [profile, data, user]);

  if (!user) {
    return <div className="settings-page"><PageState type="loading" message="Redirecting to login…" /></div>;
  }

  return (
    <div className="settings-page">
      <div className="settings-shell">
        <header className="settings-top">
          <BackButton href="/dashboard" label="Dashboard" className="settings-back" />
        </header>

        <section className="settings-card">
          <h1 className="page-title">Settings</h1>
          <p className="body-text">Manage your account, themes, and app information.</p>

          <div className="settings-grid">
            <div className="settings-block">
              <h2 className="section-title">Account</h2>
              <div className="settings-kv"><span>Name</span><strong>{account.name}</strong></div>
              <div className="settings-kv"><span>Email</span><strong>{account.email || "—"}</strong></div>
              <div className="settings-kv"><span>Height</span><strong>{account.height}</strong></div>
              <div className="settings-kv"><span>Weight</span><strong>{account.weight}</strong></div>
              <div className="settings-kv"><span>Focus</span><strong>{account.focus || "—"}</strong></div>
              <div className="settings-kv"><span>Goals</span><strong>{account.goals || "—"}</strong></div>
            </div>

            <div className="settings-block">
              <h2 className="section-title">Appearance</h2>
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
                {saving ? "Saving changes…" : status || `Active theme: ${theme}`}
              </div>

              <div className="settings-links">
                <Link href="/about" className="settings-linkBtn">About Synera</Link>
                <Link href="/info" className="settings-linkBtn">Information & Help</Link>
              </div>

              <button type="button" className="settings-logout" onClick={handleLogout} disabled={saving}>
                {saving ? "Saving & logging out…" : "Log out"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
