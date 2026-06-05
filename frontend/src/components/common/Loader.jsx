import { useLanguage } from '../../context/LanguageContext';

function Loader({ text, fullPage = false }) {
  const { t } = useLanguage();

  return (
    <div className={fullPage ? 'loader loader--full-page' : 'loader'} role="status" aria-live="polite">
      <span className="loader__spinner" aria-hidden="true" />
      <span className="loader__text">{text || t('common.loading')}</span>
    </div>
  );
}

export default Loader;