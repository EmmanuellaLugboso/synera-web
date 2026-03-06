import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { sanitizeForFirestore } from "./firestoreSanitize";

/**
 * We store profile at: users/{uid}
 */

export async function mergeUserProfile(uid, data) {
  if (!uid) throw new Error("Missing uid");
  const ref = doc(db, "users", uid);
  await setDoc(ref, sanitizeForFirestore(data), { merge: true });
  return true;
}

export async function getUserProfile(uid) {
  if (!uid) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function createUserProfile(uid, data) {
  if (!uid) throw new Error("Missing uid");
  await mergeUserProfile(uid, data);
  return true;
}

export async function updateUserProfile(uid, data) {
  if (!uid) throw new Error("Missing uid");
  const ref = doc(db, "users", uid);
  await updateDoc(ref, sanitizeForFirestore(data));
  return true;
}

function validateAvatarFile(file) {
  if (!file) throw new Error("No file selected");
  if (!String(file.type || "").startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("Image is too large. Please upload up to 5MB.");
  }
}

export async function uploadUserAvatar(uid, file) {
  if (!uid) throw new Error("Missing uid");
  validateAvatarFile(file);

  const subtype = String(file.type || "image/jpeg").split("/")[1] || "jpg";
  const ext = subtype.replace(/[^a-z0-9]/gi, "") || "jpg";
  const fileRef = ref(storage, `users/${uid}/avatars/avatar_${Date.now()}.${ext}`);

  await uploadBytes(fileRef, file, {
    contentType: file.type || "image/jpeg",
    cacheControl: "public,max-age=3600",
  });
  const photoURL = await getDownloadURL(fileRef);

  await mergeUserProfile(uid, {
    photoURL,
    updatedAt: serverTimestamp(),
  });

  return { photoURL, path: fileRef.fullPath };
}

/**
 * Ensures a profile exists for the currently logged-in Firebase Auth user.
 * Uses auth values as defaults if doc doesn't exist.
 */
export async function ensureUserProfile(authUser) {
  if (!authUser?.uid) return null;

  const uid = authUser.uid;
  const existing = await getUserProfile(uid);
  if (existing) return existing;

  const base = {
    uid,
    name: authUser.displayName || "Friend",
    email: authUser.email || "",
    height: "",
    weight: "",
    focus: "",
    photoURL: authUser.photoURL || "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await createUserProfile(uid, base);
  return base;
}

export { sanitizeForFirestore };
