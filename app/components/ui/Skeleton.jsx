export default function Skeleton({ className = "", lines = 3 }) {
  return (
    <div className={`ui-skeleton ${className}`.trim()} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} className="ui-skeleton__line" />
      ))}
    </div>
  );
}
