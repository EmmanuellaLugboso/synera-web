"use client";
import "./page.css";
import "../../shared.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../../context/OnboardingContext";



export default function WorkoutTimePage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  const times = [
    {
      label: "Morning",
      icon: "🌅",
      sub: "Best for consistency & energy boost",
    },
    {
      label: "Afternoon",
      icon: "🌤️",
      sub: "Great strength & focus levels",
    },
    {
      label: "Evening",
      icon: "🌙",
      sub: "Perfect if you're busy earlier",
    },
    {
      label: "I'm Flexible",
      icon: "✨",
      sub: "No strict schedule — anytime works",
    },
  ];

  // load previous response if user returns
  const [selected, setSelected] = useState(data.workoutTime || []);

  function toggleChoice(option) {
    if (option === "I'm Flexible") {
      setSelected(["I'm Flexible"]);
      return;
    }

    if (selected.includes("I'm Flexible")) {
      setSelected([option]);
      return;
    }

    setSelected((prev) =>
      prev.includes(option)
        ? prev.filter((t) => t !== option)
        : [...prev, option]
    );
  }

  const handleNext = () => {
    updateField("workoutTime", selected);
    router.push("/onboarding/fitness/workout-env");
  };

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        <h1 className="onboard-title">Preferred Workout Time</h1>
        <p className="onboard-subtitle">
          Pick the times that fit your lifestyle
          <span className="multi-hint">
            You can choose multiple — unless you pick &quot;I&apos;m Flexible&quot;
          </span>
        </p>

        <div className="time-grid">
          {times.map((t) => (
            <button
              key={t.label}
              className={`time-box ${
                selected.includes(t.label) ? "selected" : ""
              }`}
              onClick={() => toggleChoice(t.label)}
            >
              <span className="time-icon">{t.icon}</span>
              <span className="time-label">{t.label}</span>
              <span className="time-sub">{t.sub}</span>
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
