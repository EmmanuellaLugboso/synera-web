import { db } from "../firebase/config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

/**
 * We store profile at: users/{uid}
 */


function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

export function sanitizeForFirestore(value) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, val]) => [key, sanitizeForFirestore(val)])
        .filter(([, val]) => val !== undefined)
    );
  }
  return value;
}

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
  await updateDoc(ref, data);
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