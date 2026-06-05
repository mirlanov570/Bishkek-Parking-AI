import { useCallback, useMemo, useState } from 'react';
import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import { getParkingNearbyObjects } from '../../api/nearbyObjectsApi';
import Button from '../common/Button';
import ParkingRequestButton from '../parkings/ParkingRequestButton';
import { useLanguage } from '../../context/LanguageContext';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { formatNumber, formatPercent } from '../../utils/formatters';
import {
  formatObjectSchedule,
  getNearbyObjectTypeLabel,
  getZoneTypeLabel,
} from '../../utils/infrastructure';
import { getLoadColor, getLoadLevel } from '../../utils/loadStatus';

const getParkingPosition = (parking) => [Number(parking.latitude), Number(parking.longitude)];

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const getParkingLoadLevel = (parking) => {
  const loadColor = String(parking?.load_color || '').toLowerCase();

  if (loadColor === 'green') return 'low';
  if (loadColor === 'yellow') return 'medium';
  if (loadColor === 'red') return 'high';

  return getLoadLevel(parking?.load_level || parking?.load_percentage);
};

const calculateLoadPercentage = (parking) => {
  if (parking?.load_percentage !== null && parking?.load_percentage !== undefined) {
    return Number(parking.load_percentage);
  }

  const occupiedPlaces = Number(parking?.occupied_places);
  const totalPlaces = Number(parking?.total_places);

  if (!Number.isFinite(occupiedPlaces) || !Number.isFinite(totalPlaces) || totalPlaces <= 0) {
    return 0;
  }

  return Math.min(Math.max((occupiedPlaces / totalPlaces) * 100, 0), 100);
};

const createParkingIcon = (color) =>
  L.divIcon({
    className: '',
    html: `
      <span class="parking-map-marker parking-map-marker--${color}">
        <span>P</span>
      </span>
    `,
    iconSize: [42, 48],
    iconAnchor: [21, 46],
    popupAnchor: [0, -38],
  });

function ParkingMarker({ parking, onOpenDetails }) {
  const { t } = useLanguage();

  const [nearbyObjects, setNearbyObjects] = useState([]);
  const [isNearbyLoading, setIsNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const [isNearbyLoaded, setIsNearbyLoaded] = useState(false);

  const loadLevel = getParkingLoadLevel(parking);
  const loadColor = getLoadColor(parking?.load_color || loadLevel);
  const loadPercentage = calculateLoadPercentage(parking);

  const icon = useMemo(() => createParkingIcon(loadColor), [loadColor]);

  const activeObjectsWeight = useMemo(
    () => nearbyObjects.reduce((sum, item) => sum + Number(item.influence_weight || 0), 0),
    [nearbyObjects],
  );

  const visibleObjects = useMemo(() => nearbyObjects.slice(0, 3), [nearbyObjects]);

  const loadNearbyObjects = useCallback(async () => {
    if (isNearbyLoaded || isNearbyLoading || !parking?.id) return;

    setIsNearbyLoading(true);
    setNearbyError('');

    try {
      const response = await getParkingNearbyObjects(parking.id, {
        limit: 20,
        offset: 0,
        only_active: true,
      });

      setNearbyObjects(extractItems(response));
      setIsNearbyLoaded(true);
    } catch (requestError) {
      setNearbyObjects([]);
      setNearbyError(getApiErrorMessage(requestError, 'Не удалось загрузить инфраструктуру.'));
    } finally {
      setIsNearbyLoading(false);
    }
  }, [isNearbyLoaded, isNearbyLoading, parking?.id]);

  return (
    <Marker
      position={getParkingPosition(parking)}
      icon={icon}
      eventHandlers={{
        popupopen: loadNearbyObjects,
      }}
    >
      <Popup minWidth={310} maxWidth={380}>
        <article className="parking-map-popup">
          <header className="parking-map-popup__header">
            <div className="parking-map-popup__badges">
              <span className={`parking-map-popup__status parking-map-popup__status--${loadLevel}`}>
                {t(`parkings.filters.${loadLevel}`)}
              </span>
              <span className="parking-map-popup__zone">
                {getZoneTypeLabel(parking.zone_type)}
              </span>
            </div>

            <h3>{parking.name || t('common.unknown')}</h3>
            <p>{parking.address || '—'}</p>
          </header>

          <div className="parking-map-popup__load">
            <div>
              <span>{t('parkings.loadPercentage')}</span>
              <strong>{formatPercent(loadPercentage)}</strong>
            </div>
            <div className={`parking-map-popup__bar parking-map-popup__bar--${loadLevel}`}>
              <span style={{ width: `${Math.min(Math.max(loadPercentage, 0), 100)}%` }} />
            </div>
          </div>

          <div className="parking-map-popup__stats">
            <div>
              <span>{t('parkings.freePlaces')}</span>
              <strong>{formatNumber(parking.free_places)}</strong>
            </div>
            <div>
              <span>{t('parkings.occupiedPlaces')}</span>
              <strong>{formatNumber(parking.occupied_places)}</strong>
            </div>
            <div>
              <span>{t('parkings.totalPlaces')}</span>
              <strong>{formatNumber(parking.total_places)}</strong>
            </div>
          </div>

          <section className="parking-map-popup__infrastructure">
            <div className="parking-map-popup__infrastructure-header">
              <div>
                <span>Инфраструктура</span>
                <strong>{formatNumber(nearbyObjects.length)} объектов рядом</strong>
              </div>
              <small>вес {activeObjectsWeight.toFixed(2)}</small>
            </div>

            {isNearbyLoading ? (
              <p>Загружаем объекты рядом...</p>
            ) : nearbyError ? (
              <p>{nearbyError}</p>
            ) : visibleObjects.length > 0 ? (
              <div className="parking-map-popup__objects">
                {visibleObjects.map((item) => (
                  <div key={item.id} className="parking-map-popup__object">
                    <span>{getNearbyObjectTypeLabel(item.object_type)}</span>
                    <strong>{item.name}</strong>
                    <small>{formatObjectSchedule(item)}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p>Объекты рядом не указаны.</p>
            )}
          </section>

          <div className="parking-map-popup__actions">
            <Button variant="secondary" fullWidth onClick={() => onOpenDetails(parking)}>
              {t('parkings.details')}
            </Button>
            <ParkingRequestButton parking={parking} fullWidth />
          </div>
        </article>
      </Popup>
    </Marker>
  );
}

export default ParkingMarker;