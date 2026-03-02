"use client";

import { auth } from "../firebase/config";
import { serverTimestamp } from "firebase/firestore";
import { mergeUserProfile, sanitizeForFirestore } from "../services/userService";

export async function saveOnboardingData(data) {
  try {
    const user = auth.currentUser;

    if (!user) {
      console.error("❌ No authenticated user found.");
      return;
    }

    const clean = sanitizeForFirestore(data);

    await mergeUserProfile(
      user.uid,
      {
        email: user.email || "",
        onboardingComplete: true,
        updatedAt: serverTimestamp(),

        // ✅ single source of truth
        data: {
          ...clean,
          completedAt: new Date().toISOString(),
        },
      }
    );

    console.log("✅ Onboarding saved successfully");
  } catch (error) {
    console.error("🔥 Error saving onboarding:", error);
  }
}
