"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../context/OnboardingContext";
import "./sex.css";

export default function SexPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  const [selected, setSelected] = useState(data.sex || "");
  const [loading, setLoading] = useState(false);

  function handleContinue() {
    if (!selected) return;

    setLoading(true);

    updateField("sex", selected);

    setTimeout(() => {
      router.push("/onboarding/height");
    }, 150);
  }

  return (
    <div className="sex-page">
      <div className="sex-card">
        <div className="sex-kicker">Personal Info</div>
        <h1 className="sex-title">What’s your biological sex?</h1>
        <p className="sex-sub">
          This helps us calculate BMI + calorie estimates more accurately.
        </p>

        <div className="sex-options">
          <button
            type="button"
            className={`sex-option ${selected === "female" ? "active" : ""}`}
            onClick={() => setSelected("female")}
          >
            Female
          </button>

          <button
            type="button"
            className={`sex-option ${selected === "male" ? "active" : ""}`}
            onClick={() => setSelected("male")}
          >
            Male
          </button>

          <button
            type="button"
            className={`sex-option ${selected === "unspecified" ? "active" : ""}`}
            onClick={() => setSelected("unspecified")}
          >
            Prefer not to say
          </button>
        </div>

        <button
          className="sex-button"
          onClick={handleContinue}
          disabled={!selected || loading}
          type="button"
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
