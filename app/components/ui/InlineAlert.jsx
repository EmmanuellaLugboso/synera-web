export default function InlineAlert({ type = "error", children }) {
  if (!children) return null;
  const isError = type === "error";
  return (
    <div
      className={`ui-alert ui-alert--${type}`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      {children}
    </div>
  );
}
