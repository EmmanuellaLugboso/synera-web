"use client";

import "./login.css";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase/config";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length >= 6 && !loading;
  }, [email, password, loading]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      console.log(err);
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (err) {
      console.log(err);
      setError(err?.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* soft blobs like the landing */}
      <div className="auth-blob b1" />
      <div className="auth-blob b2" />

      <div className="auth-shell">
        <div className="auth-brand" onClick={() => router.push("/")} role="button" tabIndex={0}>
          <div className="auth-logo" aria-hidden="true">
            ✿
          </div>
          <div className="auth-brandtext">Synera</div>
        </div>

        <div className="auth-card">
          <div className="auth-head">
            <div className="auth-kicker">Welcome back</div>
            <h1 className="auth-title">Sign in</h1>
            <p className="auth-sub">
              Track your wellness with clean dashboards, real progress, zero clutter.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <label className="auth-label">
              Email
              <input
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="auth-label">
              Password
              <input
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <div className="auth-row">
              <button
                type="button"
                className="auth-link"
                onClick={() => router.push("/forgot-password")}
              >
                Forgot password?
              </button>
            </div>

            {error ? <div className="auth-alert">{error}</div> : null}

            <button className="auth-primary" disabled={!canSubmit} type="submit">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button
            className="auth-google"
            onClick={handleGoogle}
            disabled={loading}
            type="button"
          >
            <span className="auth-googleIcon" aria-hidden="true">
              <Image src="/google.svg" alt="" width={18} height={18} />
            </span>
            Continue with Google
          </button>

          <div className="auth-foot">
            <span>Don’t have an account?</span>
            <button className="auth-footLink" onClick={() => router.push("/signup")} type="button">
              Create one
            </button>
          </div>
        </div>

        <div className="auth-mini">
          By continuing, you agree to Synera’s{" "}
          <span className="auth-miniLink">Terms</span> and{" "}
          <span className="auth-miniLink">Privacy</span>.
        </div>
      </div>
    </div>
  );
}
