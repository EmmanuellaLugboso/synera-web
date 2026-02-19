"use client";
import "../shared.css";
import "./page.css";
import { useRouter } from "next/navigation";

export default function FitnessIntroPage() {
  const router = useRouter();

  return (
    <div className="onboard-container">
      <div className="onboard-card">

        {/* Aesthetic Fitness Icon */}
        <div className="top-icon">💪</div>

        <h1 className="onboard-title">Let’s set up your fitness plan</h1>

        <p className="onboard-subtitle">
          We’ll personalize your workouts based on your goals and routine.
        </p>

        <button
          className="onboard-button bigger-btn"
          onClick={() =>
            router.push("/onboarding/fitness/workout-type")
          }
        >
          Continue
        </button>

        <p className="tiny-note">This will only take a moment ✨</p>
      </div>
    </div>
  );
}
