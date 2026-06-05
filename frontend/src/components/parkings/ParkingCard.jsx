import Badge from '../common/Badge';
import Button from '../common/Button';
import Card from '../common/Card';
import { useLanguage } from '../../context/LanguageContext';
import { formatNumber, formatPercent } from '../../utils/formatters';
import { getLoadLevel } from '../../utils/loadStatus';
import { getZoneTypeLabel } from '../../utils/infrastructure';
import LoadProgress from './LoadProgress';
import ParkingRequestButton from './ParkingRequestButton';

const toNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const calculateLoadPercentage = (parking) => {
  if (parking?.load_percentage !== null && parking?.load_percentage !== undefined) {
    return toNumber(parking.load_percentage);
  }

  const totalPlaces = toNumber(parking?.total_places);
  const occupiedPlaces = toNumber(parking?.occupied_places);

  if (totalPlaces <= 0) return 0;

  return Math.min(Math.max((occupiedPlaces / totalPlaces) * 100, 0), 100);
};

const getParkingLoadLevel = (parking) => {
  const loadColor = String(parking?.load_color || '').toLowerCase();

  if (loadColor === 'green') return 'low';
  if (loadColor === 'yellow') return 'medium';
  if (loadColor === 'red') return 'high';

  return getLoadLevel(parking?.load_level || calculateLoadPercentage(parking));
};

const getLoadText = (t, level) => t(`parkings.filters.${level}`);

const getBadgeVariantByLoadLevel = (level) => {
  if (level === 'high') return 'danger';
  if (level === 'medium') return 'warning';
  return 'success';
};

function ParkingCard({ parking, onOpenDetails }) {
  const { t } = useLanguage();

  const loadPercentage = calculateLoadPercentage(parking);
  const loadLevel = getParkingLoadLevel(parking);
  const isInactive = parking?.is_active === false;
  const hasCoordinates = parking?.latitude !== null && parking?.longitude !== null;

  return (
    <Card className={isInactive ? 'parking-card parking-card--disabled' : 'parking-card'}>
      <div className="parking-card__top">
        <div className={`parking-card__icon parking-card__icon--${loadLevel}`} aria-hidden="true">
          P
        </div>

        <div>
          <div className="parking-card__title-row">
            <h2>{parking.name || t('parkings.parking')}</h2>
            <Badge variant={isInactive ? 'neutral' : 'success'}>
              {isInactive ? t('parkings.inactive') : t('parkings.active')}
            </Badge>
          </div>

          <p>{parking.address || '—'}</p>
        </div>
      </div>

      <div className="parking-card__badges">
        <Badge variant={getBadgeVariantByLoadLevel(loadLevel)}>{getLoadText(t, loadLevel)}</Badge>
        <Badge variant="info">{getZoneTypeLabel(parking.zone_type)}</Badge>
        <Badge variant="neutral">{formatPercent(loadPercentage)}</Badge>
        {hasCoordinates && <Badge variant="info">{t('parkings.coordinates')}</Badge>}
      </div>

      <LoadProgress
        value={loadPercentage}
        level={loadLevel}
        label={t('parkings.loadPercentage')}
        statusLabel={getLoadText(t, loadLevel)}
      />

      <div className="parking-card__stats">
        <div>
          <span>{t('parkings.totalPlaces')}</span>
          <strong>{formatNumber(parking.total_places)}</strong>
        </div>
        <div>
          <span>{t('parkings.freePlaces')}</span>
          <strong>{formatNumber(parking.free_places)}</strong>
        </div>
        <div>
          <span>{t('parkings.occupiedPlaces')}</span>
          <strong>{formatNumber(parking.occupied_places)}</strong>
        </div>
      </div>

      <div className="parking-card__actions">
        <Button variant="secondary" fullWidth onClick={() => onOpenDetails(parking)}>
          {t('parkings.details')}
        </Button>
        <ParkingRequestButton parking={parking} fullWidth />
      </div>
    </Card>
  );
}

export default ParkingCard;