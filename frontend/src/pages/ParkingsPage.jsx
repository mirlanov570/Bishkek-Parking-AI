import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAllParkings } from '../api/parkingsApi';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';
import Loader from '../components/common/Loader';
import PageHeader from '../components/common/PageHeader';
import ParkingCard from '../components/parkings/ParkingCard';
import ParkingDetailsModal from '../components/parkings/ParkingDetailsModal';
import ParkingTable from '../components/parkings/ParkingTable';
import { useLanguage } from '../context/LanguageContext';
import { getApiErrorMessage } from '../utils/apiErrors';
import { formatNumber, formatPercent } from '../utils/formatters';
import { getLoadLevel } from '../utils/loadStatus';

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const normalizeSearchText = (value) => String(value || '').trim().toLowerCase();

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

const getBadgeVariantByLoadLevel = (level) => {
  if (level === 'high') return 'danger';
  if (level === 'medium') return 'warning';
  return 'success';
};

function ParkingMetric({ label, value, hint, variant = 'neutral' }) {
  return (
    <Card className={`parkings-metric-card parkings-metric-card--${variant}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </Card>
  );
}

function ParkingsPage() {
  const { t } = useLanguage();

  const [parkings, setParkings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadFilter, setLoadFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards');
  const [selectedParking, setSelectedParking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadParkings = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await getAllParkings();
      setParkings(extractItems(response));
    } catch (requestError) {
      setParkings([]);
      setError(getApiErrorMessage(requestError, t('parkings.loadError')));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadParkings();
  }, [loadParkings]);

  const filteredParkings = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);

    return parkings.filter((parking) => {
      const name = normalizeSearchText(parking.name);
      const address = normalizeSearchText(parking.address);

      const matchesSearch =
        !normalizedQuery || name.includes(normalizedQuery) || address.includes(normalizedQuery);

      const parkingLoadLevel = getParkingLoadLevel(parking);
      const matchesLoadFilter = loadFilter === 'all' || parkingLoadLevel === loadFilter;

      const isActive = parking.is_active !== false;
      const matchesStatusFilter =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesSearch && matchesLoadFilter && matchesStatusFilter;
    });
  }, [parkings, searchQuery, loadFilter, statusFilter]);

  const summary = useMemo(() => {
    const active = parkings.filter((parking) => parking.is_active !== false);
    const inactive = parkings.length - active.length;
    const totalPlaces = parkings.reduce((sum, parking) => sum + toNumber(parking.total_places), 0);
    const freePlaces = parkings.reduce((sum, parking) => sum + toNumber(parking.free_places), 0);
    const occupiedPlaces = parkings.reduce(
      (sum, parking) => sum + toNumber(parking.occupied_places),
      0,
    );

    const averageLoad =
      parkings.length > 0
        ? parkings.reduce((sum, parking) => sum + calculateLoadPercentage(parking), 0) /
          parkings.length
        : 0;

    const loadCounts = parkings.reduce(
      (acc, parking) => {
        const level = getParkingLoadLevel(parking);
        acc[level] += 1;
        return acc;
      },
      {
        low: 0,
        medium: 0,
        high: 0,
      },
    );

    return {
      total: parkings.length,
      active: active.length,
      inactive,
      totalPlaces,
      freePlaces,
      occupiedPlaces,
      averageLoad,
      loadCounts,
    };
  }, [parkings]);

  const filteredAverageLoad = useMemo(() => {
    if (filteredParkings.length === 0) return 0;

    return (
      filteredParkings.reduce((sum, parking) => sum + calculateLoadPercentage(parking), 0) /
      filteredParkings.length
    );
  }, [filteredParkings]);

  const hasActiveFilters = Boolean(searchQuery) || loadFilter !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setLoadFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="page-stack parkings-page parkings-page--glass">
      <PageHeader
        title={t('parkings.title')}
        subtitle={t('parkings.subtitle')}
        badge={t('parkings.liveBadge')}
        actions={
          <Button variant="secondary" onClick={loadParkings} isLoading={isLoading}>
            {t('parkings.refresh')}
          </Button>
        }
      />

      <section className="parkings-hero">
        <div className="parkings-hero__content">
          <Badge variant={getBadgeVariantByLoadLevel(getLoadLevel(summary.averageLoad))}>
            {t(`parkings.filters.${getLoadLevel(summary.averageLoad)}`)}
          </Badge>

          <div>
            <h2>Парковочные объекты</h2>
            <p>
              Список подключен к backend и показывает актуальные свободные места, загруженность,
              зоны, историю и быстрый запрос “Ищу место”.
            </p>
          </div>

          <div className={`parkings-hero-load parkings-hero-load--${getLoadLevel(summary.averageLoad)}`}>
            <div>
              <span>{t('parkings.loadPercentage')}</span>
              <strong>{formatPercent(summary.averageLoad)}</strong>
            </div>
            <div className="parkings-hero-load__bar">
              <span style={{ width: `${Math.min(Math.max(summary.averageLoad, 0), 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="parkings-hero__metrics">
          <ParkingMetric
            label={t('parkings.totalFound')}
            value={formatNumber(summary.total)}
            hint={`${t('parkings.active')}: ${formatNumber(summary.active)}`}
            variant="info"
          />
          <ParkingMetric
            label={t('parkings.freePlaces')}
            value={formatNumber(summary.freePlaces)}
            hint={`${t('parkings.totalPlaces')}: ${formatNumber(summary.totalPlaces)}`}
            variant="success"
          />
          <ParkingMetric
            label={t('parkings.occupiedPlaces')}
            value={formatNumber(summary.occupiedPlaces)}
            hint={`${t('parkings.inactive')}: ${formatNumber(summary.inactive)}`}
            variant="warning"
          />
        </div>
      </section>

      <section className="parkings-toolbar">
        <label className="parkings-search">
          <span>{t('common.search')}</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('parkings.searchPlaceholder')}
          />
        </label>

        <label className="parkings-filter">
          <span>{t('parkings.loadFilter')}</span>
          <select value={loadFilter} onChange={(event) => setLoadFilter(event.target.value)}>
            <option value="all">{t('parkings.filters.all')}</option>
            <option value="low">{t('parkings.filters.low')}</option>
            <option value="medium">{t('parkings.filters.medium')}</option>
            <option value="high">{t('parkings.filters.high')}</option>
          </select>
        </label>

        <label className="parkings-filter">
          <span>{t('common.status')}</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">{t('parkings.filters.all')}</option>
            <option value="active">{t('parkings.active')}</option>
            <option value="inactive">{t('parkings.inactive')}</option>
          </select>
        </label>

        <div className="parkings-view-toggle" role="group" aria-label={t('parkings.viewMode')}>
          <button
            type="button"
            className={
              viewMode === 'cards'
                ? 'parkings-view-toggle__button active'
                : 'parkings-view-toggle__button'
            }
            onClick={() => setViewMode('cards')}
          >
            {t('parkings.cardsView')}
          </button>

          <button
            type="button"
            className={
              viewMode === 'table'
                ? 'parkings-view-toggle__button active'
                : 'parkings-view-toggle__button'
            }
            onClick={() => setViewMode('table')}
          >
            {t('parkings.tableView')}
          </button>
        </div>
      </section>

      <section className="parkings-summary">
        <Badge variant="info">
          {t('parkings.totalFound')}: {formatNumber(filteredParkings.length)}
        </Badge>
        <Badge variant="success">
          {t('parkings.filters.low')}: {formatNumber(summary.loadCounts.low)}
        </Badge>
        <Badge variant="warning">
          {t('parkings.filters.medium')}: {formatNumber(summary.loadCounts.medium)}
        </Badge>
        <Badge variant="danger">
          {t('parkings.filters.high')}: {formatNumber(summary.loadCounts.high)}
        </Badge>
        <Badge variant={getBadgeVariantByLoadLevel(getLoadLevel(filteredAverageLoad))}>
          {t('parkings.loadPercentage')}: {formatPercent(filteredAverageLoad)}
        </Badge>
      </section>

      {hasActiveFilters && (
        <div className="parkings-filter-note">
          <span>Фильтры применены к списку парковок.</span>
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            {t('common.reset')}
          </Button>
        </div>
      )}

      {error && (
        <ErrorMessage
          title={t('parkings.loadErrorTitle')}
          message={error}
          action={
            <Button variant="secondary" onClick={loadParkings}>
              {t('common.retry')}
            </Button>
          }
        />
      )}

      {isLoading ? (
        <div className="parkings-loader-card">
          <Loader text={t('parkings.loading')} />
        </div>
      ) : !error && filteredParkings.length === 0 ? (
        <EmptyState
          title={t('parkings.emptyTitle')}
          description={t('parkings.emptyDescription')}
          icon="P"
          action={
            <Button variant="secondary" onClick={resetFilters}>
              {t('common.reset')}
            </Button>
          }
        />
      ) : !error && viewMode === 'cards' ? (
        <section className="parkings-grid">
          {filteredParkings.map((parking) => (
            <ParkingCard key={parking.id} parking={parking} onOpenDetails={setSelectedParking} />
          ))}
        </section>
      ) : !error ? (
        <ParkingTable parkings={filteredParkings} onOpenDetails={setSelectedParking} />
      ) : null}

      <ParkingDetailsModal
        parking={selectedParking}
        isOpen={Boolean(selectedParking)}
        onClose={() => setSelectedParking(null)}
      />
    </div>
  );
}

export default ParkingsPage;