"use client";

import Link from "next/link";
import "./home.css";

export default function Home() {
  return (
    <main className="heroWrap">

      {/* LEFT CONTENT */}
      <section className="heroLeft">
        <div className="brandRow">
          <div className="brandIcon">✿</div>
          <h1 className="brandName">Synera</h1>
        </div>

        <h2 className="heroHeadline">
          Your wellness.<br />Fully organised.
        </h2>

        <p className="heroSub">
          Track fitness, nutrition, mind and sleep with clean dashboards,
          real progress tracking, and zero clutter.
        </p>

        <div className="heroActions">
          <Link href="/signup" className="btnPrimary">
            Get Started
          </Link>

          <Link href="/login" className="btnGhost">
            Sign In
          </Link>
        </div>

        <div className="heroPoints">
          <span>✔ Personalised Fitness</span>
          <span>✔ Smart Nutrition</span>
          <span>✔ Mind & Sleep Insights</span>
        </div>
      </section>

      {/* RIGHT VISUAL PANEL */}
      <section className="heroRight">
        <div className="dashboardMock">

          <div className="mockHeader">
            <span className="dot pink"></span>
            <span className="dot gray"></span>
            <span className="dot gray"></span>
          </div>

          <div className="mockStats">
            <div className="mockCard">
              <p>Steps</p>
              <h3>8,420</h3>
              <div className="mockBar">
                <div className="fill" style={{ width: "75%" }} />
              </div>
            </div>

            <div className="mockCard">
              <p>Calories</p>
              <h3>1,320</h3>
              <div className="mockBar">
                <div className="fill" style={{ width: "60%" }} />
              </div>
            </div>

            <div className="mockCard">
              <p>Water</p>
              <h3>2.1L</h3>
              <div className="mockBar">
                <div className="fill" style={{ width: "70%" }} />
              </div>
            </div>

            <div className="mockCard">
              <p>Sleep</p>
              <h3>7h 18m</h3>
              <div className="mockBar">
                <div className="fill" style={{ width: "80%" }} />
              </div>
            </div>
          </div>

        </div>
      </section>

    </main>
  );
}
