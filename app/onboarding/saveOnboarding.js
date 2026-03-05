"use client";

import { auth } from "../firebase/config";
import { serverTimestamp } from "firebase/firestore";
import { mergeUserProfile, sanitizeForFirestore } from "../services/userService";
import { normalizeError } from "../lib/errors";
import { logError, logEvent } from "../lib/logging";

export async function saveOnboardingData(data) {
  try {
    const user = auth.currentUser;

    if (!user) {
      logEvent("warn", "onboarding.save.no_user", {});
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

    logEvent("info", "onboarding.save.success", { uid: user.uid });
  } catch (error) {
    const normalized = normalizeError(error, "Could not persist onboarding data.");
    logError("onboarding.save.failed", error, {});
    throw new Error(normalized.message);
  }
}
