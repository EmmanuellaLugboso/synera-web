"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOnboarding } from "../context/OnboardingContext";
import { getUserProfile } from "../services/userService";
import { shouldBlockOnboarding } from "../lib/authRouting";
import PageState from "../components/ui/PageState";
import "./shared.css";

const ONBOARDING_STEPS = [
  "/onboarding/name",
  "/onboarding/dob",
  "/onboarding/sex",
  "/onboarding/height",
  "/onboarding/weight",
  "/onboarding/goal",
  "/onboarding/focus",
  "/onboarding/activity",
  "/onboarding/fitness",
  "/onboarding/fitness/workout-type",
  "/onboarding/fitness/workout-time",
  "/onboarding/fitness/workout-env",
  "/onboarding/fitness/workout-days",
  "/onboarding/nutrition/preference",
  "/onboarding/nutrition/allergies",
  "/onboarding/nutrition/food-goal",
  "/onboarding/nutrition/meal-frequency",
  "/onboarding/nutrition/water-intake",
  "/onboarding/nutrition/supplement-use",
  "/onboarding/nutrition/eating-challenges",
  "/onboarding/nutrition/restriction-level",
  "/onboarding/finish",
];

const PHASES = [
  { label: "Profile", start: 0, end: 7 },
  { label: "Fitness", start: 8, end: 12 },
  { label: "Nutrition", start: 13, end: 20 },
  { label: "Complete", start: 21, end: 21 },
];

export default function OnboardingLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, user } = useOnboarding();
  const isE2EMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1";
  const [checking, setChecking] = useState(() => !isE2EMode);

  const { progressPct, phaseLabel } = useMemo(() => {
    const idx = Math.max(0, ONBOARDING_STEPS.indexOf(pathname));
    const total = ONBOARDING_STEPS.length;
    const pct = Math.round(((idx + 1) / total) * 100);
    const phase = PHASES.find((x) => idx >= x.start && idx <= x.end)?.label || "Onboarding";
    return { progressPct: pct, phaseLabel: phase };
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function guardOnboarding() {
      if (!ready) return;
      if (!user?.uid) {
        router.replace("/login");
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);
        if (!cancelled && shouldBlockOnboarding(profile)) {
          router.replace("/dashboard");
          return;
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    guardOnboarding();

    return () => {
      cancelled = true;
    };
  }, [ready, user?.uid, router, isE2EMode]);

  if (checking) {
    return <div className="onboard-container"><PageState type="loading" message="Checking your onboarding status…" /></div>;
  }

  return (
    <div className="onboard-shell">
      <header className="onboard-progressWrap" aria-label="Onboarding progress">
        <div className="onboard-progressMeta">
          <span className="onboard-progressPhase">{phaseLabel}</span>
          <span className="onboard-progressPct">{progressPct}% complete</span>
        </div>
        <div className="onboard-progressTrack" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct}>
          <div className="onboard-progressFill" style={{ width: `${progressPct}%` }} />
        </div>
      </header>
      {children}
    </div>
  );
}
