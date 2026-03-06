export default function SectionCard({ title, subtitle, right, children, className = "" }) {
  return (
    <section className={`hub-section-card ${className}`.trim()}>
      {(title || subtitle || right) ? (
        <header className="hub-section-card__head">
          <div>
            {title ? <h2 className="hub-section-card__title">{title}</h2> : null}
            {subtitle ? <p className="hub-section-card__subtitle">{subtitle}</p> : null}
          </div>
          {right ? <div>{right}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
