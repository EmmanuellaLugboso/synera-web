"use client";
import "./ring.css";

export default function Ring({ size = 120, stroke = 12, progress = 0, color = "#F7A8C9", label, value }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = ((100 - progress) / 100) * circumference;

  return (
    <div className="ring-wrapper">
      <svg width={size} height={size}>
        <circle
          className="ring-bg"
          stroke="#FFE4F0"
          fill="transparent"
          strokeWidth={stroke}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />

        <circle
          className="ring-progress"
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: "stroke-dashoffset 1.2s ease",
          }}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>

      <div className="ring-center">
        <p className="ring-value">{value}</p>
        <p className="ring-label">{label}</p>
      </div>
    </div>
  );
}
