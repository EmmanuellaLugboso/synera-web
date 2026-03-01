"use client";
import "../shared.css";
import "./page.css";
import { useRouter } from "next/navigation";
import { useState } from "react";
// Custom hook to access and update onboarding form data from context
import { useOnboarding } from "../../context/OnboardingContext";

export default function NamePage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();
  const [nameInput, setNameInput] = useState(data.name || "");

  const isValid = nameInput.trim().length >= 2;

  function goNext(e) {
    e.preventDefault();
    const normalized = nameInput.trim();
    if (normalized.length < 2) return;
    updateField("name", normalized);
    router.push("/onboarding/dob");
  }

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        <h1 className="onboard-title">What should we call you?</h1>

        <form onSubmit={goNext}>
          <input
            type="text"
            className="text-input"
            placeholder="Enter your name or nickname"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              updateField("name", e.target.value);
            }}
          />

          <button className="onboard-button" disabled={!isValid} type="submit">
            Next
          </button>
        </form>
      </div>
    </div>
  );
}
