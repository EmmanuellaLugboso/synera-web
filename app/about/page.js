import Link from "next/link";
import "./about.css";
import BackButton from "../components/BackButton";

export default function AboutPage() {
  return (
    <main className="about-page">
      <div className="about-shell">
        <header className="about-top">
          <BackButton href="/settings" label="Settings" />
        </header>

        <section className="about-hero">
          <h1 className="page-title">About Synera</h1>
          <p className="body-text">
            Synera is a wellness and productivity platform that helps you align fitness, nutrition,
            recovery, habits, and planning into one guided daily system.
          </p>
        </section>

        <section className="about-grid">
          <article className="about-card">
            <h2 className="section-title">What Synera helps you do</h2>
            <ul>
              <li>Plan and execute your day with clarity.</li>
              <li>Track workouts, steps, meals, hydration, and habits.</li>
              <li>Understand daily and weekly trends with actionable insights.</li>
            </ul>
          </article>

          <article className="about-card">
            <h2 className="section-title">Core areas</h2>
            <ul>
              <li>Fitness for training consistency.</li>
              <li>Nutrition for fueling intentionally.</li>
              <li>Wellness for mood and recovery balance.</li>
              <li>Lifestyle for routines, goals, and discipline.</li>
            </ul>
          </article>
        </section>

        <div className="about-actions">
          <Link href="/hubs" className="about-btn">Open Hubs</Link>
          <Link href="/dashboard" className="about-btn ghost">Back to Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
