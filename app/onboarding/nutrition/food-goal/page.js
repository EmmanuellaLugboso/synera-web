"use client";
import "../../shared.css";
import "./page.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../../context/OnboardingContext";



const GOALS = [
  { label: "Fat Loss", icon: "🔥", desc: "Reduce body fat safely" },
  { label: "Muscle Gain", icon: "💪", desc: "Build lean muscle" },
  { label: "Recomposition", icon: "⚖️", desc: "Lose fat + build muscle" },
  { label: "Maintenance", icon: "🧘‍♀️", desc: "Maintain current weight" },
  { label: "Improve Energy Levels", icon: "⚡", desc: "Boost daily performance" }
];

export default function FoodGoalPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  // preload saved goal(s)
  const [selected, setSelected] = useState(data.foodGoals || []);

  function handleSelect(goal) {
    // Maintenance = exclusive choice
    if (goal === "Maintenance") {
      setSelected(["Maintenance"]);
      return;
    }

    let updated = selected.filter((x) => x !== "Maintenance");

    if (updated.includes(goal)) {
      updated = updated.filter((x) => x !== goal);
    } else {
      updated.push(goal);
    }

    setSelected(updated);
  }

  function handleNext() {
    updateField("foodGoals", selected);
    router.push("/onboarding/nutrition/meal-frequency");
  }

  const isValid = selected.length > 0;

  return (
    <div className="onboard-container">
      <div className="onboard-card">

        <h1 className="onboard-title">Your Nutrition Goal</h1>
        <p className="onboard-subtitle">Pick all that apply ✨</p>

        <div className="nutrition-list">
          {GOALS.map((g) => (
            <button
              key={g.label}
              className={`nutrition-card ${
                selected.includes(g.label) ? "selected" : ""
              }`}
              onClick={() => handleSelect(g.label)}
            >
              <span className="nutri-icon">{g.icon}</span>

              <div className="nutri-text">
                <div className="nutri-title">{g.label}</div>
                <div className="nutri-desc">{g.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          className="onboard-button"
          disabled={!isValid}
          onClick={handleNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
