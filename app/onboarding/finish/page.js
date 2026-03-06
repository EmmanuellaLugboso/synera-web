"use client";

import { useOnboarding } from "../../context/OnboardingContext";
import { saveOnboardingData } from "../saveOnboarding";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProfile } from "../../services/userService";
import { normalizeError } from "../../lib/errors";
import { logError } from "../../lib/logging";
import InlineAlert from "../../components/ui/InlineAlert";
import PageState from "../../components/ui/PageState";

export default function FinishPage() {
  const { data, user, ready } = useOnboarding();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      if (!ready) return;
      if (!user?.uid) {
        router.replace("/login");
        return;
      }

      const profile = await getUserProfile(user.uid);
      if (!cancelled && profile?.onboardingComplete) {
        router.replace("/dashboard");
      }
    }

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [ready, user?.uid, router]);

  async function saveOnboarding() {
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      if (!user?.uid) {
        router.replace("/login");
        return;
      }

      await saveOnboardingData(data);
      router.replace("/dashboard");
    } catch (err) {
      const normalized = normalizeError(err, "Could not finish onboarding. Please try again.");
      logError("onboarding.finish.failed", err, { screen: "onboarding/finish" });
      setError(normalized.message);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return <div className="onboard-container" data-testid="onboarding-finish-page"><PageState type="loading" message="Loading…" /></div>;

  return (
    <div className="onboard-container" data-testid="onboarding-finish-page">
      <div className="onboard-card">
        <h1 className="onboard-title">You&apos;re All Set 🎉</h1>

        <button
          data-testid="onboarding-finish-btn"
          className="onboard-button"
          onClick={saveOnboarding}
          disabled={loading}
        >
          {loading ? "Saving..." : "Finish"}
        </button>
        {error ? <InlineAlert type="error">{error}</InlineAlert> : null}
      </div>
    </div>
  );
}
