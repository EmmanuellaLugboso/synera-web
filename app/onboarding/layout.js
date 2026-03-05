"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../context/OnboardingContext";
import { getUserProfile } from "../services/userService";
import { shouldBlockOnboarding } from "../lib/authRouting";
import StateMessage from "../components/StateMessage";

export default function OnboardingLayout({ children }) {
  const router = useRouter();
  const { ready, user } = useOnboarding();
  const isE2EMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1";
  const [checking, setChecking] = useState(() => !isE2EMode);

  useEffect(() => {
    let cancelled = false;

    async function guardOnboarding() {
      if (!ready) return;
      if (isE2EMode) {
        setChecking(false);
        return;
      }

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
    return <div className="onboard-container"><StateMessage>Checking your onboarding status…</StateMessage></div>;
  }

  return children;
}
