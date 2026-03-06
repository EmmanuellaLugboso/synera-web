import Link from "next/link";
import "./hub-shell.css";

export default function HubShell({ title, subtitle, emoji, rightMeta, topActions, children, className = "" }) {
  return (
    <div className={`hub-shell ${className}`.trim()}>
      <div className="hub-shell__topbar">
        <Link href="/dashboard" className="hub-shell__back">← Back</Link>
        {topActions ? <div className="hub-shell__actions">{topActions}</div> : null}
      </div>

      <div className="hub-shell__hero">
        <div>
          <h1 className="hub-shell__title">
            {title}
            {emoji ? <span className="hub-shell__emoji">{emoji}</span> : null}
          </h1>
          {subtitle ? <p className="hub-shell__subtitle">{subtitle}</p> : null}
        </div>
        {rightMeta ? <div className="hub-shell__meta">{rightMeta}</div> : null}
      </div>

      <div className="hub-shell__content">{children}</div>
    </div>
  );
}
