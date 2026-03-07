"use client";

import "../shared.css";
import { useOnboarding } from "../../context/OnboardingContext";
import { saveOnboardingData } from "../saveOnboarding";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  const isE2EMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1";

  const focusCount = Array.isArray(data?.focus) ? data.focus.length : 0;
  const goalCount = Array.isArray(data?.goals) ? data.goals.length : 0;
  const profileName = useMemo(() => String(data?.name || "there").trim(), [data?.name]);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      if (!ready) return;
      if (isE2EMode) return;
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
  }, [ready, user?.uid, router, isE2EMode]);

  async function saveOnboarding() {
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      if (!isE2EMode && !user?.uid) {
        router.replace("/login");
        return;
      }

      if (!isE2EMode) await saveOnboardingData(data);
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
        <h1 className="onboard-title">You&apos;re all set, {profileName}.</h1>
        <p className="onboard-subtitle">Your profile is configured and ready. We&apos;ll now personalize your dashboard, hubs, and daily recommendations.</p>
        <div className="mcq-group" style={{ marginTop: 8 }}>
          <div className="mcq-btn"><span className="mcq-main">Focus areas selected</span><span className="mcq-desc">{focusCount || "No specific areas selected yet"}</span></div>
          <div className="mcq-btn"><span className="mcq-main">Goals saved</span><span className="mcq-desc">{goalCount || "No goals selected yet"}</span></div>
          <div className="mcq-btn"><span className="mcq-main">Profile basics</span><span className="mcq-desc">Name, DOB, biological sex, height, weight</span></div>
        </div>

        <button
          data-testid="onboarding-finish-btn"
          className="onboard-button"
          onClick={saveOnboarding}
          disabled={loading}
        >
          {loading ? "Saving your setup..." : "Go to dashboard"}
        </button>
        {error ? <InlineAlert type="error">{error}</InlineAlert> : null}
      </div>
    </div>
  );
}
