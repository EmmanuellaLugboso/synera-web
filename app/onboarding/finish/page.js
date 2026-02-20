"use client";

import { useOnboarding } from "../../context/OnboardingContext";
import { auth, db } from "../../firebase/config";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FinishPage() {
  const { data } = useOnboarding();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function saveOnboarding() {
    setLoading(true);

    const user = auth.currentUser;

    if (!user) {
      console.error("No authenticated user.");
      setLoading(false);
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);

      // Clean undefined values
      const clean = JSON.parse(JSON.stringify(data || {}));

      await setDoc(
        userRef,
        {
          email: user.email || "",
          onboardingComplete: true,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(), // will only set once if not existing
          data: clean, // ✅ single source of truth
        },
        { merge: true }
      );

      router.push("/dashboard");
    } catch (err) {
      console.error("Error saving onboarding:", err);
    }

    setLoading(false);
  }

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        <h1 className="onboard-title">You&apos;re All Set 🎉</h1>

        <button
          className="onboard-button"
          onClick={saveOnboarding}
          disabled={loading}
        >
          {loading ? "Saving..." : "Finish"}
        </button>
      </div>
    </div>
  );
}
