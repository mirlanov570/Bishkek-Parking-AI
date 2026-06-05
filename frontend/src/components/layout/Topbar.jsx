import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../common/Button';
import ThemeModeSwitch from '../common/ThemeModeSwitch';

const getUserDisplayName = (user) =>
  user?.full_name || user?.fullName || user?.login || user?.email || 'User';

function Topbar({ pageTitle, onOpenMobileMenu }) {
  const navigate = useNavigate();
  const { user, isAdmin, isDriver, logout } = useAuth();
  const { language, languages, setLanguage, t } = useLanguage();

  const roleLabel = isAdmin
    ? t('auth.admin')
    : isDriver
      ? t('auth.driver')
      : t('auth.unknownRole');

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          type="button"
          className="topbar__mobile-menu-button"
          onClick={onOpenMobileMenu}
          aria-label={t('menu.open')}
        >
          <span aria-hidden="true">☰</span>
        </button>

        <div className="topbar__title-block">
          <h1>{pageTitle}</h1>
        </div>
      </div>

      <div className="topbar__right">
        <ThemeModeSwitch className="topbar__theme-switch" />

        <label className="language-select">
          <span>{t('common.language')}</span>

          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            {languages.map((item) => (
              <option key={item.code} value={item.code}>
                {item.shortLabel}
              </option>
            ))}
          </select>
        </label>

        <div className="topbar__user">
          <div className="topbar__avatar" aria-hidden="true">
            {getUserDisplayName(user).slice(0, 1).toUpperCase()}
          </div>

          <div className="topbar__user-info">
            <strong>{getUserDisplayName(user)}</strong>
            <span>{roleLabel}</span>
          </div>
        </div>

        <Button className="topbar__logout-button" variant="secondary" size="sm" onClick={handleLogout}>
          {t('auth.logout')}
        </Button>
      </div>
    </header>
  );
}

export default Topbar;