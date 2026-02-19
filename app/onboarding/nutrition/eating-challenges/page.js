"use client";
import "../../shared.css";
import "./page.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../../context/OnboardingContext";



const CHALLENGES = [
  { label: "Portion control", icon: "🍽️" },
  { label: "Sugar cravings", icon: "🍬" },
  { label: "Late-night snacking", icon: "🌙" },
  { label: "Emotional eating", icon: "💭" },
  { label: "Inconsistent meals", icon: "⏰" },
  { label: "Low protein intake", icon: "🥩" },
  { label: "Eating out too often", icon: "🍔" },
  { label: "Staying full", icon: "😮‍💨" },
  { label: "No major challenges", icon: "✔️" }
];

export default function EatingChallengesPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  // preload previously saved answers
  const [selected, setSelected] = useState(data.eatingChallenges || []);

  function toggle(item) {
    const label = item.label;

    if (label === "No major challenges") {
      setSelected(["No major challenges"]);
      return;
    }

    let updated = selected.filter((i) => i !== "No major challenges");

    if (updated.includes(label)) {
      updated = updated.filter((i) => i !== label);
    } else {
      updated.push(label);
    }

    setSelected(updated);
  }

  const canContinue = selected.length > 0;

  function handleNext() {
    updateField("eatingChallenges", selected);
    router.push("/onboarding/nutrition/restriction-level");
  }

  return (
    <div className="onboard-container">
      <div className="onboard-card">

        <h1 className="onboard-title">Any eating challenges?</h1>
        <p className="onboard-subtitle">Select all that apply</p>

        <div className="pill-grid">
          {CHALLENGES.map((c) => (
            <button
              key={c.label}
              className={`pill-card ${
                selected.includes(c.label) ? "selected" : ""
              }`}
              onClick={() => toggle(c)}
            >
              <span className="icon">{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        <button
          className="onboard-button"
          disabled={!canContinue}
          onClick={handleNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
