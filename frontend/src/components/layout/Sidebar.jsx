import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const navigationItems = [
  {
    to: '/dashboard',
    labelKey: 'menu.dashboard',
    icon: '⌂',
    end: true,
  },
  {
    to: '/map',
    labelKey: 'menu.map',
    icon: '⌖',
  },
  {
    to: '/parkings',
    labelKey: 'menu.parkings',
    icon: 'P',
  },
  {
    to: '/my-requests',
    labelKey: 'menu.myRequests',
    icon: '≡',
  },
  {
    to: '/analytics',
    labelKey: 'menu.analytics',
    icon: '◔',
  },
  {
    to: '/predictions',
    labelKey: 'menu.predictions',
    icon: '↗',
  },
  {
    to: '/recommendations',
    labelKey: 'menu.recommendations',
    icon: '★',
  },
  {
    to: '/admin',
    labelKey: 'menu.admin',
    icon: '⚙',
    adminOnly: true,
  },
];

function Sidebar({ isCollapsed = false, onToggleCollapse, onNavigate, isMobile = false }) {
  const { isAdmin } = useAuth();
  const { language, t } = useLanguage();

  const availableItems = navigationItems.filter((item) => !item.adminOnly || isAdmin);

  const getItemLabel = (item) => {
    if (item.labelKey) return t(item.labelKey);
    if (item.labels) return item.labels[language] || item.labels.ru;
    return item.label || item.to;
  };

  const sidebarClassName = [
    'sidebar',
    isCollapsed ? 'sidebar--collapsed' : '',
    isMobile ? 'sidebar--mobile' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={sidebarClassName} aria-label={t('menu.navigation') || 'Navigation'}>
      <div className="sidebar__brand">
        <div className="sidebar__logo" aria-hidden="true">
          P
        </div>

        <div className="sidebar__brand-text">
          <strong>{t('app.shortName')}</strong>
          <span>Bishkek Parking</span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Main navigation">
        {availableItems.map((item) => {
          const itemLabel = getItemLabel(item);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={itemLabel}
              className={({ isActive }) =>
                isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'
              }
              onClick={onNavigate}
            >
              <span className="sidebar__icon" aria-hidden="true">
                {item.icon}
              </span>

              <span className="sidebar__label">{itemLabel}</span>
            </NavLink>
          );
        })}
      </nav>

      {!isMobile && (
        <button
          type="button"
          className="sidebar__collapse-button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? t('menu.expand') : t('menu.collapse')}
          title={isCollapsed ? t('menu.expand') : t('menu.collapse')}
        >
          <span className="sidebar__icon" aria-hidden="true">
            {isCollapsed ? '→' : '←'}
          </span>

          <span className="sidebar__label">
            {isCollapsed ? t('menu.expand') : t('menu.collapse')}
          </span>
        </button>
      )}
    </aside>
  );
}

export default Sidebar;