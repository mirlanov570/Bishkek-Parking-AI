import Button from '../common/Button';
import Loader from '../common/Loader';
import { useLanguage } from '../../context/LanguageContext';

function ChartCard({
  title,
  subtitle,
  badge,
  actions,
  isLoading = false,
  error = '',
  empty = false,
  emptyTitle,
  emptyDescription,
  onRetry,
  children,
  className = '',
}) {
  const { t } = useLanguage();
  const cardClasses = ['chart-card', className].filter(Boolean).join(' ');

  return (
    <article className={cardClasses}>
      <header className="chart-card__header">
        <div>
          {badge && <span className="chart-card__badge">{badge}</span>}
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>

        {actions && <div className="chart-card__actions">{actions}</div>}
      </header>

      <div className="chart-card__body">
        {isLoading && (
          <div className="chart-card__state">
            <Loader />
          </div>
        )}

        {!isLoading && error && (
          <div className="chart-card__state chart-card__state--error">
            <strong>{error}</strong>
            {onRetry && (
              <Button variant="ghost" size="sm" onClick={onRetry}>
                {t('common.retry')}
              </Button>
            )}
          </div>
        )}

        {!isLoading && !error && empty && (
          <div className="chart-card__state chart-card__state--empty">
            <strong>{emptyTitle}</strong>
            {emptyDescription && <p>{emptyDescription}</p>}
            {onRetry && (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                {t('common.retry')}
              </Button>
            )}
          </div>
        )}

        {!isLoading && !error && !empty && <div className="chart-card__canvas">{children}</div>}
      </div>
    </article>
  );
}

export default ChartCard;