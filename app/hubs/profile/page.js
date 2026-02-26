"use client";

import "./profile.css";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { auth, storage } from "../../firebase/config";
import {
  getUserProfile,
  ensureUserProfile,
  updateUserProfile,
} from "../../services/userService";

export default function ProfileHub() {
  const [loading, setLoading] = useState(true);
  const [userAuth, setUserAuth] = useState(null);

  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUserAuth(u);

      if (!u) {
        setProfile(null);
        setDraft(null);
        setLoading(false);
        return;
      }

      // Create doc if missing, then load
      const ensured = await ensureUserProfile(u);
      setProfile(ensured);
      setDraft(ensured);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  function toggleEdit() {
    setEditMode((v) => !v);
    // when opening edit, start from latest
    setDraft(profile);
  }

  function cancelEdit() {
    setDraft(profile);
    setEditMode(false);
  }

  async function saveChanges() {
    if (!userAuth || !draft) return;

    setSaving(true);
    try {
      // Clean payload (Firestore likes consistent types)
      const payload = {
        name: (draft.name || "Friend").trim(),
        email: draft.email || userAuth.email || "",
        height: (draft.height || "").trim(), // store as string
        weight: (draft.weight || "").trim(),
        focus: (draft.focus || "").trim(),
        photoURL: draft.photoURL || "",
        updatedAt: Date.now(),
      };

      await updateUserProfile(userAuth.uid, payload);

      const fresh = await getUserProfile(userAuth.uid);
      setProfile(fresh);
      setDraft(fresh);
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file || !userAuth) return;

    setUploading(true);
    try {
      // store in: avatars/{uid}.jpg (or original extension)
      const ext = file.name.split(".").pop() || "jpg";
      const fileRef = ref(storage, `avatars/${userAuth.uid}.${ext}`);

      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      // update UI immediately
      const nextDraft = { ...(draft || profile), photoURL: url };
      setDraft(nextDraft);
      setProfile((p) => ({ ...(p || {}), photoURL: url }));

      // persist
      await updateUserProfile(userAuth.uid, { photoURL: url, updatedAt: Date.now() });
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="pro-page">Loading…</div>;
  if (!userAuth) return <div className="pro-page">You’re not logged in.</div>;
  if (!profile) return <div className="pro-page">No profile found.</div>;

  return (
    <div className="pro-page">
      <div className="pro-top">
        <div>
          <div className="pro-title">Profile</div>
          <div className="pro-sub">Your setup</div>
        </div>

        <button className="pro-edit" type="button" onClick={toggleEdit}>
          {editMode ? "Close" : "Edit"}
        </button>
      </div>

      <div className="pro-card">
        <div className="pro-row">
          <div className="pro-avatar">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="avatar" />
            ) : (
              <div className="pro-avatarFallback" />
            )}

            {editMode && (
              <input
                className="pro-file"
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                disabled={uploading}
                title="Upload photo"
              />
            )}
          </div>

          <div className="pro-identity">
            <div className="pro-name">{profile.name || "Friend"}</div>
            <div className="pro-email">{profile.email || userAuth.email || "--"}</div>
            {uploading ? (
              <div style={{ marginTop: 8, fontWeight: 800, opacity: 0.7 }}>
                Uploading photo…
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pro-grid">
        <div className="pro-stat">
          <div className="pro-label">Height</div>
          <div className="pro-value">{profile.height || "—"}</div>
        </div>

        <div className="pro-stat">
          <div className="pro-label">Weight</div>
          <div className="pro-value">{profile.weight || "—"}</div>
        </div>

        <div className="pro-stat">
          <div className="pro-label">Focus</div>
          <div className="pro-value">{profile.focus || "—"}</div>
        </div>
      </div>

      {editMode && draft && (
        <div className="pro-editPanel">
          <div className="pro-editTitle">Edit your setup</div>

          <div className="pro-form">
            <div className="pro-formRow">
              <label>Name</label>
              <input
                value={draft.name || ""}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Emma"
              />
            </div>

            <div className="pro-formRow">
              <label>Height (cm)</label>
              <input
                value={draft.height || ""}
                onChange={(e) => setDraft({ ...draft, height: e.target.value })}
                placeholder="e.g. 165"
              />
            </div>

            <div className="pro-formRow">
              <label>Weight (kg)</label>
              <input
                value={draft.weight || ""}
                onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
                placeholder="e.g. 67"
              />
            </div>

            <div className="pro-formRow">
              <label>Focus</label>
              <input
                value={draft.focus || ""}
                onChange={(e) => setDraft({ ...draft, focus: e.target.value })}
                placeholder="e.g. glutes, consistency, fat loss"
              />
            </div>

            <div className="pro-actions">
              <button
                className="pro-btn primary"
                type="button"
                onClick={saveChanges}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>

              <button className="pro-btn" type="button" onClick={cancelEdit} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}