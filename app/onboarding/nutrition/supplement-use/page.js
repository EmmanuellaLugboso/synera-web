"use client";
import "../../shared.css";
import "./page.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../../context/OnboardingContext";


const CATEGORIES = [
  {
    title: "Performance & Training",
    items: [
      { label: "Protein Powder", icon: "💪", desc: "Whey or plant-based" },
      { label: "Creatine", icon: "⚡", desc: "Strength & power" },
      { label: "Pre-Workout", icon: "🔥", desc: "Energy & focus boost" },
      { label: "BCAAs / EAAs", icon: "🧬", desc: "Muscle recovery" },
      { label: "Beta-Alanine", icon: "🏃‍♀️", desc: "Endurance support" },
    ],
  },

  {
    title: "Daily Essentials",
    items: [
      { label: "Multivitamin", icon: "🌈", desc: "Daily nutrients" },
      { label: "Omega-3", icon: "🐟", desc: "Heart & brain health" },
      { label: "Vitamin D", icon: "☀️", desc: "Immunity & mood" },
      { label: "Magnesium", icon: "💤", desc: "Sleep & recovery" },
      { label: "Iron", icon: "🩸", desc: "Energy & blood health" },
      { label: "Probiotics", icon: "🦠", desc: "Gut health" },
    ],
  },

  {
    title: "Metabolic & Appetite",
    items: [
      { label: "Green Tea Extract", icon: "🍵", desc: "Metabolism support" },
      { label: "Apple Cider Vinegar", icon: "🍎", desc: "Digestion & appetite" },
      { label: "Glucomannan / Fibre", icon: "🌾", desc: "Fullness & fibre" },
      { label: "Chromium", icon: "🔬", desc: "Blood sugar support" },
    ],
  },

  {
    title: "Beauty & Aesthetics",
    items: [
      { label: "Collagen", icon: "✨", desc: "Skin & joints" },
      { label: "Biotin", icon: "💅", desc: "Hair & nails" },
      { label: "Hyaluronic Acid", icon: "💧", desc: "Skin hydration" },
    ],
  },

  {
    title: "Women’s Health",
    items: [
      { label: "Inositol", icon: "🌸", desc: "PCOS & hormone balance" },
      { label: "Ashwagandha", icon: "🧘‍♀️", desc: "Stress & cortisol" },
      { label: "Evening Primrose Oil", icon: "🌙", desc: "Hormone support" },
    ],
  },

  {
    title: "Other",
    items: [
      { label: "None", icon: "🚫", desc: "I don’t take supplements" },
      { label: "Not Sure Yet", icon: "❔", desc: "Need guidance" },
    ],
  },
];

export default function SupplementsPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  // preload saved supplements
  const [selected, setSelected] = useState(data.supplements || []);
  const [other, setOther] = useState(data.otherSupplement || "");

  function toggle(label) {
    // If user selects "None", clear everything else
    if (label === "None") {
      setSelected(["None"]);
      return;
    }

    // Normal toggle
    const updated = selected.includes(label)
      ? selected.filter((i) => i !== label)
      : [...selected.filter((i) => i !== "None"), label];

    setSelected(updated);
  }

  const canContinue =
    selected.length > 0 || other.trim().length > 1;

  function handleNext() {
    updateField("supplements", selected);
    updateField("otherSupplement", other.trim());
    router.push("/onboarding/nutrition/eating-challenges");
  }

  return (
    <div className="onboard-container">
      <div className="onboard-card">

        <h1 className="onboard-title">Do You Take Supplements?</h1>
        <p className="onboard-subtitle">Select everything that applies to you</p>

        {CATEGORIES.map((cat) => (
          <div key={cat.title} className="supp-section">
            <h3 className="supp-category-title">{cat.title}</h3>

            <div className="supp-grid">
              {cat.items.map((item) => (
                <button
                  key={item.label}
                  className={`supp-card ${
                    selected.includes(item.label) ? "selected" : ""
                  }`}
                  onClick={() => toggle(item.label)}
                >
                  <span className="supp-icon">{item.icon}</span>

                  <div className="supp-info">
                    <p className="supp-label">{item.label}</p>
                    <p className="supp-desc">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Optional other input */}
        <input
          type="text"
          className="text-input other-input"
          placeholder="Other supplement (optional)"
          value={other}
          onChange={(e) => setOther(e.target.value)}
        />

        <button
          className="onboard-button"
          disabled={!canContinue}
          onClick={handleNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
