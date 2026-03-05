export default function InlineAlert({ type = "error", children }) {
  if (!children) return null;
  const role = type === "error" ? "alert" : "status";
  return (
    <div className={`inline-alert inline-alert--${type}`} role={role} aria-live="polite">
      {children}
    </div>
  );
}
