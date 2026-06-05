import { useLanguage } from '../../context/LanguageContext';
import { normalizeApiError } from '../../utils/apiErrors';

function ErrorMessage({ title, message, error, action }) {
  const { t } = useLanguage();
  const normalizedError = error ? normalizeApiError(error) : null;

  const displayTitle = title || normalizedError?.title || t('common.error');
  const displayMessage = message || normalizedError?.message;
  const status = normalizedError?.status ? `HTTP ${normalizedError.status}` : null;
  const code = normalizedError?.code && normalizedError.code !== 'API_ERROR' ? normalizedError.code : null;
  const meta = [status, code].filter(Boolean).join(' / ');

  return (
    <div className="error-message" role="alert">
      <div className="error-message__icon" aria-hidden="true">
        !
      </div>

      <div className="error-message__content">
        <strong>{displayTitle}</strong>
        {displayMessage && <p>{displayMessage}</p>}
        {meta && <p className="error-message__meta">{meta}</p>}
        {action && <div className="error-message__action">{action}</div>}
      </div>
    </div>
  );
}

export default ErrorMessage;