"use client";

import "../login/login.css";
import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/config";
import { normalizeError } from "../lib/errors";
import { logError } from "../lib/logging";
import InlineAlert from "../components/ui/InlineAlert";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

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
      const normalized = normalizeError(err, "Could not send reset email.");
      logError("auth.password_reset.failed", err, { screen: "forgot-password" });
      setError(normalized.message);
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
            <Input
              id="reset-email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              className="auth-label"
              inputClassName="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error ? <InlineAlert type="error">{error}</InlineAlert> : null}
            {message ? <InlineAlert type="success">{message}</InlineAlert> : null}

            <Button className="auth-primary" disabled={loading || !email.trim()} type="submit">
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>

          <div className="auth-foot">
            <Link href="/login" className="auth-footLink">Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
