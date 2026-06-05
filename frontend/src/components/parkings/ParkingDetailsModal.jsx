import { useCallback, useEffect, useMemo, useState } from 'react';
import { getParking, getParkingHistory } from '../../api/parkingsApi';
import { getParkingNearbyObjects } from '../../api/nearbyObjectsApi';
import { getParkingZones } from '../../api/parkingZonesApi';
import { useLanguage } from '../../context/LanguageContext';
import { formatDateTime, formatNumber, formatPercent } from '../../utils/formatters';
import { getLoadLevel } from '../../utils/loadStatus';
import {
  formatObjectSchedule,
  getNearbyObjectTypeLabel,
  getZoneTypeLabel,
} from '../../utils/infrastructure';
import Badge from '../common/Badge';
import Button from '../common/Button';
import ErrorMessage from '../common/ErrorMessage';
import Loader from '../common/Loader';
import LoadProgress from './LoadProgress';
import ParkingRequestButton from './ParkingRequestButton';

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

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

const getParkingStatusLabel = (t, parking) =>
  parking?.is_active === false ? t('parkings.inactive') : t('parkings.active');

function DetailMetric({ label, value, tone = 'neutral' }) {
  return (
    <div className={`parking-detail-metric parking-detail-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="parking-details__info-item">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

function ParkingDetailsModal({ parking, isOpen, onClose }) {
  const { t } = useLanguage();

  const [parkingDetails, setParkingDetails] = useState(null);
  const [zones, setZones] = useState([]);
  const [history, setHistory] = useState([]);
  const [nearbyObjects, setNearbyObjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [optionalWarning, setOptionalWarning] = useState('');

  const parkingId = parking?.id;

  const loadDetails = useCallback(async () => {
    if (!parkingId) return;

    setIsLoading(true);
    setError('');
    setOptionalWarning('');

    try {
      const [detailsResult, zonesResult, historyResult, nearbyObjectsResult] = await Promise.allSettled([
        getParking(parkingId),
        getParkingZones(parkingId, { limit: 50, offset: 0 }),
        getParkingHistory(parkingId, { limit: 6, offset: 0 }),
        getParkingNearbyObjects(parkingId, { limit: 100, offset: 0, only_active: true }),
      ]);

      if (detailsResult.status === 'rejected') {
        throw detailsResult.reason;
      }

      setParkingDetails(detailsResult.value);

      const optionalErrors = [];

      if (zonesResult.status === 'fulfilled') {
        setZones(extractItems(zonesResult.value));
      } else {
        setZones([]);
        optionalErrors.push(t('parkings.zones'));
      }

      if (historyResult.status === 'fulfilled') {
        setHistory(extractItems(historyResult.value));
      } else {
        setHistory([]);
        optionalErrors.push(t('parkings.history'));
      }

      if (nearbyObjectsResult.status === 'fulfilled') {
        setNearbyObjects(extractItems(nearbyObjectsResult.value));
      } else {
        setNearbyObjects([]);
        optionalErrors.push('инфраструктура');
      }

      if (optionalErrors.length > 0) {
        setOptionalWarning(`${t('parkings.optionalLoadWarning')}: ${optionalErrors.join(', ')}.`);
      }
    } catch (requestError) {
      setParkingDetails(null);
      setZones([]);
      setHistory([]);
      setNearbyObjects([]);
      setError(
        requestError?.apiError?.detail ||
          requestError?.response?.data?.detail ||
          requestError?.message ||
          t('parkings.detailsError'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [parkingId, t]);

  useEffect(() => {
    if (isOpen) {
      loadDetails();
      document.body.classList.add('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, loadDetails]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const currentParking = parkingDetails || parking;

  const loadPercentage = useMemo(() => calculateLoadPercentage(currentParking), [currentParking]);
  const loadLevel = useMemo(() => getParkingLoadLevel(currentParking), [currentParking]);
  const badgeVariant = getBadgeVariantByLoadLevel(loadLevel);

  if (!isOpen || !parking) return null;

  return (
    <div className="parking-modal parking-modal--modern" role="dialog" aria-modal="true">
      <button
        type="button"
        className="parking-modal__overlay"
        onClick={onClose}
        aria-label={t('common.close')}
      />

      <section className="parking-modal__panel parking-modal__panel--modern">
        <header className="parking-modal__header parking-modal__header--modern">
          <div className="parking-modal__title-wrap">
            <div className={`parking-modal__icon parking-modal__icon--${loadLevel}`} aria-hidden="true">
              P
            </div>

            <div className="parking-modal__title-content">
              <div className="parking-modal__badges">
                <Badge variant={badgeVariant}>{getLoadText(t, loadLevel)}</Badge>
              </div>

              <h2>{currentParking?.name || t('parkings.parking')}</h2>
              <p>{currentParking?.address || '—'}</p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-button parking-modal__close"
            onClick={onClose}
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M6 6L18 18" />
              <path d="M18 6L6 18" />
            </svg>
            <span className="modal-close-button__label">{t('common.close')}</span>
          </button>
        </header>

        <div className="parking-modal__body parking-modal__body--modern">
          {isLoading ? (
            <div className="parking-modal__loader">
              <Loader text={t('parkings.loadingDetails')} />
            </div>
          ) : error ? (
            <ErrorMessage
              title={t('parkings.detailsErrorTitle')}
              message={error}
              action={
                <Button variant="secondary" onClick={loadDetails}>
                  {t('common.retry')}
                </Button>
              }
            />
          ) : (
            <div className="parking-details parking-details--modern">
              {optionalWarning && (
                <ErrorMessage title={t('parkings.partialDataTitle')} message={optionalWarning} />
              )}

              <section className={`parking-details__hero parking-details__hero--${loadLevel}`}>
                <div className="parking-details__hero-main">
                  <span className="parking-details__eyebrow">{t('parkings.loadPercentage')}</span>
                  <strong>{formatPercent(loadPercentage)}</strong>
                  <p>{getLoadText(t, loadLevel)}</p>

                  <LoadProgress
                    value={loadPercentage}
                    level={loadLevel}
                    label={t('parkings.loadPercentage')}
                    statusLabel={getLoadText(t, loadLevel)}
                  />
                </div>

                <div className="parking-details__hero-side">
                  <DetailMetric
                    label={t('parkings.freePlaces')}
                    value={formatNumber(currentParking?.free_places)}
                    tone="success"
                  />
                  <DetailMetric
                    label={t('parkings.occupiedPlaces')}
                    value={formatNumber(currentParking?.occupied_places)}
                    tone="warning"
                  />
                  <DetailMetric
                    label={t('parkings.totalPlaces')}
                    value={formatNumber(currentParking?.total_places)}
                    tone="info"
                  />
                </div>

                <div className="parking-details__hero-action">
                  <ParkingRequestButton parking={currentParking} fullWidth />
                </div>
              </section>

              <section className="parking-details__grid">
                <InfoItem
                  label={t('parkings.coordinates')}
                  value={`${currentParking?.latitude || '—'}, ${currentParking?.longitude || '—'}`}
                />
                <InfoItem label={t('parkings.workingHours')} value={currentParking?.working_hours} />
                <InfoItem label="Тип зоны" value={getZoneTypeLabel(currentParking?.zone_type)} />
                <InfoItem label={t('common.status')} value={getParkingStatusLabel(t, currentParking)} />
              </section>

              <section className="parking-details__description">
                <h3>{t('parkings.description')}</h3>
                <p>{currentParking?.description || t('parkings.noDescription')}</p>
              </section>

              <section className="parking-details__section parking-details__section--infrastructure">
                <div className="parking-details__section-header">
                  <div>
                    <span>ML infrastructure</span>
                    <h3>Инфраструктура рядом</h3>
                  </div>
                  <Badge variant="info">{nearbyObjects.length}</Badge>
                </div>

                {nearbyObjects.length > 0 ? (
                  <div className="parking-nearby-objects">
                    {nearbyObjects.map((item) => (
                      <article key={item.id} className="parking-nearby-object">
                        <div>
                          <Badge variant="neutral">{getNearbyObjectTypeLabel(item.object_type)}</Badge>
                          <strong>{item.name}</strong>
                          <span>{formatObjectSchedule(item)}</span>
                        </div>
                        <div>
                          <small>{formatNumber(item.distance_m)} м</small>
                          <small>вес {Number(item.influence_weight || 0).toFixed(2)}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="parking-details__empty">Объекты рядом не указаны.</p>
                )}
              </section>

              <section className="parking-details__section">
                <div className="parking-details__section-header">
                  <div>
                    <span>{t('parkings.zones')}</span>
                    <h3>{t('parkings.zones')}</h3>
                  </div>
                  <Badge variant="neutral">{zones.length}</Badge>
                </div>

                {zones.length > 0 ? (
                  <div className="parking-zones">
                    {zones.map((zone) => {
                      const zoneLoadPercentage = calculateLoadPercentage(zone);
                      const zoneLevel = getParkingLoadLevel(zone);

                      return (
                        <div key={zone.id} className="parking-zone-card">
                          <div className="parking-zone-card__header">
                            <div>
                              <strong>{zone.name || `Zone #${zone.id}`}</strong>
                              <span>
                                {formatNumber(zone.free_places)} / {formatNumber(zone.total_places)}{' '}
                                {t('parkings.freeShort').toLowerCase()}
                              </span>
                            </div>

                            <Badge variant={getBadgeVariantByLoadLevel(zoneLevel)}>
                              {getLoadText(t, zoneLevel)}
                            </Badge>
                          </div>

                          <LoadProgress
                            value={zoneLoadPercentage}
                            level={zoneLevel}
                            label={getLoadText(t, zoneLevel)}
                            statusLabel={formatPercent(zoneLoadPercentage)}
                            compact
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="parking-details__empty">{t('parkings.noZones')}</p>
                )}
              </section>

              <section className="parking-details__section">
                <div className="parking-details__section-header">
                  <div>
                    <h3>{t('parkings.history')}</h3>
                  </div>
                  <Badge variant="neutral">{history.length}</Badge>
                </div>

                {history.length > 0 ? (
                  <div className="parking-history">
                    {history.map((item) => {
                      const historyLoadPercentage = calculateLoadPercentage(item);
                      const historyLevel = getParkingLoadLevel(item);

                      return (
                        <div key={item.id} className="parking-history__item">
                          <div>
                            <strong>{formatDateTime(item.recorded_at || item.created_at)}</strong>
                          </div>

                          <Badge variant={getBadgeVariantByLoadLevel(historyLevel)}>
                            {getLoadText(t, historyLevel)}
                          </Badge>

                          <span>
                            {formatNumber(item.occupied_places)} / {formatNumber(item.total_places)}
                          </span>

                          <small>{formatPercent(historyLoadPercentage)}</small>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="parking-details__empty">{t('parkings.noHistory')}</p>
                )}
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default ParkingDetailsModal;