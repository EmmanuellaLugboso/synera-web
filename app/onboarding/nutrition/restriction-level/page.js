"use client";
import "../../shared.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../../context/OnboardingContext";

const OPTIONS = [
  {
    label: "Structured",
    desc: "I like clear plans and routines",
    icon: "📘",
  },
  {
    label: "Balanced",
    desc: "Consistency with flexibility",
    icon: "⚖️",
  },
  {
    label: "Easygoing",
    desc: "I don’t track much and prefer freedom",
    icon: "🌿",
  },
];

export default function RestrictionLevelPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  const [selected, setSelected] = useState(data.restrictionLevel || "");

  function handleNext() {
    updateField("restrictionLevel", selected);
    router.push("/onboarding/finish");
  }

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        <h1 className="onboard-title">How do you prefer to eat?</h1>
        <p className="onboard-subtitle">
          This helps us tailor your nutrition plan to your day-to-day lifestyle.
        </p>

        <div className="choice-grid">
          {OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className={`choice-card ${
                selected === opt.label ? "selected" : ""
              }`}
              onClick={() => setSelected(opt.label)}
            >
              <span className="icon">{opt.icon}</span>
              <span className="main">{opt.label}</span>
              <span className="sub">{opt.desc}</span>
            </button>
          ))}
        </div>

        <button
          className="onboard-button"
          disabled={!selected}
          onClick={handleNext}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
