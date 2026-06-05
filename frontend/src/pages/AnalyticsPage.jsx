import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getDailyLoad,
  getDashboard,
  getParkingLoad,
  getPeakHours,
  getPopularParkings,
  getWeekdaysVsWeekends,
} from '../api/analyticsApi';
import { getAllParkings } from '../api/parkingsApi';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import ErrorMessage from '../components/common/ErrorMessage';
import PageHeader from '../components/common/PageHeader';
import BarChartCard from '../components/charts/BarChartCard';
import DoughnutChartCard from '../components/charts/DoughnutChartCard';
import LineChartCard from '../components/charts/LineChartCard';
import { useLanguage } from '../context/LanguageContext';
import { formatDate, formatDateTime, formatNumber, formatPercent } from '../utils/formatters';
import { getLoadLevel } from '../utils/loadStatus';

const DEFAULT_DASHBOARD_SUMMARY = {
  parkingCount: 0,
  totalPlaces: 0,
  freePlaces: 0,
  occupiedPlaces: 0,
  averageLoadPercentage: 0,
  requestsCount: 0,
  activeUsersCount: 0,
  predictionsCount: 0,
  recommendationsCount: 0,
  unreadNotificationsCount: 0,
};

const POPULAR_LIMIT_OPTIONS = [5, 10, 15, 20];

const CHART_COLORS = {
  primary: '#2563eb',
  primarySoft: 'rgba(37, 99, 235, 0.18)',
  green: '#16a34a',
  greenSoft: 'rgba(22, 163, 74, 0.18)',
  yellow: '#f59e0b',
  yellowSoft: 'rgba(245, 158, 11, 0.2)',
  red: '#dc2626',
  redSoft: 'rgba(220, 38, 38, 0.18)',
};

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? fallback : numericValue;
};

const pickNumber = (source, keys, fallback = 0) => {
  const foundKey = keys.find((key) => source?.[key] !== undefined && source?.[key] !== null);
  return foundKey ? toNumber(source[foundKey], fallback) : fallback;
};

const pickString = (source, keys, fallback = '') => {
  const foundKey = keys.find((key) => source?.[key] !== undefined && source?.[key] !== null);
  return foundKey ? String(source[foundKey]) : fallback;
};

const cleanParkingDisplayName = (name, fallback = 'Парковка') =>
  String(name || fallback)
    .replace(/^Demo Parking\s*[—-]\s*/i, '')
    .trim() || fallback;

const getErrorText = (error, fallback) =>
  error?.apiError?.detail || error?.response?.data?.detail || error?.message || fallback;

const clampPercent = (value) => Math.min(Math.max(toNumber(value), 0), 100);

const getBarColorByLoad = (value) => {
  const loadLevel = getLoadLevel(value);

  if (loadLevel === 'high') return CHART_COLORS.red;
  if (loadLevel === 'medium') return CHART_COLORS.yellow;

  return CHART_COLORS.green;
};

const getSoftColorByLoad = (value) => {
  const loadLevel = getLoadLevel(value);

  if (loadLevel === 'high') return CHART_COLORS.redSoft;
  if (loadLevel === 'medium') return CHART_COLORS.yellowSoft;

  return CHART_COLORS.greenSoft;
};

const normalizeDashboardSummary = (payload) => ({
  parkingCount: pickNumber(payload, ['parking_count', 'parkingCount', 'parkings_count']),
  totalPlaces: pickNumber(payload, ['total_places', 'totalPlaces', 'places_count']),
  freePlaces: pickNumber(payload, ['free_places', 'freePlaces', 'available_places']),
  occupiedPlaces: pickNumber(payload, ['occupied_places', 'occupiedPlaces', 'busy_places']),
  averageLoadPercentage: pickNumber(payload, [
    'average_load_percentage',
    'averageLoadPercentage',
    'avg_load_percentage',
    'load_percentage',
  ]),
  requestsCount: pickNumber(payload, ['requests_count', 'requestsCount', 'parking_requests_count']),
  activeUsersCount: pickNumber(payload, ['active_users_count', 'activeUsersCount']),
  predictionsCount: pickNumber(payload, ['predictions_count', 'predictionsCount']),
  recommendationsCount: pickNumber(payload, ['recommendations_count', 'recommendationsCount']),
  unreadNotificationsCount: pickNumber(payload, [
    'unread_notifications_count',
    'unreadNotificationsCount',
  ]),
});

