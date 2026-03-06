import Link from "next/link";

export default function BackButton({ href = "/dashboard", label = "Back", className = "" }) {
  return (
    <Link href={href} className={`back-button ${className}`.trim()}>
      <span aria-hidden>←</span>
      <span>{label}</span>
    </Link>
  );
}
