import test from "node:test";
import assert from "node:assert/strict";

const { getPostAuthRoute, shouldBlockOnboarding } = await import("../app/lib/authRouting.js");

test("getPostAuthRoute sends completed profiles to dashboard", () => {
  assert.equal(getPostAuthRoute({ onboardingComplete: true }), "/dashboard");
  assert.equal(getPostAuthRoute({ onboardingComplete: false }), "/onboarding/name");
  assert.equal(getPostAuthRoute(null), "/onboarding/name");
});

test("shouldBlockOnboarding only blocks completed users", () => {
  assert.equal(shouldBlockOnboarding({ onboardingComplete: true }), true);
  assert.equal(shouldBlockOnboarding({ onboardingComplete: false }), false);
  assert.equal(shouldBlockOnboarding(undefined), false);
});
