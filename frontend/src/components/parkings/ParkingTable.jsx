import Badge from '../common/Badge';
import Button from '../common/Button';
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

function ParkingTable({ parkings, onOpenDetails }) {
  const { t } = useLanguage();

  return (
    <div className="parking-table-wrapper">
      <table className="parking-table">
        <thead>
          <tr>
            <th>{t('parkings.table.parking')}</th>
            <th>{t('parkings.table.places')}</th>
            <th>{t('parkings.table.load')}</th>
            <th>Тип зоны</th>
            <th>{t('parkings.coordinates')}</th>
            <th>{t('parkings.table.status')}</th>
            <th>{t('parkings.table.actions')}</th>
          </tr>
        </thead>

        <tbody>
          {parkings.map((parking) => {
            const loadPercentage = calculateLoadPercentage(parking);
            const loadLevel = getParkingLoadLevel(parking);
            const isInactive = parking.is_active === false;

            return (
              <tr key={parking.id} className={isInactive ? 'parking-table__row--disabled' : ''}>
                <td>
                  <strong>{parking.name || t('parkings.parking')}</strong>
                  <span>{parking.address || '—'}</span>
                </td>

                <td>
                  <span>
                    {t('parkings.freeShort')}: <strong>{formatNumber(parking.free_places)}</strong>
                  </span>
                  <span>
                    {t('parkings.totalShort')}: <strong>{formatNumber(parking.total_places)}</strong>
                  </span>
                </td>

                <td>
                  <LoadProgress
                    value={loadPercentage}
                    level={loadLevel}
                    label={getLoadText(t, loadLevel)}
                    statusLabel={formatPercent(loadPercentage)}
                    compact
                  />
                </td>

                <td>
                  <Badge variant="info">{getZoneTypeLabel(parking.zone_type)}</Badge>
                  <span>{parking.zone_type || 'mixed'}</span>
                </td>

                <td>
                  <span>{parking.latitude || '—'}</span>
                  <span>{parking.longitude || '—'}</span>
                </td>

                <td>
                  <Badge variant={isInactive ? 'neutral' : getBadgeVariantByLoadLevel(loadLevel)}>
                    {isInactive ? t('parkings.inactive') : getLoadText(t, loadLevel)}
                  </Badge>
                </td>

                <td>
                  <div className="parking-table__actions">
                    <Button variant="secondary" size="sm" onClick={() => onOpenDetails(parking)}>
                      {t('parkings.details')}
                    </Button>
                    <ParkingRequestButton parking={parking} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ParkingTable;