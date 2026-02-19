"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const path = usePathname();

  const tabs = [
    { href: "/dashboard", label: "Home", icon: HomeIcon },
    { href: "/fitness", label: "Fitness", icon: FitnessIcon },
    { href: "/nutrition", label: "Nutrition", icon: NutritionIcon },
    { href: "/sleep", label: "Sleep", icon: SleepIcon },
    { href: "/lifestyle", label: "Life", icon: LifestyleIcon },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const Active = path === tab.href;
        const Icon = tab.icon;

        return (
          <Link key={tab.href} href={tab.href} className="nav-item">
            <Icon active={Active} />
            {Active && <span className="nav-label">{tab.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
