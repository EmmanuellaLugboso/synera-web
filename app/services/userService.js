import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
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
