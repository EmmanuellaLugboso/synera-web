"use client";

import { useOnboarding } from "../../context/OnboardingContext";
import { auth } from "../../firebase/config";
import { saveOnboardingData } from "../saveOnboarding";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function FinishPage() {
  const { data } = useOnboarding();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) router.push("/login");
  }, [router]);

  async function saveOnboarding() {
    setLoading(true);

    const user = auth.currentUser;

    if (!user) {
      console.error("No authenticated user.");
      setLoading(false);
      return;
    }

    try {
      await saveOnboardingData(data);
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
