"use client";
import "../../shared.css";
import "./page.css";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOnboarding } from "../../../context/OnboardingContext";



const ALLERGIES = [
  { label: "None", icon: "✨", desc: "No allergies or sensitivities" },
  { label: "Dairy", icon: "🥛", desc: "Milk, cheese, yogurt, etc." },
  { label: "Gluten", icon: "🌾", desc: "Wheat, rye, barley" },
  { label: "Nuts", icon: "🥜", desc: "Peanuts, almonds, cashews" },
  { label: "Shellfish", icon: "🦐", desc: "Shrimp, crab, lobster" },
  { label: "Eggs", icon: "🍳", desc: "Egg whites or yolks" },
  { label: "Other", icon: "❓", desc: "Add your own allergy" }
];

export default function AllergiesPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  // preload values if user goes back
  const [selected, setSelected] = useState(data.allergies || []);
  const [otherText, setOtherText] = useState(data.otherAllergy || "");

  function toggleSelect(item) {
    if (item === "None") {
      setSelected(["None"]);
      setOtherText("");
      return;
    }

    let updated = selected.filter((i) => i !== "None");

    if (updated.includes(item)) {
      updated = updated.filter((i) => i !== item);
    } else {
      updated.push(item);
    }

    setSelected(updated);
  }

  const isValid =
    selected.length > 0 &&
    (!selected.includes("Other") || otherText.trim().length > 0);

  function handleNext() {
    updateField("allergies", selected);
    updateField("otherAllergy", otherText.trim());
    router.push("/onboarding/nutrition/food-goal");
  }

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        <h1 className="onboard-title">Any Allergies?</h1>
        <p className="onboard-subtitle">We’ll customise your meal plan for safety</p>

        <div className="nutrition-list">
          {ALLERGIES.map((opt) => (
            <button
              key={opt.label}
              className={`nutrition-card ${
                selected.includes(opt.label) ? "selected" : ""
              }`}
              onClick={() => toggleSelect(opt.label)}
            >
              <span className="nutri-icon">{opt.icon}</span>

              <div className="nutri-text">
                <div className="nutri-title">{opt.label}</div>
                <div className="nutri-desc">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {selected.includes("Other") && (
          <input
            className="text-input other-input"
            placeholder="Enter your allergy"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
          />
        )}

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
