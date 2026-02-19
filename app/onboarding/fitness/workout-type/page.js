"use client";
import "./page.css";
import "../../shared.css";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOnboarding } from "../../../context/OnboardingContext";


export default function WorkoutTypePage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  const types = [
    {
      label: "Strength Training",
      icon: "🏋️‍♀️",
      sub: "Build strength & power",
    },
    {
      label: "Hypertrophy",
      icon: "💪",
      sub: "Grow & shape your muscles",
    },
    {
      label: "Fat Loss / Toning",
      icon: "🔥",
      sub: "Burn fat & define physique",
    },
    {
      label: "HIIT / Endurance",
      icon: "⚡",
      sub: "Boost stamina & intensity",
    },
    {
      label: "Mobility & Flexibility",
      icon: "🧘‍♀️",
      sub: "Improve movement & reduce tightness",
    },
  ];

  // preload previous selection
  const [selected, setSelected] = useState(data.workoutTypes || []);

  function toggleSelect(type) {
    setSelected((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  }

  const handleNext = () => {
    updateField("workoutTypes", selected);
    router.push("/onboarding/fitness/workout-time");
  };

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        <h1 className="onboard-title">Your Training Style</h1>
        <p className="onboard-subtitle">
          Pick the types of workouts you enjoy.
          <span className="multi-hint">You can choose multiple ✨</span>
        </p>

        <div className="type-grid">
          {types.map((t) => (
            <button
              key={t.label}
              className={`type-box ${
                selected.includes(t.label) ? "selected" : ""
              }`}
              onClick={() => toggleSelect(t.label)}
            >
              <span className="type-icon">{t.icon}</span>
              <span className="type-label">{t.label}</span>
              <span className="type-sub">{t.sub}</span>
            </button>
          ))}
        </div>

        <button
          className="onboard-button"
          disabled={selected.length === 0}
          onClick={handleNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
