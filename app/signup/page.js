"use client";

import "./signup.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase/config";

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
      console.log(err);
      setError(err?.message || "Sign up failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/onboarding/name");
    } catch (err) {
      console.log(err);
      setError(err?.message || "Google sign-up failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-wrapper">
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
          <img src="/google.svg" className="google-icon" alt="Google" />
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
