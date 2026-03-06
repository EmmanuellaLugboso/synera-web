"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../context/OnboardingContext";
import { getUserProfile } from "../services/userService";
import { shouldBlockOnboarding } from "../lib/authRouting";
import PageState from "../components/ui/PageState";

export default function OnboardingLayout({ children }) {
  const router = useRouter();
  const { ready, user } = useOnboarding();
  const [checking, setChecking] = useState(true);

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
  }, [ready, user?.uid, router]);

  if (checking) {
    return <div className="onboard-container"><PageState type="loading" message="Checking your onboarding status…" /></div>;
  }

  return children;
}
