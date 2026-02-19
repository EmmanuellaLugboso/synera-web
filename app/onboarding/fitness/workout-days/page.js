"use client";
import "./page.css";
import "../../shared.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../../context/OnboardingContext";



export default function WorkoutDaysPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  // Load previously saved answer if it exists
  const [selected, setSelected] = useState(data.workoutDays || "");

  const days = [
    { label: "1 Day", desc: "Perfect for beginners easing in" },
    { label: "2 Days", desc: "Steady routine with recovery time" },
    { label: "3 Days", desc: "Great balance for busy schedules" },
    { label: "4 Days", desc: "Ideal for consistent progress" },
    { label: "5 Days", desc: "Strong commitment & visible results" },
    { label: "6 Days", desc: "Advanced & dedicated training" },
    { label: "I'm not sure yet", desc: "We’ll choose the best plan for you" },
  ];

  const handleNext = () => {
    updateField("workoutDays", selected);
    router.push("/onboarding/nutrition/preference");
  };

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        <h1 className="onboard-title">How Many Days Can You Commit?</h1>
        <p className="onboard-subtitle">
          Choose what fits your lifestyle 📅
        </p>

        <div className="days-list">
          {days.map((d) => (
            <button
              key={d.label}
              className={`day-item ${selected === d.label ? "selected" : ""}`}
              onClick={() => setSelected(d.label)}
            >
              <div className="day-main">{d.label}</div>
              <div className="day-desc">{d.desc}</div>
            </button>
          ))}
        </div>

        <button
          className="onboard-button"
          disabled={!selected}
          onClick={handleNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
