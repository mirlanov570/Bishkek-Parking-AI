function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
  variant = 'default',
}) {
  const classes = ['card', `card--${variant}`, className].filter(Boolean).join(' ');

  return (
    <article className={classes}>
      {(title || subtitle || actions) && (
        <header className="card__header">
          <div className="card__heading">
            {title && <h2 className="card__title">{title}</h2>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>

          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}

      {children && <div className="card__body">{children}</div>}
    </article>
  );
}

export default Card;