const normalizePopularParking = (item) => ({
  parkingId: pickNumber(item, ['parking_id', 'parkingId', 'id']),
  parkingName: cleanParkingDisplayName(pickString(item, ['parking_name', 'parkingName', 'name'], 'Парковка')),
  requestCount: pickNumber(item, ['request_count', 'requestCount', 'requests_count', 'count']),
});

const normalizePeakHour = (item) => ({
  hour: pickNumber(item, ['hour', 'parking_hour']),
  averageLoadPercentage: pickNumber(item, [
    'average_load_percentage',
    'averageLoadPercentage',
    'avg_load_percentage',
  ]),
  recordsCount: pickNumber(item, ['records_count', 'recordsCount']),
});

const normalizeDailyLoad = (item) => ({
  day: pickString(item, ['day', 'date', 'recorded_date']),
  averageLoadPercentage: pickNumber(item, [
    'average_load_percentage',
    'averageLoadPercentage',
    'avg_load_percentage',
  ]),
  minLoadPercentage: pickNumber(item, [
    'min_load_percentage',
    'minLoadPercentage',
    'minimum_load_percentage',
  ]),
  maxLoadPercentage: pickNumber(item, [
    'max_load_percentage',
    'maxLoadPercentage',
    'maximum_load_percentage',
  ]),
  recordsCount: pickNumber(item, ['records_count', 'recordsCount']),
});

const normalizeWeekdayVsWeekend = (item) => ({
  dayType: pickString(item, ['day_type', 'dayType', 'type']),
  averageLoadPercentage: pickNumber(item, [
    'average_load_percentage',
    'averageLoadPercentage',
    'avg_load_percentage',
  ]),
  recordsCount: pickNumber(item, ['records_count', 'recordsCount']),
});

const normalizeParkingLoadPoint = (item) => ({
  parkingId: pickNumber(item, ['parking_id', 'parkingId']),
  zoneId: item?.zone_id ?? item?.zoneId ?? null,
  totalPlaces: pickNumber(item, ['total_places', 'totalPlaces']),
  occupiedPlaces: pickNumber(item, ['occupied_places', 'occupiedPlaces']),
  freePlaces: pickNumber(item, ['free_places', 'freePlaces']),
  loadPercentage: pickNumber(item, ['load_percentage', 'loadPercentage']),
  loadLevel: pickString(item, ['load_level', 'loadLevel']),
  loadColor: pickString(item, ['load_color', 'loadColor']),
  source: pickString(item, ['source']),
  recordedAt: pickString(item, ['recorded_at', 'recordedAt', 'created_at']),
});

const getHourLabel = (hour) => `${String(hour).padStart(2, '0')}:00`;

