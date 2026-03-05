"use client";

import "./signup.css";
import Image from "next/image";
import { useState } from "react";
import { normalizeError } from "../lib/errors";
import { logError } from "../lib/logging";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase/config";
import { getUserProfile } from "../services/userService";
import { getPostAuthRoute } from "../lib/authRouting";

export default function SignupPage() {
  const isE2EMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1";
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      router.push("/onboarding/name");
    } catch (err) {
      const normalized = normalizeError(err, "Sign up failed.");
      logError("auth.signup.failed", err, { provider: "password" });
      setError(normalized.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const info = getAdditionalUserInfo(result);

      if (info?.isNewUser) {
        router.push("/onboarding/name");
        return;
      }

      const uid = result.user?.uid;
      if (!uid) {
        router.push("/dashboard");
        return;
      }

      const profile = await getUserProfile(uid);
      router.push(getPostAuthRoute(profile));
    } catch (err) {
      const normalized = normalizeError(err, "Google sign-up failed.");
      logError("auth.signup.failed", err, { provider: "google" });
      setError(normalized.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-wrapper" data-testid="signup-page">
      <div className="signup-card">
        <h1 className="signup-title">Create your account</h1>
        <p className="signup-subtitle">Start your wellness journey</p>

        <form className="signup-form" onSubmit={handleSignup}>
          <input
            type="email"
            placeholder="Email address"
            className="signup-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="signup-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirm password"
            className="signup-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          {error && <p className="signup-error">{error}</p>}

          <button className="signup-btn" disabled={loading} type="submit">
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button className="google-btn" onClick={handleGoogleSignup} type="button" disabled={loading}>
          <Image src="/google.svg" className="google-icon" alt="Google" width={18} height={18} />
          Continue with Google
        </button>


        {isE2EMode ? (
          <button
            type="button"
            className="google-btn"
            data-testid="e2e-open-onboarding"
            onClick={() => router.push("/onboarding/finish")}
          >
            Continue in test mode
          </button>
        ) : null}

        <p className="login-text">
          Already have an account?{" "}
          <span className="login-link" onClick={() => router.push("/login")}>
            Log in
          </span>
        </p>
      </div>
    </div>
  );
}
