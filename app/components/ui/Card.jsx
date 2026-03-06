export function Card({ className = "", children, ...props }) {
  return (
    <section className={`ui-card ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ className = "", children, ...props }) {
  return (
    <div className={`ui-card__header ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className = "", children, ...props }) {
  return (
    <div className={`ui-card__body ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
