"use client";
import "../../shared.css";
import "./page.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../../context/OnboardingContext";



const FREQUENCY = [
  {
    label: "1 Meal",
    desc: "OMAD or fasting-style eating",
    icon: "🍽️"
  },
  {
    label: "2 Meals",
    desc: "Low frequency, bigger meals",
    icon: "🍽️"
  },
  {
    label: "3 Meals",
    desc: "Most common daily structure",
    icon: "🍽️"
  },
  {
    label: "4 Meals",
    desc: "Balanced meals + one snack",
    icon: "🍽️"
  },
  {
    label: "Small Frequent Meals (5+)",
    desc: "Light meals spread throughout the day",
    icon: "🍽️"
  },
  {
    label: "I'm not sure yet",
    desc: "We’ll personalise this later",
    icon: "🤷"
  }
];

export default function MealFrequencyPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  const [freq, setFreq] = useState(data.mealFrequency || "");

  function handleNext() {
    updateField("mealFrequency", freq);
    router.push("/onboarding/nutrition/water-intake");
  }

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        
        <h1 className="onboard-title">How Many Meals Do You Prefer?</h1>
        <p className="onboard-subtitle">Choose the style that fits your routine.</p>

        <div className="meal-cards">
          {FREQUENCY.map((item) => (
            <button
              key={item.label}
              className={`meal-card ${freq === item.label ? "selected" : ""}`}
              onClick={() => setFreq(item.label)}
            >
              <div className="meal-icon">{item.icon}</div>

              <div className="meal-texts">
                <span className="meal-label">{item.label}</span>
                <span className="meal-desc">{item.desc}</span>
              </div>
            </button>
          ))}
        </div>

        <button
          className="onboard-button"
          disabled={!freq}
          onClick={handleNext}
        >
          Next
        </button>

      </div>
    </div>
  );
}
