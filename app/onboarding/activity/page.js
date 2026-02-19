"use client";
import "../shared.css";
import "./page.css";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../context/OnboardingContext";


const OPTIONS = [
  { label: "Sedentary", desc: "(Little or no exercise)" },
  { label: "Lightly Active", desc: "(1–3 workouts per week)" },
  { label: "Moderately Active", desc: "(3–5 workouts per week)" },
  { label: "Very Active", desc: "(6–7 workouts per week)" },
  { label: "Athlete Level", desc: "(Daily intense training)" }
];

export default function ActivityPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        <h1 className="onboard-title">How active are you?</h1>

        <div className="mcq-group">
          {OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className={`mcq-btn ${data.activity === opt.label ? "selected" : ""}`}
              onClick={() => updateField("activity", opt.label)}
            >
              <span className="mcq-main">{opt.label}</span>
              <span className="mcq-desc">{opt.desc}</span>
            </button>
          ))}
        </div>

        <button
          className="onboard-button"
          disabled={!data.activity}
          onClick={() => router.push("/onboarding/fitness")}
        >
          Next
        </button>
      </div>
    </div>
  );
}
