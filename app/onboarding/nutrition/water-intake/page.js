"use client";
import "../../shared.css";
import "./page.css";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOnboarding } from "../../../context/OnboardingContext";



const WATER_OPTIONS = [
  {
    label: "< 1L",
    desc: "Below recommended hydration",
    icon: "💧"
  },
  {
    label: "1–2L",
    desc: "Average daily intake",
    icon: "💧"
  },
  {
    label: "2–3L",
    desc: "Ideal for most people",
    icon: "💧"
  },
  {
    label: "3L+",
    desc: "High hydration level",
    icon: "💧"
  },
  {
    label: "I'm not sure yet",
    desc: "We'll estimate your ideal target later",
    icon: "🤷"
  }
];

export default function WaterPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  // Load previous answer (if user goes back)
  const [selected, setSelected] = useState(data.waterIntake || "");

  function handleSelect(label) {
    setSelected(label);
    updateField("waterIntake", label);  // <-- saves to global onboarding state
  }

  return (
    <div className="onboard-container">
      <div className="onboard-card">

        <h1 className="onboard-title">Daily Water Intake</h1>
        <p className="onboard-subtitle">
          Choose the option that best matches your usual hydration 💧
        </p>

        <div className="water-cards">
          {WATER_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className={`water-card ${selected === opt.label ? "selected" : ""}`}
              onClick={() => handleSelect(opt.label)}
            >
              <div className="water-icon">{opt.icon}</div>

              <div className="water-texts">
                <span className="water-label">{opt.label}</span>
                <span className="water-desc">{opt.desc}</span>
              </div>
            </button>
          ))}
        </div>

        <button
          className="onboard-button"
          disabled={!selected}
          onClick={() => router.push("/onboarding/nutrition/supplement-use")}
        >
          Next
        </button>

      </div>
    </div>
  );
}
