function PageHeader({ title, subtitle, badge, actions }) {
  return (
    <header className="page-header">
      <div className="page-header__content">
        {badge && <span className="page-header__badge">{badge}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>

      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

export default PageHeader;