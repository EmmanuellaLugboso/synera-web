"use client";

import "./profile.css";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { updateProfile } from "firebase/auth";

import { auth } from "../../firebase/config";
import PageState from "../../components/ui/PageState";
import HubShell from "../../components/hub/HubShell";
import {
  getUserProfile,
  ensureUserProfile,
  updateUserProfile,
  uploadUserAvatar,
} from "../../services/userService";

export default function ProfileHub() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userAuth, setUserAuth] = useState(null);

  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUserAuth(u);

      if (!u) {
        setProfile(null);
        setDraft(null);
        setLoading(false);
        router.push("/login");
        return;
      }

      try {
        // Create doc if missing, then load
        const ensured = await ensureUserProfile(u);
        setProfile(ensured);
        setDraft(ensured);
      } catch {
        setProfile(null);
        setDraft(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

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

  function openPhotoPicker() {
    setUploadError("");
    setUploadSuccess("");
    fileInputRef.current?.click();
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file || !userAuth) return;

    setUploadError("");
    setUploadSuccess("");
    setUploading(true);
    try {
      const { photoURL } = await uploadUserAvatar(userAuth.uid, file);

      const nextDraft = { ...(draft || profile), photoURL };
      setDraft(nextDraft);
      setProfile((p) => ({ ...(p || {}), photoURL }));
      await updateProfile(userAuth, { photoURL });

      await updateUserProfile(userAuth.uid, { photoURL, updatedAt: Date.now() });
      setUploadSuccess("Profile photo updated.");
    } catch (err) {
      setUploadError(err?.message || "Failed to upload photo. Try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  if (loading) {
    return (
      <HubShell title="Profile Hub" subtitle="Account details and setup" emoji="🙋🏽">
        <PageState type="loading" message="Loading your profile…" />
      </HubShell>
    );
  }

  if (!userAuth) {
    return (
      <HubShell title="Profile Hub" subtitle="Account details and setup" emoji="🙋🏽">
        <PageState type="loading" message="Redirecting to login…" />
      </HubShell>
    );
  }

  if (!profile) {
    return (
      <HubShell title="Profile Hub" subtitle="Account details and setup" emoji="🙋🏽">
        <PageState type="empty" message="No profile found yet." />
      </HubShell>
    );
  }

  return (
    <HubShell
      className="pro-page"
      title="Profile Hub"
      subtitle="Account details and setup"
      emoji="🙋🏽"
      topActions={
        <button className="pro-edit" type="button" onClick={toggleEdit}>
          {editMode ? "Close" : "Edit"}
        </button>
      }
    >
      <div className="pro-card">
        <div className="pro-row">
          <div className="pro-avatar">
            {profile.photoURL ? (
              <Image src={profile.photoURL} alt="avatar" width={104} height={104} unoptimized />
            ) : (
              <div className="pro-avatarFallback" />
            )}

            <input
              ref={fileInputRef}
              className="pro-file"
              type="file"
              accept="image/*"
              onChange={uploadAvatar}
              disabled={uploading}
              title="Upload photo"
            />
          </div>

          <div className="pro-identity">
            <div className="pro-name">{profile.name || "Friend"}</div>
            <div className="pro-email">{profile.email || userAuth.email || "--"}</div>
            <button className="pro-photoBtn" type="button" onClick={openPhotoPicker} disabled={uploading}>
              {uploading ? "Uploading…" : "Upload photo"}
            </button>
            {uploadError ? <div className="pro-uploadMsg error">{uploadError}</div> : null}
            {!uploadError && uploadSuccess ? (
              <div className="pro-uploadMsg success">{uploadSuccess}</div>
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
          <div className="pro-value">{Array.isArray(profile.focus) ? (profile.focus.join(", ") || "—") : (profile.focus || "—")}</div>
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
    </HubShell>
  );
}
