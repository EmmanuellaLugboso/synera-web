import BackButton from "../BackButton";
import "./hub-shell.css";

export default function HubShell({ title, subtitle, emoji, topActions, children, className = "" }) {
  return (
    <div className={`hub-shell ${className}`.trim()}>
      <div className="hub-shell__topbar">
        <BackButton href="/dashboard" label="Back" className="hub-shell__back" />
        {topActions ? <div className="hub-shell__actions">{topActions}</div> : null}
      </div>

      <div className="hub-shell__hero">
        <div>
          <h1 className="hub-shell__title page-title">
            {title}
            {emoji ? <span className="hub-shell__emoji">{emoji}</span> : null}
          </h1>
          {subtitle ? <p className="hub-shell__subtitle body-text">{subtitle}</p> : null}
        </div>
      </div>

      <div className="hub-shell__content">{children}</div>
    </div>
  );
}
