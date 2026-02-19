"use client";

import { auth, db } from "../firebase/config";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function saveOnboardingData(data) {
  try {
    const user = auth.currentUser;

    if (!user) {
      console.error("❌ No authenticated user found.");
      return;
    }

    const userRef = doc(db, "users", user.uid);

    // Firestore doesn't allow undefined values
    const clean = JSON.parse(JSON.stringify(data || {}));

    await setDoc(
      userRef,
      {
        email: user.email || "",
        onboardingComplete: true,
        updatedAt: serverTimestamp(),

        // ✅ single source of truth
        data: {
          ...clean,
          completedAt: new Date().toISOString(),
        },
      },
      { merge: true }
    );

    console.log("✅ Onboarding saved successfully");
  } catch (error) {
    console.error("🔥 Error saving onboarding:", error);
  }
}
