export function getPostAuthRoute(profile) {
  return profile?.onboardingComplete ? "/dashboard" : "/onboarding/name";
}

export function shouldBlockOnboarding(profile) {
  return !!profile?.onboardingComplete;
}
