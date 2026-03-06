import "./info.css";
import BackButton from "../components/BackButton";

export default function InfoPage() {
  return (
    <main className="info-page">
      <div className="info-shell">
        <header><BackButton href="/settings" label="Settings" /></header>
        <section className="info-card">
          <h1 className="page-title">Information & Help</h1>
          <p className="body-text">Quick guidance to get the best from Synera.</p>
          <div className="info-list">
            <div><h2 className="section-title">Daily workflow</h2><p className="body-text">Start in Dashboard, check today’s plan, then log Fitness + Nutrition + Wellness.</p></div>
            <div><h2 className="section-title">Data sync</h2><p className="body-text">Your onboarding, profile, and daily data are saved to your account and restored on login.</p></div>
            <div><h2 className="section-title">Food logging</h2><p className="body-text">Use Nutrition → Log Food → Food database search to autofill calories and macros.</p></div>
          </div>
        </section>
      </div>
    </main>
  );
}
