import Sidebar from './Sidebar';
import { useLanguage } from '../../context/LanguageContext';

function MobileNav({ isOpen, onClose }) {
  const { t } = useLanguage();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="mobile-nav" role="dialog" aria-modal="true" aria-label={t('menu.navigation') || 'Navigation'}>
      <button
        type="button"
        className="mobile-nav__overlay"
        onClick={onClose}
        aria-label={t('menu.close')}
      />

      <div className="mobile-nav__panel">
        <div className="mobile-nav__header">
          <div>
            <strong>{t('app.shortName')}</strong>
            <span>Bishkek Parking</span>
          </div>

          <button
            type="button"
            className="modal-close-button mobile-nav__close"
            onClick={onClose}
            aria-label={t('menu.close')}
            title={t('menu.close')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M6 6L18 18" />
              <path d="M18 6L6 18" />
            </svg>
            <span className="modal-close-button__label">{t('menu.close')}</span>
          </button>
        </div>

        <Sidebar isMobile onNavigate={onClose} />
      </div>
    </div>
  );
}

export default MobileNav;