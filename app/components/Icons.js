export function HomeIcon({ active }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={active ? "#F7A8C4" : "#F7A8C4"}
      strokeWidth={active ? "2.5" : "1.7"}
      strokeLinecap="round" strokeLinejoin="round"
      className={active ? "icon-active" : "icon"}
    >
      <path d="M3 10.5L12 3l9 7.5v9A1.5 1.5 0 0 1 19.5 22h-15A1.5 1.5 0 0 1 3 19.5v-9z"/>
    </svg>
  );
}

export function FitnessIcon({ active }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={active ? "#F7A8C4" : "#F7A8C4"}
      strokeWidth={active ? "2.5" : "1.7"}
      strokeLinecap="round" strokeLinejoin="round"
      className={active ? "icon-active" : "icon"}
    >
      <path d="M6 14v-4M18 14v-4M9 17v-10M15 17v-10M3 12h18"/>
    </svg>
  );
}

export function NutritionIcon({ active }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={active ? "#F7A8C4" : "#F7A8C4"}
      strokeWidth={active ? "2.5" : "1.7"}
      strokeLinecap="round" strokeLinejoin="round"
      className={active ? "icon-active" : "icon"}
    >
      <path d="M3 10c0 6 5 10 9 10s9-4 9-10H3z"/>
      <path d="M12 4v3"/>
      <path d="M8 6c0 .5 1 2 4 2s4-1.5 4-2"/>
    </svg>
  );
}

export function SleepIcon({ active }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={active ? "#F7A8C4" : "#F7A8C4"}
      strokeWidth={active ? "2.5" : "1.7"}
      strokeLinecap="round" strokeLinejoin="round"
      className={active ? "icon-active" : "icon"}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3
      7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

export function LifestyleIcon({ active }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={active ? "#F7A8C4" : "#F7A8C4"}
      strokeWidth={active ? "2.5" : "1.7"}
      strokeLinecap="round" strokeLinejoin="round"
      className={active ? "icon-active" : "icon"}
    >
      <path d="M12 21s6-4.35 6-9A6 6 0 0 0 6 12c0 4.65 6 9 6 9z"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  );
}
