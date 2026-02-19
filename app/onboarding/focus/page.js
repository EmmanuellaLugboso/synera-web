"use client";
import "../shared.css";
import "./page.css";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOnboarding } from "../../context/OnboardingContext";


const OPTIONS = [
  "Fitness",
  "Nutrition",
  "Mind & Sleep",
  "Not sure yet"
];

export default function FocusPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  // Load previous answers if user returns to page
  const [selected, setSelected] = useState(data.focus || []);

  function toggleOption(option) {
    if (option === "Not sure yet") {
      setSelected(["Not sure yet"]);
      return;
    }

    // If "Not sure yet" was selected, remove it when selecting something else
    if (selected.includes("Not sure yet")) {
      setSelected([option]);
      return;
    }

    // Normal toggle logic
    if (selected.includes(option)) {
      setSelected(selected.filter((item) => item !== option));
    } else {
      setSelected([...selected, option]);
    }
  }

  function handleNext() {
    updateField("focus", selected);
    router.push("/onboarding/activity");
  }

  return (
    <div className="onboard-container">
      <div className="onboard-card">

        <h1 className="onboard-title">What areas do you want to focus on?</h1>
        <p className="onboard-subtitle">
          Pick all that apply — totally personalised 💖
        </p>

        <div className="mcq-group">
          {OPTIONS.map((opt) => (
            <button
              key={opt}
              className={`mcq-btn ${selected.includes(opt) ? "selected" : ""}`}
              onClick={() => toggleOption(opt)}
            >
              {opt}
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