function SummaryCard({ icon, title, subtitle, value, badge, variant = 'primary' }) {
  const badgeVariant = variant === 'danger' || variant === 'warning' || variant === 'success'
    ? variant
    : 'info';

  return (
    <Card className={`analytics-summary-card analytics-summary-card--${variant}`}>
      <div className="analytics-summary-card__top">
        <span className="analytics-summary-card__icon" aria-hidden="true">
          {icon}
        </span>

        {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
      </div>

      <strong>{value}</strong>
      <p>{title}</p>
      {subtitle && <p>{subtitle}</p>}
    </Card>
  );
}

function AnalyticsPage() {
  const { t } = useLanguage();

  const [dashboard, setDashboard] = useState(null);
  const [popularParkings, setPopularParkings] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [dailyLoad, setDailyLoad] = useState([]);
  const [weekdaysVsWeekends, setWeekdaysVsWeekends] = useState([]);
  const [parkingLoadTrend, setParkingLoadTrend] = useState([]);
  const [parkings, setParkings] = useState([]);

  const [popularLimit, setPopularLimit] = useState(10);
  const [selectedParkingId, setSelectedParkingId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [summaryLoading, setSummaryLoading] = useState(true);
  const [popularLoading, setPopularLoading] = useState(true);
  const [peakLoading, setPeakLoading] = useState(true);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [weekdaysLoading, setWeekdaysLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);
  const [parkingsLoading, setParkingsLoading] = useState(true);

  const [summaryError, setSummaryError] = useState('');
  const [popularError, setPopularError] = useState('');
  const [peakError, setPeakError] = useState('');
  const [dailyError, setDailyError] = useState('');
  const [weekdaysError, setWeekdaysError] = useState('');
  const [trendError, setTrendError] = useState('');
  const [parkingsError, setParkingsError] = useState('');

  const text = useCallback(
    (key, fallback) => {
      const translatedValue = t(key);
      return translatedValue === key ? fallback : translatedValue;
    },
    [t],
  );

  const loadDashboardSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');

    try {
      const result = await getDashboard();
      setDashboard(result || DEFAULT_DASHBOARD_SUMMARY);
    } catch (error) {
      setDashboard(null);
      setSummaryError(
        getErrorText(
          error,
          text('analytics.errors.dashboard', 'Не удалось загрузить summary cards.'),
        ),
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [text]);

  const loadPopularParkings = useCallback(async () => {
    setPopularLoading(true);
    setPopularError('');

    try {
      const result = await getPopularParkings({ limit: popularLimit, offset: 0 });
      const items = extractItems(result).map(normalizePopularParking);
      setPopularParkings(items);
    } catch (error) {
      setPopularParkings([]);
      setPopularError(
        getErrorText(
          error,
          text('analytics.errors.popular', 'Не удалось загрузить популярные парковки.'),
        ),
      );
    } finally {
      setPopularLoading(false);
    }
  }, [popularLimit, text]);

  const loadPeakHours = useCallback(async () => {
    setPeakLoading(true);
    setPeakError('');

    try {
      const result = await getPeakHours({ limit: 24, offset: 0 });
      const items = extractItems(result)
        .map(normalizePeakHour)
        .sort((firstItem, secondItem) => firstItem.hour - secondItem.hour);

      setPeakHours(items);
    } catch (error) {
      setPeakHours([]);
      setPeakError(
        getErrorText(
          error,
          text('analytics.errors.peak', 'Не удалось загрузить пиковые часы.'),
        ),
      );
    } finally {
      setPeakLoading(false);
    }
  }, [text]);

  const loadDailyLoad = useCallback(async () => {
    setDailyLoading(true);
    setDailyError('');

    const params = {
      limit: 30,
      offset: 0,
    };

    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    try {
      const result = await getDailyLoad(params);
      const items = extractItems(result)
        .map(normalizeDailyLoad)
        .sort((firstItem, secondItem) => new Date(firstItem.day) - new Date(secondItem.day));

      setDailyLoad(items);
    } catch (error) {
      setDailyLoad([]);
      setDailyError(
        getErrorText(
          error,
          text('analytics.errors.daily', 'Не удалось загрузить среднюю загрузку по дням.'),
        ),
      );
    } finally {
      setDailyLoading(false);
    }
  }, [dateFrom, dateTo, text]);

  const loadWeekdaysVsWeekends = useCallback(async () => {
    setWeekdaysLoading(true);
    setWeekdaysError('');

    try {
      const result = await getWeekdaysVsWeekends();
      const items = extractItems(result).map(normalizeWeekdayVsWeekend);
      setWeekdaysVsWeekends(items);
    } catch (error) {
      setWeekdaysVsWeekends([]);
      setWeekdaysError(
        getErrorText(
          error,
          text('analytics.errors.weekdays', 'Не удалось загрузить сравнение будней и выходных.'),
        ),
      );
    } finally {
      setWeekdaysLoading(false);
    }
  }, [text]);

  const loadParkings = useCallback(async () => {
    setParkingsLoading(true);
    setParkingsError('');

    try {
      const result = await getAllParkings();
      const items = extractItems(result).filter((parking) => parking?.is_active !== false);
      setParkings(items);

      setSelectedParkingId((currentValue) => {
        if (currentValue && items.some((parking) => String(parking.id) === String(currentValue))) {
          return currentValue;
        }

        return items[0]?.id ? String(items[0].id) : '';
      });
    } catch (error) {
      setParkings([]);
      setParkingsError(
        getErrorText(
          error,
          text('analytics.errors.parkings', 'Не удалось загрузить список парковок для фильтра.'),
        ),
      );
    } finally {
      setParkingsLoading(false);
    }
  }, [text]);

  const loadParkingLoadTrend = useCallback(async () => {
    if (!selectedParkingId) {
      setParkingLoadTrend([]);
      setTrendLoading(false);
      setTrendError('');
      return;
    }

    setTrendLoading(true);
    setTrendError('');

    try {
      const result = await getParkingLoad(selectedParkingId, { limit: 100, offset: 0 });
      const items = extractItems(result)
        .map(normalizeParkingLoadPoint)
        .sort(
          (firstItem, secondItem) =>
            new Date(firstItem.recordedAt) - new Date(secondItem.recordedAt),
        );

      setParkingLoadTrend(items);
    } catch (error) {
      setParkingLoadTrend([]);
      setTrendError(
        getErrorText(
          error,
          text('analytics.errors.trend', 'Не удалось загрузить динамику выбранной парковки.'),
        ),
      );
    } finally {
      setTrendLoading(false);
    }
  }, [selectedParkingId, text]);

  const refreshAll = useCallback(() => {
    loadDashboardSummary();
    loadPopularParkings();
    loadPeakHours();
    loadDailyLoad();
    loadWeekdaysVsWeekends();
    loadParkings();
    loadParkingLoadTrend();
  }, [
    loadDashboardSummary,
    loadDailyLoad,
    loadParkingLoadTrend,
    loadParkings,
    loadPeakHours,
    loadPopularParkings,
    loadWeekdaysVsWeekends,
  ]);

  useEffect(() => {
    loadDashboardSummary();
    loadPeakHours();
    loadWeekdaysVsWeekends();
    loadParkings();
  }, [loadDashboardSummary, loadParkings, loadPeakHours, loadWeekdaysVsWeekends]);

  useEffect(() => {
    loadPopularParkings();
  }, [loadPopularParkings]);

  useEffect(() => {
    loadDailyLoad();
  }, [loadDailyLoad]);

  useEffect(() => {
    loadParkingLoadTrend();
  }, [loadParkingLoadTrend]);

  const summary = useMemo(
    () => normalizeDashboardSummary(dashboard || DEFAULT_DASHBOARD_SUMMARY),
    [dashboard],
  );

  const selectedParking = useMemo(
    () => parkings.find((parking) => String(parking.id) === String(selectedParkingId)),
    [parkings, selectedParkingId],
  );

  const averageLoadLevel = getLoadLevel(summary.averageLoadPercentage);
  const averageLoadVariant =
    averageLoadLevel === 'high' ? 'danger' : averageLoadLevel === 'medium' ? 'warning' : 'success';

  const popularChartData = useMemo(
    () => ({
      labels: popularParkings.map(
        (item) => item.parkingName || text('analytics.labels.unknownParking', 'Парковка'),
      ),
      datasets: [
        {
          label: text('analytics.datasets.requests', 'Количество запросов на парковку'),
          data: popularParkings.map((item) => item.requestCount),
          backgroundColor: CHART_COLORS.primary,
          borderColor: CHART_COLORS.primary,
          borderWidth: 1,
          borderRadius: 10,
        },
      ],
    }),
    [popularParkings, text],
  );

  const peakHoursChartData = useMemo(
    () => ({
      labels: peakHours.map((item) => getHourLabel(item.hour)),
      datasets: [
        {
          label: text('analytics.datasets.averageLoad', 'Средняя загрузка'),
          data: peakHours.map((item) => clampPercent(item.averageLoadPercentage)),
          backgroundColor: peakHours.map((item) => getBarColorByLoad(item.averageLoadPercentage)),
          borderColor: peakHours.map((item) => getBarColorByLoad(item.averageLoadPercentage)),
          borderWidth: 1,
          borderRadius: 10,
        },
      ],
    }),
    [peakHours, text],
  );

  const dailyLoadChartData = useMemo(
    () => ({
      labels: dailyLoad.map((item) => formatDate(item.day)),
      datasets: [
        {
          label: text('analytics.datasets.averageLoad', 'Средняя загрузка'),
          data: dailyLoad.map((item) => clampPercent(item.averageLoadPercentage)),
          borderColor: CHART_COLORS.primary,
          backgroundColor: CHART_COLORS.primarySoft,
          tension: 0.35,
          fill: true,
          pointRadius: 4,
        },
        {
          label: text('analytics.datasets.minLoad', 'Минимальная загрузка'),
          data: dailyLoad.map((item) => clampPercent(item.minLoadPercentage)),
          borderColor: CHART_COLORS.green,
          backgroundColor: CHART_COLORS.greenSoft,
          tension: 0.35,
          pointRadius: 3,
        },
        {
          label: text('analytics.datasets.maxLoad', 'Максимальная загрузка'),
          data: dailyLoad.map((item) => clampPercent(item.maxLoadPercentage)),
          borderColor: CHART_COLORS.red,
          backgroundColor: CHART_COLORS.redSoft,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    }),
    [dailyLoad, text],
  );

  const weekdaysChartData = useMemo(() => {
    const getDayTypeLabel = (dayType) => {
      if (dayType === 'weekday') return text('analytics.dayTypes.weekday', 'Будни');
      if (dayType === 'weekend') return text('analytics.dayTypes.weekend', 'Выходные');

      return dayType || '—';
    };

    return {
      labels: weekdaysVsWeekends.map((item) => getDayTypeLabel(item.dayType)),
      datasets: [
        {
          label: text('analytics.datasets.averageLoad', 'Средняя загрузка'),
          data: weekdaysVsWeekends.map((item) => clampPercent(item.averageLoadPercentage)),
          backgroundColor: weekdaysVsWeekends.map((item) =>
            item.dayType === 'weekend' ? CHART_COLORS.yellow : CHART_COLORS.primary,
          ),
          borderColor: '#ffffff',
          borderWidth: 3,
        },
      ],
    };
  }, [text, weekdaysVsWeekends]);

  const trendChartData = useMemo(
    () => ({
      labels: parkingLoadTrend.map((item) => formatDateTime(item.recordedAt)),
      datasets: [
        {
          label: text('analytics.datasets.loadTrend', 'Динамика загрузки'),
          data: parkingLoadTrend.map((item) => clampPercent(item.loadPercentage)),
          borderColor: CHART_COLORS.primary,
          backgroundColor: parkingLoadTrend.map((item) => getSoftColorByLoad(item.loadPercentage)),
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: parkingLoadTrend.map((item) =>
            getBarColorByLoad(item.loadPercentage),
          ),
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
        },
      ],
    }),
    [parkingLoadTrend, text],
  );

  const popularOptions = useMemo(
    () => ({
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    }),
    [],
  );

  const percentBarOptions = useMemo(
    () => ({
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 100,
          ticks: {
            callback: (value) => `${value}%`,
          },
        },
      },
    }),
    [],
  );

  const trendSubtitle = selectedParking
    ? `${text(
        'analytics.descriptions.parkingTrend',
        'История изменения загрузки для парковки',
      )}: ${selectedParking.name}`
    : text(
        'analytics.descriptions.parkingTrendEmpty',
        'Выберите парковку, чтобы увидеть историю изменения загрузки.',
      );

  return (
    <div className="page-stack analytics-page">
      <PageHeader
        title={text('analytics.title', 'Аналитика')}
        subtitle={text(
          'analytics.subtitle',
          'Графики по парковкам Бишкека: популярность, пиковые часы, средняя загрузка и динамика выбранной парковки.',
        )}
        badge={text('analytics.liveBadge', 'Chart.js analytics')}
        actions={
          <Button variant="secondary" onClick={refreshAll}>
            {text('analytics.refresh', 'Обновить графики')}
          </Button>
        }
      />

      <section className="analytics-filters-card">
        <label className="analytics-filter analytics-filter--compact">
          <span>{text('analytics.filters.parking', 'Парковка')}</span>
          <select
            className="form-input"
            value={selectedParkingId}
            onChange={(event) => setSelectedParkingId(event.target.value)}
            disabled={parkingsLoading || parkings.length === 0}
          >
            {parkings.length === 0 && (
              <option value="">
                {text('analytics.filters.noParkings', 'Парковки не найдены')}
              </option>
            )}

            {parkings.map((parking) => (
              <option key={parking.id} value={parking.id}>
                #{parking.id} — {parking.name}
              </option>
            ))}
          </select>
        </label>

        <label className="analytics-filter">
          <span>{text('analytics.filters.popularLimit', 'Лимит популярных')}</span>
          <select
            className="form-input"
            value={popularLimit}
            onChange={(event) => setPopularLimit(Number(event.target.value))}
          >
            {POPULAR_LIMIT_OPTIONS.map((limitValue) => (
              <option key={limitValue} value={limitValue}>
                {limitValue}
              </option>
            ))}
          </select>
        </label>

        <label className="analytics-filter">
          <span>{text('analytics.filters.dateFrom', 'Дата от')}</span>
          <input
            className="form-input"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </label>

        <label className="analytics-filter">
          <span>{text('analytics.filters.dateTo', 'Дата до')}</span>
          <input
            className="form-input"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </label>

        <div className="analytics-filter analytics-filter--actions">
          <span>
            {text('analytics.filters.periodNote', 'Период применяется к графику по дням.')}
          </span>
          <Button variant="ghost" size="sm" onClick={loadDailyLoad} disabled={dailyLoading}>
            {text('common.retry', 'Повторить')}
          </Button>
        </div>
      </section>

      {parkingsError && (
        <ErrorMessage
          title={text(
            'analytics.errors.parkings',
            'Не удалось загрузить список парковок для фильтра.',
          )}
          message={parkingsError}
          action={
            <Button variant="secondary" size="sm" onClick={loadParkings}>
              {text('common.retry', 'Повторить')}
            </Button>
          }
        />
      )}

      <section
        className="analytics-summary-grid"
        aria-label={text('analytics.sections.summary', 'Сводные показатели')}
      >
        <SummaryCard
          icon="P"
          title={text('analytics.summary.parkingCount', 'Парковки')}
          subtitle={text(
            'analytics.summary.parkingCountSubtitle',
            'Активные парковочные объекты.',
          )}
          value={summaryLoading ? '...' : formatNumber(summary.parkingCount)}
          variant="primary"
        />

        <SummaryCard
          icon="Σ"
          title={text('analytics.summary.totalPlaces', 'Всего мест')}
          subtitle={text(
            'analytics.summary.totalPlacesSubtitle',
            'Суммарная вместимость парковок.',
          )}
          value={summaryLoading ? '...' : formatNumber(summary.totalPlaces)}
          variant="neutral"
        />

        <SummaryCard
          icon="✓"
          title={text('analytics.summary.freePlaces', 'Свободно')}
          subtitle={text('analytics.summary.freePlacesSubtitle', 'Доступные места сейчас.')}
          value={summaryLoading ? '...' : formatNumber(summary.freePlaces)}
          variant="success"
        />

        <SummaryCard
          icon="%"
          title={text('analytics.summary.averageLoad', 'Средняя загрузка')}
          subtitle={text(
            'analytics.summary.averageLoadSubtitle',
            'Средний процент по городу.',
          )}
          value={summaryLoading ? '...' : formatPercent(summary.averageLoadPercentage)}
          badge={averageLoadLevel}
          variant={averageLoadVariant}
        />

        <SummaryCard
          title={text('analytics.summary.requestsCount', 'Запросы на парковку')}
          subtitle={text(
            'analytics.summary.requestsCountSubtitle',
            'Количество пользовательских запросов на парковку.',
          )}
          value={summaryLoading ? '...' : formatNumber(summary.requestsCount)}
          icon="↔"
          variant="info"
        />

        <SummaryCard
          icon="★"
          title={text('analytics.summary.recommendationsCount', 'Рекомендации')}
          subtitle={text(
            'analytics.summary.recommendationsCountSubtitle',
            'Выданные AI-рекомендации.',
          )}
          value={summaryLoading ? '...' : formatNumber(summary.recommendationsCount)}
          variant="warning"
        />
      </section>

      {summaryError && (
        <ErrorMessage
          title={text('analytics.errors.dashboard', 'Не удалось загрузить summary cards.')}
          message={summaryError}
          action={
            <Button variant="secondary" size="sm" onClick={loadDashboardSummary}>
              {text('common.retry', 'Повторить')}
            </Button>
          }
        />
      )}

      <section className="analytics-charts-grid analytics-charts-grid--top">
        <BarChartCard
          title={text('analytics.sections.popularParkings', 'Популярные парковки')}
          subtitle={text(
            'analytics.descriptions.popularParkings',
            'Парковки с наибольшим количеством пользовательских запросов.',
          )}
          badge={text('analytics.badges.bar', 'Bar chart')}
          data={popularChartData}
          options={popularOptions}
          isLoading={popularLoading}
          error={popularError}
          empty={popularParkings.length === 0}
          emptyTitle={text(
            'analytics.empty.popularTitle',
            'Популярные парковки пока не рассчитаны',
          )}
          emptyDescription={text(
            'analytics.empty.popularDescription',
            'Создайте запросы “Ищу место” или demo data, чтобы появились значения.',
          )}
          onRetry={loadPopularParkings}
        />

        <BarChartCard
          title={text('analytics.sections.peakHours', 'Пиковые часы')}
          subtitle={text(
            'analytics.descriptions.peakHours',
            'Средняя загрузка по часам суток. Цвет показывает уровень загрузки.',
          )}
          badge={text('analytics.badges.bar', 'Bar chart')}
          data={peakHoursChartData}
          options={percentBarOptions}
          isLoading={peakLoading}
          error={peakError}
          empty={peakHours.length === 0}
          emptyTitle={text('analytics.empty.peakTitle', 'Пиковые часы пока не рассчитаны')}
          emptyDescription={text(
            'analytics.empty.peakDescription',
            'Нужны записи истории загрузки parking_status_history.',
          )}
          onRetry={loadPeakHours}
        />
      </section>

      <section className="analytics-charts-grid">
        <LineChartCard
          title={text('analytics.sections.dailyLoad', 'Средняя загрузка по дням')}
          subtitle={text(
            'analytics.descriptions.dailyLoad',
            'Средняя, минимальная и максимальная загрузка по датам. Период отправляется только в endpoint daily-load.',
          )}
          badge={text('analytics.badges.line', 'Line chart')}
          data={dailyLoadChartData}
          isLoading={dailyLoading}
          error={dailyError}
          empty={dailyLoad.length === 0}
          emptyTitle={text('analytics.empty.dailyTitle', 'Данных по дням пока нет')}
          emptyDescription={text(
            'analytics.empty.dailyDescription',
            'Проверьте период, выбранную парковку или наличие истории загрузки.',
          )}
          onRetry={loadDailyLoad}
        />

        <DoughnutChartCard
          title={text('analytics.sections.weekdaysVsWeekends', 'Будни vs выходные')}
          subtitle={text(
            'analytics.descriptions.weekdaysVsWeekends',
            'Сравнение средней загрузки в будние и выходные дни.',
          )}
          badge={text('analytics.badges.doughnut', 'Doughnut chart')}
          data={weekdaysChartData}
          isLoading={weekdaysLoading}
          error={weekdaysError}
          empty={weekdaysVsWeekends.length === 0}
          emptyTitle={text('analytics.empty.weekdaysTitle', 'Нет данных для сравнения')}
          emptyDescription={text(
            'analytics.empty.weekdaysDescription',
            'Backend вернет значения, когда появятся записи за будни или выходные.',
          )}
          onRetry={loadWeekdaysVsWeekends}
        />
      </section>

      <section className="analytics-trend-section">
        <LineChartCard
          title={text('analytics.sections.parkingTrend', 'Динамика по выбранной парковке')}
          subtitle={trendSubtitle}
          badge={text('analytics.badges.line', 'Line chart')}
          data={trendChartData}
          isLoading={trendLoading}
          error={trendError}
          empty={!selectedParkingId || parkingLoadTrend.length === 0}
          emptyTitle={text(
            'analytics.empty.trendTitle',
            'Динамика парковки пока недоступна',
          )}
          emptyDescription={text(
            'analytics.empty.trendDescription',
            'Выберите парковку с историей загрузки или создайте demo data.',
          )}
          onRetry={loadParkingLoadTrend}
          actions={
            <div className="analytics-chart-action-filter">
              <label className="analytics-filter">
                <span>{text('analytics.filters.parking', 'Парковка')}</span>
                <select
                  className="form-input"
                  value={selectedParkingId}
                  onChange={(event) => setSelectedParkingId(event.target.value)}
                  disabled={parkingsLoading || parkings.length === 0}
                >
                  {parkings.length === 0 && (
                    <option value="">
                      {text('analytics.filters.noParkings', 'Парковки не найдены')}
                    </option>
                  )}

                  {parkings.map((parking) => (
                    <option key={parking.id} value={parking.id}>
                      #{parking.id} — {parking.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          }
        />
      </section>
    </div>
  );
}

export default AnalyticsPage;