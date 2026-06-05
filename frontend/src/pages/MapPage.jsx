import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAllParkings } from '../api/parkingsApi';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';
import Loader from '../components/common/Loader';
import PageHeader from '../components/common/PageHeader';
import MapLegend from '../components/map/MapLegend';
import ParkingMap from '../components/map/ParkingMap';
import ParkingDetailsModal from '../components/parkings/ParkingDetailsModal';
import { useLanguage } from '../context/LanguageContext';
import { getApiErrorMessage } from '../utils/apiErrors';
import { formatNumber, formatPercent } from '../utils/formatters';
import { getZoneTypeLabel, ZONE_TYPE_OPTIONS } from '../utils/infrastructure';
import { getLoadLevel } from '../utils/loadStatus';

const MAP_TEXT = {
  ru: {
    subtitle:
      'Интерактивная карта активных парковок Бишкека: свободные места, загрузка и быстрый запрос “Ищу место”.',
    badge: 'Leaflet / OpenStreetMap',
    refresh: 'Обновить карту',
    loading: 'Загружаем парковки для карты...',
    loadErrorTitle: 'Не удалось загрузить карту парковок',
    loadError: 'Backend недоступен или список парковок не получен.',
    searchPlaceholder: 'Поиск по названию или адресу...',
    loadFilter: 'Загруженность',
    zoneFilter: 'Тип зоны',
    allLoads: 'Все уровни',
    allZones: 'Все зоны',
    activeParkings: 'Активные парковки',
    shownOnMap: 'На карте',
    withoutCoordinates: 'Без координат',
    averageLoad: 'Средняя загрузка',
    freePlaces: 'Свободные места',
    myLocation: 'Мое местоположение',
    updateLocation: 'Обновить местоположение',
    clearLocation: 'Убрать геолокацию',
    geoUnsupported: 'Ваш браузер не поддерживает геолокацию.',
    geoDenied: 'Доступ к геолокации запрещен. Карта продолжит работать без вашего местоположения.',
    geoUnavailable: 'Не удалось определить местоположение. Проверьте разрешения браузера и интернет.',
    geoTimeout: 'Время ожидания геолокации истекло. Попробуйте еще раз.',
    geoReady: 'Местоположение показано на карте.',
    emptyTitle: 'Парковки на карте не найдены',
    emptyDescription: 'Попробуйте сбросить фильтр, изменить поиск или создать demo data через админ-панель.',
    resetFilters: 'Сбросить фильтры',
    listTitle: 'Парковки на карте',
    listSubtitle: 'Нажмите на парковку, чтобы открыть детали.',
    noCoordinatesTitle: 'У части парковок нет координат',
    noCoordinatesText: 'Они есть в списке backend, но не отображаются на карте без latitude/longitude.',
    details: 'Детали',
    loadLow: 'Свободно',
    loadMedium: 'Средняя загрузка',
    loadHigh: 'Высокая загрузка',
  },
  ky: {
    subtitle:
      'Бишкектин активдүү парковкаларынын интерактивдүү картасы: бош орундар, жүктөм жана тез өтүнмө.',
    badge: 'Leaflet / OpenStreetMap',
    refresh: 'Картаны жаңыртуу',
    loading: 'Карта үчүн парковкалар жүктөлүүдө...',
    loadErrorTitle: 'Парковкалар картасы жүктөлгөн жок',
    loadError: 'Backend жеткиликсиз же парковкалар тизмеси алынган жок.',
    searchPlaceholder: 'Аталышы же дареги боюнча издөө...',
    loadFilter: 'Жүктөм',
    zoneFilter: 'Зонанын түрү',
    allLoads: 'Бардык деңгээлдер',
    allZones: 'Бардык зоналар',
    activeParkings: 'Активдүү парковкалар',
    shownOnMap: 'Картада',
    withoutCoordinates: 'Координатасыз',
    averageLoad: 'Орточо жүктөм',
    freePlaces: 'Бош орундар',
    myLocation: 'Менин жайгашкан жерим',
    updateLocation: 'Жайгашкан жерди жаңыртуу',
    clearLocation: 'Геолокацияны алып салуу',
    geoUnsupported: 'Браузериңиз геолокацияны колдобойт.',
    geoDenied: 'Геолокацияга уруксат берилген жок. Карта сиздин жайгашкан жериңизсиз иштей берет.',
    geoUnavailable: 'Жайгашкан жерди аныктоо мүмкүн болгон жок.',
    geoTimeout: 'Геолокацияны күтүү убактысы бүттү. Кайра аракет кылыңыз.',
    geoReady: 'Жайгашкан жериңиз картада көрсөтүлдү.',
    emptyTitle: 'Картада парковкалар табылган жок',
    emptyDescription: 'Фильтрди тазалап, издөөнү өзгөртүп же demo data түзүп көрүңүз.',
    resetFilters: 'Фильтрлерди тазалоо',
    listTitle: 'Картадагы парковкалар',
    listSubtitle: 'Деталдарды ачуу үчүн парковканы басыңыз.',
    noCoordinatesTitle: 'Кээ бир парковкаларда координат жок',
    noCoordinatesText: 'Алар backend тизмесинде бар, бирок latitude/longitude жок картада көрүнбөйт.',
    details: 'Деталдар',
    loadLow: 'Бош',
    loadMedium: 'Орточо жүктөм',
    loadHigh: 'Жогорку жүктөм',
  },
  en: {
    subtitle:
      'Interactive map of active Bishkek parkings: free places, load level and quick “Find a place” request.',
    badge: 'Leaflet / OpenStreetMap',
    refresh: 'Refresh map',
    loading: 'Loading parkings for the map...',
    loadErrorTitle: 'Could not load parking map',
    loadError: 'Backend is unavailable or the parking list was not received.',
    searchPlaceholder: 'Search by name or address...',
    loadFilter: 'Load',
    zoneFilter: 'Zone type',
    allLoads: 'All levels',
    allZones: 'All zones',
    activeParkings: 'Active parkings',
    shownOnMap: 'On map',
    withoutCoordinates: 'Without coordinates',
    averageLoad: 'Average load',
    freePlaces: 'Free places',
    myLocation: 'My location',
    updateLocation: 'Update location',
    clearLocation: 'Remove geolocation',
    geoUnsupported: 'Your browser does not support geolocation.',
    geoDenied: 'Geolocation access was denied. The map will keep working without your location.',
    geoUnavailable: 'Could not determine your location. Check browser permissions and internet connection.',
    geoTimeout: 'Geolocation request timed out. Try again.',
    geoReady: 'Your location is shown on the map.',
    emptyTitle: 'No parkings found on the map',
    emptyDescription: 'Try resetting the filter, changing the search, or creating demo data in the admin panel.',
    resetFilters: 'Reset filters',
    listTitle: 'Parkings on map',
    listSubtitle: 'Click a parking to open details.',
    noCoordinatesTitle: 'Some parkings have no coordinates',
    noCoordinatesText: 'They exist in the backend list but cannot be shown on the map without latitude/longitude.',
    details: 'Details',
    loadLow: 'Low load',
    loadMedium: 'Medium load',
    loadHigh: 'High load',
  },
};

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

