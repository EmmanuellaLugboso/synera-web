"use client";
import "../shared.css";
import "./page.css";
import { useRouter } from "next/navigation";
// Custom hook to access and update onboarding form data from context
import { useOnboarding } from "../../context/OnboardingContext";


export default function NamePage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  const name = data.name || "";
  const isValid = name.trim().length >= 2;

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        <h1 className="onboard-title">What should we call you?</h1>

        <input
          type="text"
          className="text-input"
          placeholder="Enter your name or nickname"
          value={name}
          onChange={(e) => updateField("name", e.target.value)}
        />

        <button
          className="onboard-button"
          disabled={!isValid}
          onClick={() => router.push("/onboarding/dob")}
        >
          Next
        </button>
      </div>
    </div>
  );
}
