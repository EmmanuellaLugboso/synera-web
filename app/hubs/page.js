"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { useOnboarding } from "../context/OnboardingContext";
import "./hub.css";
import BackButton from "../components/BackButton";

const HUBS = [
  { href: "/hubs/fitness", title: "Fitness", sub: "Strength, cardio, steps, body metrics" },
  { href: "/hubs/nutrition", title: "Nutrition", sub: "Food logs, hydration, recipes, supplements" },
  { href: "/hubs/mind-sleep", title: "Mind & Sleep", sub: "Journal, check-ins, sleep insights" },
  { href: "/hubs/lifestyle", title: "Lifestyle", sub: "Habits, routines, goals, discipline score" },
  { href: "/hubs/profile", title: "Profile", sub: "Account details and photo" },
];

export default function HubsIndexPage() {
  const router = useRouter();
  const { user } = useOnboarding();

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  return (
    <div className="hub-page" data-testid="hubs-page">
      <div className="hub-topbar">
        <BackButton href="/dashboard" label="Dashboard" className="back-link" />
        {user ? <button type="button" className="ghost-btn" onClick={handleLogout}>Logout</button> : null}
      </div>
      <div className="hub-hero">
        <div>
          <h1 className="hub-title">All Hubs <span className="hub-emoji">🌸</span></h1>
          <p className="hub-sub">Choose your lane and keep momentum.</p>
        </div>
      </div>
      <div className="stats-grid">
        {HUBS.map((hub) => (
          <Link key={hub.href} href={hub.href} className="stat-card" style={{ textDecoration: "none" }}>
            <div className="stat-top"><span className="stat-label">{hub.title}</span><span className="stat-chip">Open</span></div>
            <div className="stat-sub">{hub.sub}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
