"use client";

import "../login/login.css";
import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/config";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Reset link sent. Check your inbox.");
    } catch (err) {
      setError(err?.message || "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-head">
            <div className="auth-kicker">Account recovery</div>
            <h1 className="auth-title">Forgot password</h1>
            <p className="auth-sub">Enter your email to receive a reset link.</p>
          </div>

          <form className="auth-form" onSubmit={handleReset}>
            <label className="auth-label">
              Email
              <input
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            {error ? <div className="auth-alert">{error}</div> : null}
            {message ? <div className="auth-alert" style={{ background: "#eefcf5", color: "#0f5132" }}>{message}</div> : null}

            <button className="auth-primary" disabled={loading || !email.trim()} type="submit">
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <div className="auth-foot">
            <Link href="/login" className="auth-footLink">Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
