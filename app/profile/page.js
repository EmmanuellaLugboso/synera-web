"use client";

import "./profile.css";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../context/OnboardingContext";
import { auth, db, storage } from "../firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const FOCUS_OPTIONS = [
  "Strength",
  "Fat loss",
  "Endurance",
  "Sleep",
  "Mood",
  "Consistency",
];
const GOAL_OPTIONS = [
  "Build muscle",
  "Lose fat",
  "Improve energy",
  "Better habits",
  "Run farther",
];

export default function ProfilePage() {
  const router = useRouter();
  const { data, updateMany, ready } = useOnboarding();

  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    height: "",
    weight: "",
    focus: [],
    goals: [],
    photoURL: "",
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setAuthUser(u);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    async function loadProfile() {
      if (!ready || !authUser?.uid) return;
      try {
        const refDoc = doc(db, "users", authUser.uid);
        const snap = await getDoc(refDoc);
        const remote = snap.exists() ? snap.data() : {};
        setForm({
          name: remote?.name || data?.name || authUser.displayName || "",
          height: String(remote?.height || data?.height || ""),
          weight: String(remote?.weight || data?.weight || ""),
          focus: Array.isArray(remote?.focus)
            ? remote.focus
            : Array.isArray(data?.focus)
              ? data.focus
              : [],
          goals: Array.isArray(remote?.goals)
            ? remote.goals
            : Array.isArray(data?.goals)
              ? data.goals
              : [],
          photoURL:
            remote?.photoURL || data?.photoURL || authUser.photoURL || "",
        });
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [ready, authUser?.uid, authUser?.displayName, authUser?.photoURL, data]);

  const initials = useMemo(
    () => (form.name || "U").trim().charAt(0).toUpperCase(),
    [form.name],
  );

  function toggleArrayItem(key, value) {
    setForm((prev) => {
      const curr = Array.isArray(prev[key]) ? prev[key] : [];
      const next = curr.includes(value)
        ? curr.filter((x) => x !== value)
        : [...curr, value];
      return { ...prev, [key]: next };
    });
  }

  async function saveProfile() {
    if (!authUser?.uid) return;
    setSaving(true);
    setSavedMsg("");
    setErrorMsg("");

    try {
      const payload = {
        name: form.name.trim() || "Friend",
        height: form.height,
        weight: form.weight,
        focus: Array.isArray(form.focus) ? form.focus : [],
        goals: Array.isArray(form.goals) ? form.goals : [],
        photoURL: form.photoURL || "",
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", authUser.uid), payload, { merge: true });

      updateMany({
        name: payload.name,
        height: payload.height,
        weight: payload.weight,
        focus: payload.focus,
        goals: payload.goals,
        photoURL: payload.photoURL,
      });

      setSavedMsg("Profile saved.");
    } catch (e) {
      setErrorMsg(e?.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file || !authUser?.uid) return;

    setUploading(true);
    setSavedMsg("");
    setErrorMsg("");

    try {
      const fileRef = ref(storage, `users/${authUser.uid}/avatar.jpg`);
      await uploadBytes(fileRef, file, {
        contentType: file.type || "image/jpeg",
      });
      const url = await getDownloadURL(fileRef);

      setForm((prev) => ({ ...prev, photoURL: url }));
      await setDoc(
        doc(db, "users", authUser.uid),
        { photoURL: url, updatedAt: serverTimestamp() },
        { merge: true },
      );
      updateMany({ photoURL: url });
      setSavedMsg("Profile picture updated.");
    } catch (e2) {
      setErrorMsg(e2?.message || "Image upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  if (loading) return <div className="profile-page">Loading profile…</div>;

  return (
    <div className="profile-page">
      <div className="profile-shell">
        <header className="profile-top">
          <Link href="/dashboard" className="profile-back">
            ← Dashboard
          </Link>
        </header>

        <section className="profile-card">
          <div className="profile-head">
            <h1>Profile</h1>
            <p>Keep your identity and goals aligned across Synera.</p>
          </div>

          <div className="profile-photoRow">
            <div className="profile-photoCircle">
              {form.photoURL ? (
                <Image src={form.photoURL} alt="Profile" width={112} height={112} unoptimized />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <button
                className="profile-btn"
                type="button"
                onClick={openPicker}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : form.photoURL ? "Change" : "Upload"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="profile-file"
                onChange={uploadAvatar}
              />
            </div>
          </div>

          <div className="profile-grid">
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </label>
            <label>
              Height
              <input
                value={form.height}
                onChange={(e) =>
                  setForm((p) => ({ ...p, height: e.target.value }))
                }
              />
            </label>
            <label>
              Weight
              <input
                value={form.weight}
                onChange={(e) =>
                  setForm((p) => ({ ...p, weight: e.target.value }))
                }
              />
            </label>
          </div>

          <div className="chip-block">
            <div className="chip-title">Focus</div>
            <div className="chip-wrap">
              {FOCUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`chip ${form.focus.includes(option) ? "active" : ""}`}
                  onClick={() => toggleArrayItem("focus", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="chip-block">
            <div className="chip-title">Goals</div>
            <div className="chip-wrap">
              {GOAL_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`chip ${form.goals.includes(option) ? "active" : ""}`}
                  onClick={() => toggleArrayItem("goals", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="profile-actions">
            <button
              className="profile-btn primary"
              type="button"
              onClick={saveProfile}
              disabled={saving || !ready}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {savedMsg ? <span className="msg ok">{savedMsg}</span> : null}
            {errorMsg ? <span className="msg err">{errorMsg}</span> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
