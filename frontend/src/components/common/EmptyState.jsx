import { useLanguage } from '../../context/LanguageContext';
import Badge from './Badge';

function EmptyState({ title, description, icon = 'P', action }) {
  const { t } = useLanguage();

  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        {icon}
      </div>

      <Badge variant="neutral" className="empty-state__badge">
        {t('common.placeholder')}
      </Badge>

      <h2>{title}</h2>

      {description && <p>{description}</p>}

      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

export default EmptyState;