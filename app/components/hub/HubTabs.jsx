export default function HubTabs({ children, className = "" }) {
  return <div className={`hub-tabs ${className}`.trim()}>{children}</div>;
}
