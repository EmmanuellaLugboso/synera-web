"use client";
import "../shared.css";
import "./page.css";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../../context/OnboardingContext";


export default function DobPage() {
  const router = useRouter();
  const { data, updateField } = useOnboarding();

  const dob = data.dob || "";

  const isValid = (() => {
    if (!dob) return false;
    const entered = new Date(dob);
    if (isNaN(entered.getTime())) return false;

    const ageDifMs = Date.now() - entered.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    return age >= 13 && age <= 100; // safe + realistic
  })();

  return (
    <div className="onboard-container">
      <div className="onboard-card">

        <h1 className="onboard-title">When's your birthday? 🎂</h1>

        <input
          type="date"
          className="dob-input"
          value={dob}
          onChange={(e) => updateField("dob", e.target.value)}
        />

        <button
          className="onboard-button"
          disabled={!isValid}
          onClick={() => router.push("/onboarding/sex")}
        >
          Next
        </button>
      </div>
    </div>
  );
}