const normalizeSearchText = (value) => String(value || '').trim().toLowerCase();

const hasValidCoordinates = (parking) => {
  const latitude = Number(parking?.latitude);
  const longitude = Number(parking?.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
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
    return toNumber(parking.load_percentage);
  }

  const occupiedPlaces = toNumber(parking?.occupied_places);
  const totalPlaces = toNumber(parking?.total_places);

  if (totalPlaces <= 0) return 0;

  return Math.min(Math.max((occupiedPlaces / totalPlaces) * 100, 0), 100);
};

const getLoadLabel = (text, level) => {
  if (level === 'high') return text.loadHigh;
  if (level === 'medium') return text.loadMedium;
  return text.loadLow;
};

const getBadgeVariantByLoadLevel = (level) => {
  if (level === 'high') return 'danger';
  if (level === 'medium') return 'warning';
  return 'success';
};

function MapMetric({ label, value, hint, variant = 'neutral' }) {
  return (
    <Card className={`map-metric-card map-metric-card--${variant}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </Card>
  );
}

function MapPage() {
  const { t, language } = useLanguage();
  const text = MAP_TEXT[language] || MAP_TEXT.ru;

  const [parkings, setParkings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadFilter, setLoadFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [selectedParking, setSelectedParking] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [geoMessage, setGeoMessage] = useState('');
  const [geoError, setGeoError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');

  const loadParkings = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await getAllParkings();
      const items = extractItems(response).filter((parking) => parking?.is_active !== false);
      setParkings(items);
    } catch (requestError) {
      setParkings([]);
      setError(getApiErrorMessage(requestError, text.loadError));
    } finally {
      setIsLoading(false);
    }
  }, [text.loadError]);

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

      const loadLevel = getParkingLoadLevel(parking);
      const matchesLoadFilter = loadFilter === 'all' || loadLevel === loadFilter;
      const matchesZoneFilter = zoneFilter === 'all' || parking.zone_type === zoneFilter;

      return matchesSearch && matchesLoadFilter && matchesZoneFilter;
    });
  }, [parkings, searchQuery, loadFilter, zoneFilter]);

  const parkingsWithCoordinates = useMemo(
    () => filteredParkings.filter((parking) => hasValidCoordinates(parking)),
    [filteredParkings],
  );

  const parkingsWithoutCoordinates = filteredParkings.length - parkingsWithCoordinates.length;

  const averageLoad = useMemo(() => {
    if (filteredParkings.length === 0) return 0;

    const totalLoad = filteredParkings.reduce(
      (sum, parking) => sum + calculateLoadPercentage(parking),
      0,
    );

    return totalLoad / filteredParkings.length;
  }, [filteredParkings]);

  const totalFreePlaces = useMemo(
    () => filteredParkings.reduce((sum, parking) => sum + toNumber(parking.free_places), 0),
    [filteredParkings],
  );

  const loadCounts = useMemo(
    () =>
      filteredParkings.reduce(
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
      ),
    [filteredParkings],
  );

  const topParkings = useMemo(
    () =>
      [...parkingsWithCoordinates]
        .sort((a, b) => calculateLoadPercentage(b) - calculateLoadPercentage(a))
        .slice(0, 8),
    [parkingsWithCoordinates],
  );

  const handleLocateUser = () => {
    setGeoMessage('');
    setGeoError('');

    if (!navigator.geolocation) {
      setGeoError(text.geoUnsupported);
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });

        setGeoMessage(text.geoReady);
        setIsLocating(false);
      },
      (locationError) => {
        if (locationError.code === locationError.PERMISSION_DENIED) {
          setGeoError(text.geoDenied);
        } else if (locationError.code === locationError.TIMEOUT) {
          setGeoError(text.geoTimeout);
        } else {
          setGeoError(text.geoUnavailable);
        }

        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  const resetFilters = () => {
    setSearchQuery('');
    setLoadFilter('all');
    setZoneFilter('all');
  };

  return (
    <div className="page-stack map-page map-page--glass">
      <PageHeader
        title={t('map.title')}
        subtitle={text.subtitle}
        badge={text.badge}
        actions={
          <Button variant="secondary" onClick={loadParkings} isLoading={isLoading}>
            {text.refresh}
          </Button>
        }
      />

      <section className="map-hero">
        <div className="map-hero__content">
          <Badge variant={getBadgeVariantByLoadLevel(getLoadLevel(averageLoad))}>
            {getLoadLabel(text, getLoadLevel(averageLoad))}
          </Badge>

          <div>
            <h2>Карта парковок Бишкека</h2>
            <p>
              Цвет маркера показывает текущую загруженность. В popup теперь видно тип зоны,
              объекты рядом и их влияние на прогноз.
            </p>
          </div>
        </div>

        <div className="map-hero__metrics">
          <MapMetric
            label={text.activeParkings}
            value={formatNumber(filteredParkings.length)}
            hint={`${text.shownOnMap}: ${formatNumber(parkingsWithCoordinates.length)}`}
            variant="info"
          />
          <MapMetric
            label={text.freePlaces}
            value={formatNumber(totalFreePlaces)}
            hint={text.freePlaces}
            variant="success"
          />
          <MapMetric
            label={text.averageLoad}
            value={formatPercent(averageLoad)}
            hint={getLoadLabel(text, getLoadLevel(averageLoad))}
            variant={getBadgeVariantByLoadLevel(getLoadLevel(averageLoad))}
          />
        </div>
      </section>

      <section className="map-toolbar map-toolbar--infrastructure">
        <label className="map-toolbar__search">
          <span>{t('common.search')}</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={text.searchPlaceholder}
          />
        </label>

        <label className="map-toolbar__filter">
          <span>{text.loadFilter}</span>
          <select value={loadFilter} onChange={(event) => setLoadFilter(event.target.value)}>
            <option value="all">{text.allLoads}</option>
            <option value="low">{t('parkings.filters.low')}</option>
            <option value="medium">{t('parkings.filters.medium')}</option>
            <option value="high">{t('parkings.filters.high')}</option>
          </select>
        </label>

        <label className="map-toolbar__filter">
          <span>{text.zoneFilter}</span>
          <select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
            <option value="all">{text.allZones}</option>
            {ZONE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="map-toolbar__actions">
          <Button variant="ghost" onClick={handleLocateUser} isLoading={isLocating}>
            {userLocation ? text.updateLocation : text.myLocation}
          </Button>

          {userLocation && (
            <Button
              variant="secondary"
              onClick={() => {
                setUserLocation(null);
                setGeoMessage('');
                setGeoError('');
              }}
            >
              {text.clearLocation}
            </Button>
          )}

          {(searchQuery || loadFilter !== 'all' || zoneFilter !== 'all') && (
            <Button variant="secondary" onClick={resetFilters}>
              {text.resetFilters}
            </Button>
          )}
        </div>
      </section>

      <section className="map-summary">
        <Badge variant="success">
          {t('parkings.filters.low')}: {formatNumber(loadCounts.low)}
        </Badge>
        <Badge variant="warning">
          {t('parkings.filters.medium')}: {formatNumber(loadCounts.medium)}
        </Badge>
        <Badge variant="danger">
          {t('parkings.filters.high')}: {formatNumber(loadCounts.high)}
        </Badge>
        {zoneFilter !== 'all' && (
          <Badge variant="info">
            {text.zoneFilter}: {getZoneTypeLabel(zoneFilter)}
          </Badge>
        )}
        {parkingsWithoutCoordinates > 0 && (
          <Badge variant="neutral">
            {text.withoutCoordinates}: {formatNumber(parkingsWithoutCoordinates)}
          </Badge>
        )}
      </section>

      {geoError && <ErrorMessage title={t('common.error')} message={geoError} />}
      {geoMessage && <p className="map-geolocation-message">{geoMessage}</p>}

      {error && (
        <ErrorMessage
          title={text.loadErrorTitle}
          message={error}
          action={
            <Button variant="secondary" onClick={loadParkings}>
              {t('common.retry')}
            </Button>
          }
        />
      )}

      {isLoading ? (
        <div className="map-loader-card">
          <Loader text={text.loading} />
        </div>
      ) : !error && filteredParkings.length === 0 ? (
        <EmptyState
          title={text.emptyTitle}
          description={text.emptyDescription}
          icon="⌖"
          action={
            <Button variant="secondary" onClick={resetFilters}>
              {text.resetFilters}
            </Button>
          }
        />
      ) : !error ? (
        <section className="map-layout">
          <div className="map-main-panel">
            <ParkingMap
              parkings={parkingsWithCoordinates}
              userLocation={userLocation}
              onOpenDetails={setSelectedParking}
            />
            <MapLegend />
          </div>

          <aside className="map-side-panel">
            <div className="map-side-panel__header">
              <div>
                <h2>{text.listTitle}</h2>
                <p>{text.listSubtitle}</p>
              </div>
              <Badge variant="info">{formatNumber(topParkings.length)}</Badge>
            </div>

            {parkingsWithoutCoordinates > 0 && (
              <div className="map-warning-card">
                <strong>{text.noCoordinatesTitle}</strong>
                <p>{text.noCoordinatesText}</p>
              </div>
            )}

            <div className="map-parking-list">
              {topParkings.length > 0 ? (
                topParkings.map((parking) => {
                  const level = getParkingLoadLevel(parking);
                  const loadPercentage = calculateLoadPercentage(parking);

                  return (
                    <button
                      type="button"
                      key={parking.id}
                      className="map-parking-row"
                      onClick={() => setSelectedParking(parking)}
                    >
                      <div className={`map-parking-row__marker map-parking-row__marker--${level}`}>
                        P
                      </div>

                      <div className="map-parking-row__content">
                        <strong>{parking.name || t('common.unknown')}</strong>
                        <span>{parking.address || '—'}</span>

                        <div className="map-parking-row__meta">
                          <Badge variant={getBadgeVariantByLoadLevel(level)}>
                            {getLoadLabel(text, level)}
                          </Badge>
                          <Badge variant="info">{getZoneTypeLabel(parking.zone_type)}</Badge>
                          <small>{formatPercent(loadPercentage)}</small>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="map-card-empty">{text.emptyTitle}</p>
              )}
            </div>
          </aside>
        </section>
      ) : null}

      <ParkingDetailsModal
        parking={selectedParking}
        isOpen={Boolean(selectedParking)}
        onClose={() => setSelectedParking(null)}
      />
    </div>
  );
}

export default MapPage;