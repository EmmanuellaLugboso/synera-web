"use client";
import "../../shared.css";
import "./page.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../../context/OnboardingContext";
import { saveOnboardingData } from "../../saveOnboarding";



const OPTIONS = [
  {
    label: "Structured",
    desc: "I like clear plans & routines",
    icon: "📘",
  },
  {
    label: "Balanced",
    desc: "Consistency with flexibility",
    icon: "⚖️",
  },
  {
    label: "Easygoing",
    desc: "I don’t track much & prefer freedom",
    icon: "🌿",
  },
];

export default function RestrictionLevelPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  // preload in case the user goes back
  const [selected, setSelected] = useState(data.restrictionLevel || "");

  async function finishOnboarding() {
    // save selection into context
    updateField("restrictionLevel", selected);

    // save everything to Firebase
    await saveOnboardingData({
      ...data,
      restrictionLevel: selected,
    });

    // go to dashboard
    router.push("/dashboard");
  }

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        <h1 className="onboard-title">How do you prefer to eat?</h1>
        <p className="onboard-subtitle">
          This helps us tailor your plan to your lifestyle.
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
          onClick={finishOnboarding}
        >
          Finish Nutrition
        </button>
      </div>
    </div>
  );
}
