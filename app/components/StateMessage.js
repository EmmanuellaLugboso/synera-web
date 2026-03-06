export default function StateMessage({ children }) {
  if (!children) return null;
  return (
    <div className="state-message" role="status" aria-live="polite">
      <span className="state-message-dot" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
