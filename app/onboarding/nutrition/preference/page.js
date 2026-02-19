"use client";
import "../../shared.css";
import "./page.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../../context/OnboardingContext";



const OPTIONS = [
  {
    label: "Balanced",
    icon: "🥗",
    desc: "A mix of all food groups"
  },
  {
    label: "High Protein",
    icon: "💪",
    desc: "Muscle-building & recovery focused"
  },
  {
    label: "Low Carb",
    icon: "🥑",
    desc: "Lower carbs, higher fats & protein"
  },
  {
    label: "Plant-Based",
    icon: "🌱",
    desc: "Vegetarian or vegan-friendly"
  },
  {
    label: "Pescatarian",
    icon: "🐟",
    desc: "Seafood-focused, no red meat"
  },
  {
    label: "Mediterranean",
    icon: "🍅",
    desc: "Heart-healthy lifestyle eating"
  },
  {
    label: "No Preference",
    icon: "✨",
    desc: "We’ll choose the best plan for you"
  }
];

export default function PreferencePage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  // preload from context if already selected
  const [choice, setChoice] = useState(data.eatingStyle || "");

  function handleNext() {
    updateField("eatingStyle", choice);
    router.push("/onboarding/nutrition/allergies");
  }

  return (
    <div className="onboard-container">
      <div className="onboard-card">

        <h1 className="onboard-title">Your Eating Style</h1>
        <p className="onboard-subtitle">Pick what fits you best</p>

        <div className="nutrition-list">
          {OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className={`nutrition-card ${choice === opt.label ? "selected" : ""}`}
              onClick={() => setChoice(opt.label)}
            >
              <span className="nutri-icon">{opt.icon}</span>

              <div className="nutri-text">
                <div className="nutri-title">{opt.label}</div>
                <div className="nutri-desc">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          className="onboard-button"
          disabled={!choice}
          onClick={handleNext}
        >
          Next
        </button>

      </div>
    </div>
  );
}
