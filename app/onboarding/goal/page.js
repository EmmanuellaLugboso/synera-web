"use client";
import "../shared.css";
import "./page.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../context/OnboardingContext";


const GOALS = [
  // Fitness
  { label: "Lose weight", category: "Fitness" },
  { label: "Build muscle", category: "Fitness" },
  { label: "Tone/define body", category: "Fitness" },
  { label: "Improve strength", category: "Fitness" },
  { label: "Improve endurance", category: "Fitness" },
  { label: "Improve flexibility", category: "Fitness" },

  // Nutrition
  { label: "Eat healthier", category: "Nutrition" },
  { label: "Reduce sugar", category: "Nutrition" },
  { label: "Increase protein", category: "Nutrition" },
  { label: "Improve digestion", category: "Nutrition" },
  { label: "Build consistent meal habits", category: "Nutrition" },

  // Mind & Sleep
  { label: "Improve sleep", category: "Mind" },
  { label: "Reduce stress", category: "Mind" },
  { label: "Boost energy", category: "Mind" },
  { label: "Improve mood", category: "Mind" },
  { label: "Build discipline & routine", category: "Mind" },

  // Lifestyle
  { label: "Better daily habits", category: "Lifestyle" },
  { label: "Balance work & life", category: "Lifestyle" },
  { label: "Long-term wellness", category: "Lifestyle" },
  { label: "Feel more confident", category: "Lifestyle" }
];

export default function GoalPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  // preload existing answers if user goes back
  const [selected, setSelected] = useState(data.goals || []);

  const toggleGoal = (goal) => {
    setSelected((prev) =>
      prev.includes(goal)
        ? prev.filter((x) => x !== goal)
        : [...prev, goal]
    );
  };

  const handleNext = () => {
    updateField("goals", selected);
    router.push("/onboarding/focus");
  };

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        <h1 className="onboard-title">What are your wellness goals?</h1>
        <p className="onboard-subtitle">Choose all that apply ✨</p>

        <div className="goal-section">
          {GOALS.map((g) => (
            <button
              key={g.label}
              className={`goal-pill ${
                selected.includes(g.label) ? "selected" : ""
              }`}
              onClick={() => toggleGoal(g.label)}
            >
              {g.label}
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
