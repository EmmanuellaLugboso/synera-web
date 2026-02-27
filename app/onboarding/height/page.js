"use client";
import "../shared.css";
import "./page.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../context/OnboardingContext";


export default function HeightPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  // local state ONLY for input handling
  const [unit, setUnit] = useState(data.heightUnit || "cm");
  const [cm, setCm] = useState(data.height || "");
  const [feet, setFeet] = useState("");
  const [inches, setInches] = useState("");

  // convert ft/in → cm
  const convertToCm = () => {
    if (!feet && !inches) return "";
    const total = feet * 30.48 + inches * 2.54;
    return Math.round(total);
  };

  // Validation
  const isValid =
    (unit === "cm" && cm >= 90 && cm <= 250) ||
    (unit === "ft" &&
      feet >= 3 &&
      feet <= 8 &&
      inches >= 0 &&
      inches <= 11);

  const handleNext = () => {
    const finalHeight = unit === "cm" ? cm : convertToCm();

    // Save to global store
    updateField("height", finalHeight);
    updateField("heightUnit", unit);

    // move on
    router.push("/onboarding/weight");
  };

  return (
    <div className="onboard-container">
      <div className="onboard-card">
        <h1 className="onboard-title">What&apos;s your height?</h1>

        {/* Unit Toggle */}
        <div className="unit-toggle">
          <button
            className={`toggle-btn ${unit === "cm" ? "active" : ""}`}
            onClick={() => setUnit("cm")}
          >
            CM
          </button>
          <button
            className={`toggle-btn ${unit === "ft" ? "active" : ""}`}
            onClick={() => setUnit("ft")}
          >
            FT/IN
          </button>
        </div>

        {/* CM INPUT */}
        {unit === "cm" && (
          <input
            type="number"
            className="text-input"
            placeholder="Height in cm"
            value={cm}
            onChange={(e) => setCm(e.target.value)}
          />
        )}

        {/* FEET + INCHES */}
        {unit === "ft" && (
          <div className="feet-inputs">
            <input
              type="number"
              className="text-input small"
              placeholder="Feet"
              value={feet}
              onChange={(e) => setFeet(e.target.value)}
            />
            <input
              type="number"
              className="text-input small"
              placeholder="Inches"
              value={inches}
              onChange={(e) => setInches(e.target.value)}
            />
          </div>
        )}

        {/* Conversion Preview */}
        {unit === "ft" && feet && inches && (
          <p className="converted-text">≈ {convertToCm()} cm</p>
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
