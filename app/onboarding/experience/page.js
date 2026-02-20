"use client";
import "../shared.css";
import "./page.css";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../context/OnboardingContext";

const LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "I train consistently",
  "I'm new to fitness"
];

export default function ExperiencePage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        <h1 className="onboard-title">What&apos;s your fitness experience?</h1>

        <div className="mcq-group">
          {LEVELS.map((l) => (
            <button
              key={l}
              className={`mcq-btn ${data.experience === l ? "selected" : ""}`}
              onClick={() => updateField("experience", l)}
            >
              {l}
            </button>
          ))}
        </div>

        <button
          className="onboard-button"
          disabled={!data.experience}
          onClick={() => router.push("/onboarding/activity")}
        >
          Finish
        </button>
      </div>
    </div>
  );
}
