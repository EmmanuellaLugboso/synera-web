"use client";
import "../shared.css";
import "./page.css";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../context/OnboardingContext";



export default function WeightPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  const unit = data.weightUnit || "kg";
  const weight = data.weight || "";

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        <h1 className="onboard-title">What's your current weight?</h1>
        <p className="onboard-subtitle">This helps us personalise your plan ✨</p>

        {/* Unit Toggle */}
        <div className="unit-toggle">
          <button
            className={`toggle-btn ${unit === "kg" ? "active" : ""}`}
            onClick={() => updateField("weightUnit", "kg")}
          >
            KG
          </button>
          <button
            className={`toggle-btn ${unit === "lbs" ? "active" : ""}`}
            onClick={() => updateField("weightUnit", "lbs")}
          >
            LBS
          </button>
        </div>

        {/* Input */}
        <input
          className="text-input"
          type="number"
          placeholder={`Weight in ${unit}`}
          value={weight}
          onChange={(e) => updateField("weight", e.target.value)}
        />

        <button
          className="onboard-button"
          disabled={!weight}
          onClick={() => router.push("/onboarding/goal")}
        >
          Next
        </button>
      </div>
    </div>
  );
}
