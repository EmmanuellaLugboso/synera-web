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
import InlineAlert from "../components/ui/InlineAlert";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function SignupPage() {
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
          <Input
            id="signup-email"
            label="Email"
            type="email"
            placeholder="Email address"
            className="signup-inputWrap"
            inputClassName="signup-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            id="signup-password"
            label="Password"
            type="password"
            placeholder="Password"
            className="signup-inputWrap"
            inputClassName="signup-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Input
            id="signup-confirm"
            label="Confirm password"
            type="password"
            placeholder="Confirm password"
            className="signup-inputWrap"
            inputClassName="signup-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          {error ? <InlineAlert type="error">{error}</InlineAlert> : null}

          <Button className="signup-btn" disabled={loading} type="submit">
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button className="google-btn" onClick={handleGoogleSignup} type="button" disabled={loading}>
          <Image src="/google.svg" className="google-icon" alt="Google" width={18} height={18} />
          Continue with Google
        </button>


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
