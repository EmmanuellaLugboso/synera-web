"use client";
import "./page.css";
import "../../shared.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../../context/OnboardingContext";



const OPTIONS = [
  {
    label: "Commercial Gym",
    sub: "Full equipment access",
    icon: "🏋️‍♂️",
  },
  {
    label: "Small / Limited Gym",
    sub: "Dumbbells, cable machine, basic racks",
    icon: "🏋️‍♀️",
  },
  {
    label: "Home Workouts",
    sub: "Minimal or no equipment",
    icon: "🏠",
  },
  {
    label: "Home Gym Setup",
    sub: "Dumbbells, bench, bands, etc.",
    icon: "💪",
  },
  {
    label: "Outdoor Training",
    sub: "Running, bodyweight, circuits",
    icon: "🌳",
  },
];

export default function WorkoutEnvPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  // Load previous selections if they exist
  const [selected, setSelected] = useState(data.workoutEnvironment || []);

  const toggle = (label) => {
    setSelected((prev) =>
      prev.includes(label)
        ? prev.filter((x) => x !== label)
        : [...prev, label]
    );
  };

  const handleNext = () => {
    updateField("workoutEnvironment", selected);
    router.push("/onboarding/fitness/workout-days");
  };

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        <h1 className="onboard-title">Where Do You Prefer Training?</h1>

        <p className="onboard-subtitle">Pick all that apply</p>
        <p className="small-note">You can choose multiple ✨</p>

        <div className="env-grid">
          {OPTIONS.map((o) => (
            <button
              key={o.label}
              className={`env-card ${selected.includes(o.label) ? "selected" : ""}`}
              onClick={() => toggle(o.label)}
            >
              <span className="env-icon">{o.icon}</span>
              <div className="env-text">
                <span className="env-title">{o.label}</span>
                <span className="env-sub">{o.sub}</span>
              </div>
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
