import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import MobileNav from './MobileNav';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const pageTitleKeys = [
  {
    path: '/dashboard',
    titleKey: 'dashboard.title',
  },
  {
    path: '/map',
    titleKey: 'map.title',
  },
  {
    path: '/parkings',
    titleKey: 'parkings.title',
  },
  {
    path: '/my-requests',
    titleKey: 'requests.title',
  },
  {
    path: '/analytics',
    titleKey: 'analytics.title',
  },
  {
    path: '/predictions',
    titleKey: 'predictions.title',
  },
  {
    path: '/recommendations',
    titleKey: 'recommendations.title',
  },
  {
    path: '/admin',
    titleKey: 'admin.title',
  },
];

function DashboardLayout() {
  const location = useLocation();
  const { language, t } = useLanguage();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const pageTitle = useMemo(() => {
    const currentItem = pageTitleKeys.find((item) =>
      item.path === '/admin'
        ? location.pathname.startsWith('/admin')
        : location.pathname === item.path,
    );

    if (!currentItem) return t('app.name');
    if (currentItem.titleKey) return t(currentItem.titleKey);
    if (currentItem.titles) return currentItem.titles[language] || currentItem.titles.ru;

    return t('app.name');
  }, [language, location.pathname, t]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  const layoutClassName = isSidebarCollapsed
    ? 'app-layout app-layout--collapsed'
    : 'app-layout';

  return (
    <div className={layoutClassName} data-sidebar-collapsed={isSidebarCollapsed ? 'true' : 'false'}>
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((currentValue) => !currentValue)}
      />

      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <div className="app-layout__main">
        <Topbar pageTitle={pageTitle} onOpenMobileMenu={() => setIsMobileNavOpen(true)} />

        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;