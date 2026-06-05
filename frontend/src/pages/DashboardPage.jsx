import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { seedDemoData } from '../api/adminApi';
import { getDashboard, getPeakHours, getPopularParkings } from '../api/analyticsApi';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import ErrorMessage from '../components/common/ErrorMessage';
import Loader from '../components/common/Loader';
import PageHeader from '../components/common/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getApiErrorMessage } from '../utils/apiErrors';
import { formatNumber, formatPercent } from '../utils/formatters';
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
};

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? fallback : numericValue;
};

const pickNumber = (source, keys, fallback = 0) => {
  const foundKey = keys.find((key) => source?.[key] !== undefined && source?.[key] !== null);
  return foundKey ? toNumber(source[foundKey], fallback) : fallback;
};

const clampPercent = (value) => Math.min(Math.max(toNumber(value), 0), 100);

const normalizeDashboardSummary = (payload = {}) => ({
  parkingCount: pickNumber(payload, ['parking_count', 'parkingCount', 'parkings_count']),
  totalPlaces: pickNumber(payload, ['total_places', 'totalPlaces', 'places_count']),
  freePlaces: pickNumber(payload, ['free_places', 'freePlaces', 'available_places']),
  occupiedPlaces: pickNumber(payload, ['occupied_places', 'occupiedPlaces', 'busy_places']),
  averageLoadPercentage: pickNumber(payload, [
    'average_load_percentage',
    'averageLoadPercentage',
    'avg_load_percentage',
  ]),
  requestsCount: pickNumber(payload, ['requests_count', 'requestsCount', 'parking_requests_count']),
  activeUsersCount: pickNumber(payload, ['active_users_count', 'activeUsersCount']),
  predictionsCount: pickNumber(payload, ['predictions_count', 'predictionsCount']),
  recommendationsCount: pickNumber(payload, ['recommendations_count', 'recommendationsCount']),
});

const getParkingDisplayName = (parking, fallback) => {
  const rawName = parking?.parking_name || parking?.parkingName || parking?.name || fallback;

  return String(rawName)
    .replace(/^Demo Parking\s*[—-]\s*/i, '')
    .trim() || fallback;
};

const getBadgeVariantByLoadLevel = (loadLevel) => {
  if (loadLevel === 'high') return 'danger';
  if (loadLevel === 'medium') return 'warning';
  return 'success';
};

function StatCard({ icon, title, subtitle, value, variant = 'info' }) {
  return (
    <Card className={`dashboard-stat-card dashboard-stat-card--${variant}`}>
      <div className="dashboard-stat-card__top">
        <span className="dashboard-stat-card__icon" aria-hidden="true">
          {icon}
        </span>
      </div>

      <strong className="dashboard-stat-card__value">{value}</strong>
      <span className="dashboard-stat-card__title">{title}</span>
      {subtitle && <p className="dashboard-stat-card__subtitle">{subtitle}</p>}
    </Card>
  );
}

function ActionCard({ action }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (action.onClick) {
      action.onClick();
      return;
    }

    if (action.to) {
      navigate(action.to);
    }
  };

  return (
    <button
      type="button"
      className={`dashboard-action-card dashboard-action-card--${action.variant || 'default'}`}
      onClick={handleClick}
      disabled={action.disabled || action.isLoading}
    >
      <span className="dashboard-action-card__icon" aria-hidden="true">
        {action.isLoading ? '...' : action.icon}
      </span>
      <span>
        <strong>{action.label}</strong>
        {action.description && <small>{action.description}</small>}
      </span>
    </button>
  );
}

function CapacityItem({ label, value, hint }) {
  return (
    <div className="dashboard-capacity-item">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAdmin, isDriver } = useAuth();
  const { t } = useLanguage();

  const [dashboard, setDashboard] = useState(DEFAULT_DASHBOARD_SUMMARY);
  const [popularParkings, setPopularParkings] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [optionalWarning, setOptionalWarning] = useState('');
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedFeedback, setSeedFeedback] = useState(null);

  const text = useCallback(
    (key, fallback) => {
      const translatedValue = t(key);
      return translatedValue === key ? fallback : translatedValue;
    },
    [t],
  );

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setOptionalWarning('');

    try {
      const [dashboardResult, popularResult, peakHoursResult] = await Promise.allSettled([
        getDashboard(),
        getPopularParkings({ limit: 5, offset: 0 }),
        getPeakHours({ limit: 6, offset: 0 }),
      ]);

      if (dashboardResult.status === 'rejected') {
        throw dashboardResult.reason;
      }

      setDashboard(normalizeDashboardSummary(dashboardResult.value || DEFAULT_DASHBOARD_SUMMARY));

      const optionalErrors = [];

      if (popularResult.status === 'fulfilled') {
        setPopularParkings(extractItems(popularResult.value));
      } else {
        setPopularParkings([]);
        optionalErrors.push(text('dashboard.sections.popularParkings', 'Популярные парковки'));
      }

      if (peakHoursResult.status === 'fulfilled') {
        setPeakHours(extractItems(peakHoursResult.value));
      } else {
        setPeakHours([]);
        optionalErrors.push(text('dashboard.sections.peakHours', 'Пиковые часы'));
      }

      if (optionalErrors.length > 0) {
        setOptionalWarning(
          `${text('dashboard.partialDataWarning', 'Не удалось загрузить дополнительные блоки')}: ${optionalErrors.join(', ')}.`,
        );
      }
    } catch (requestError) {
      setDashboard(DEFAULT_DASHBOARD_SUMMARY);
      setPopularParkings([]);
      setPeakHours([]);
      setError(
        getApiErrorMessage(
          requestError,
          text('errors.backendUnavailable', 'Backend недоступен. Проверьте запуск FastAPI.'),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [text]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const summary = useMemo(() => normalizeDashboardSummary(dashboard), [dashboard]);

  const averageLoadLevel = getLoadLevel(summary.averageLoadPercentage);
  const averageLoadBadgeVariant = getBadgeVariantByLoadLevel(averageLoadLevel);
  const averageLoadWidth = `${clampPercent(summary.averageLoadPercentage)}%`;

  const freePlacesPercent = summary.totalPlaces
    ? `${clampPercent((summary.freePlaces / summary.totalPlaces) * 100)}%`
    : '0%';

  const userName = user?.full_name || user?.fullName || user?.login || text('auth.user', 'Пользователь');

  const roleLabel = isAdmin
    ? text('auth.admin', 'Администратор')
    : isDriver
      ? text('auth.driver', 'Водитель')
      : text('auth.unknownRole', 'Роль не определена');

  const stats = useMemo(
    () => [
      {
        key: 'parkingCount',
        icon: 'P',
        title: text('dashboard.stats.parkingCount', 'Количество парковок'),
        subtitle: text('dashboard.stats.parkingCountSubtitle', 'Активные парковочные объекты.'),
        value: formatNumber(summary.parkingCount),
        variant: 'info',
      },
      {
        key: 'totalPlaces',
        icon: '▦',
        title: text('dashboard.stats.totalPlaces', 'Общее количество мест'),
        subtitle: text('dashboard.stats.totalPlacesSubtitle', 'Суммарная вместимость парковок.'),
        value: formatNumber(summary.totalPlaces),
        variant: 'neutral',
      },
      {
        key: 'freePlaces',
        icon: '✓',
        title: text('dashboard.stats.freePlaces', 'Свободные места'),
        subtitle: text('dashboard.stats.freePlacesSubtitle', 'Доступные места прямо сейчас.'),
        value: formatNumber(summary.freePlaces),
        variant: 'success',
      },
      {
        key: 'occupiedPlaces',
        icon: '●',
        title: text('dashboard.stats.occupiedPlaces', 'Занятые места'),
        subtitle: text('dashboard.stats.occupiedPlacesSubtitle', 'Места, которые уже заняты.'),
        value: formatNumber(summary.occupiedPlaces),
        variant: 'warning',
      },
      {
        key: 'averageLoadPercentage',
        icon: '%',
        title: text('dashboard.stats.averageLoad', 'Средняя загруженность'),
        subtitle: text('dashboard.stats.averageLoadSubtitle', 'Средний процент загрузки по городу.'),
        value: formatPercent(summary.averageLoadPercentage),
        variant: averageLoadBadgeVariant,
      },
      {
        key: 'requestsCount',
        icon: '↔',
        title: text('dashboard.stats.requests', 'Запросы на парковку'),
        subtitle: text('dashboard.stats.requestsSubtitle', 'Все запросы на парковку в системе.'),
        value: formatNumber(summary.requestsCount),
        variant: 'info',
      },
      {
        key: 'activeUsersCount',
        icon: '👥',
        title: text('dashboard.stats.activeUsers', 'Активные пользователи'),
        subtitle: text('dashboard.stats.activeUsersSubtitle', 'Пользователи с активным аккаунтом.'),
        value: formatNumber(summary.activeUsersCount),
        variant: 'success',
      },
      {
        key: 'predictionsCount',
        icon: '↗',
        title: text('dashboard.stats.predictions', 'Прогнозы'),
        subtitle: text('dashboard.stats.predictionsSubtitle', 'Сохраненные AI-прогнозы.'),
        value: formatNumber(summary.predictionsCount),
        variant: 'info',
      },
      {
        key: 'recommendationsCount',
        icon: '★',
        title: text('dashboard.stats.recommendations', 'Рекомендации'),
        subtitle: text('dashboard.stats.recommendationsSubtitle', 'Выданные рекомендации парковок.'),
        value: formatNumber(summary.recommendationsCount),
        variant: 'neutral',
      },
    ],
    [averageLoadBadgeVariant, summary, text],
  );

  const quickActions = useMemo(
    () => [
      {
        icon: '⌖',
        label: text('dashboard.quick.map', 'Открыть карту'),
        description: text('dashboard.quick.mapDescription', 'Городская карта парковок'),
        to: '/map',
        variant: 'primary',
      },
      {
        icon: 'P',
        label: text('dashboard.quick.parkings', 'Открыть парковки'),
        description: text('dashboard.quick.parkingsDescription', 'Список парковочных объектов'),
        to: '/parkings',
      },
      {
        icon: '↗',
        label: text('dashboard.quick.predictions', 'Открыть прогноз'),
        description: text('dashboard.quick.predictionsDescription', 'AI-прогноз загруженности'),
        to: '/predictions',
      },
      {
        icon: '★',
        label: text('dashboard.quick.recommendations', 'Открыть рекомендации'),
        description: text('dashboard.quick.recommendationsDescription', 'Подбор подходящей парковки'),
        to: '/recommendations',
      },
      {
        icon: '◎',
        label: text('menu.analytics', 'Аналитика'),
        description: 'Графики и динамика загруженности',
        to: '/analytics',
      },
    ],
    [text],
  );

  const handleSeedDemoData = async () => {
    setSeedLoading(true);
    setSeedFeedback(null);

    try {
      await seedDemoData();

      setSeedFeedback({
        type: 'success',
        text: text('dashboard.demoDataSuccess', 'Demo data успешно создана. Dashboard обновлен.'),
      });

      await loadDashboardData();
    } catch (seedError) {
      setSeedFeedback({
        type: 'danger',
        text: getApiErrorMessage(
          seedError,
          text('dashboard.demoDataError', 'Не удалось создать demo data.'),
        ),
      });
    } finally {
      setSeedLoading(false);
    }
  };

  const roleActions = isAdmin
    ? [
        {
          icon: '⚙',
          label: text('dashboard.quick.adminPanel', 'Админ-панель'),
          description: text('dashboard.quick.adminPanelDescription', 'Защищенный раздел администратора'),
          to: '/admin',
          variant: 'primary',
        },
        {
          icon: 'P',
          label: text('dashboard.quick.manageParkings', 'Управление парковками'),
          description: 'CRUD парковок и статусов',
          to: '/admin/parkings',
        },
        {
          icon: '↔',
          label: text('menu.requests', 'Запросы на парковку'),
          description: text('admin.requests', 'Запросы на парковку'),
          to: '/admin/requests',
        },
        {
          icon: '◎',
          label: text('dashboard.quick.demoData', 'Demo data'),
          description: text('dashboard.quick.demoDataDescription', 'Заполнить backend тестовыми данными'),
          onClick: handleSeedDemoData,
          isLoading: seedLoading,
        },
      ]
    : [
        {
          icon: '⌖',
          label: text('dashboard.quick.driverMap', 'Карта'),
          description: text('dashboard.quick.driverMapDescription', 'Найти парковку рядом'),
          to: '/map',
          variant: 'primary',
        },
        {
          icon: 'P',
          label: text('dashboard.quick.driverParkings', 'Список парковок'),
          description: text('dashboard.quick.driverParkingsDescription', 'Посмотреть доступные объекты'),
          to: '/parkings',
        },
        {
          icon: '↔',
          label: text('dashboard.quick.myRequests', 'Мои запросы на парковку'),
          description: text('requests.subtitle', 'История запросов на парковку и получение рекомендаций по ним.'),
          to: '/my-requests',
        },
      ];

  const isEmpty =
    !isLoading &&
    !error &&
    Object.values(summary).every((value) => toNumber(value) === 0) &&
    popularParkings.length === 0 &&
    peakHours.length === 0;

  if (isLoading) {
    return (
      <div className="page-stack dashboard-page dashboard-page--glass">
        <PageHeader
          badge={text('dashboard.liveBadge', 'Live analytics')}
          title={text('dashboard.title', 'Dashboard')}
          subtitle={text('dashboard.loadingSubtitle', 'Получаем актуальную аналитику из backend.')}
        />

        <Card className="dashboard-state-card dashboard-glass-card">
          <Loader text={text('dashboard.loadingData', 'Загружаем dashboard...')} />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack dashboard-page dashboard-page--glass">
        <PageHeader
          badge={text('dashboard.liveBadge', 'Live analytics')}
          title={text('dashboard.title', 'Dashboard')}
          subtitle={text(
            'dashboard.subtitle',
            'Оперативная сводка по парковкам Бишкека: места, загрузка, запросы на парковку и AI-прогнозы.',
          )}
          actions={
            <Button variant="secondary" onClick={loadDashboardData}>
              {text('common.retry', 'Повторить')}
            </Button>
          }
        />

        <ErrorMessage
          title={text('dashboard.errorTitle', 'Не удалось загрузить dashboard')}
          message={error}
          action={
            <Button variant="danger" onClick={loadDashboardData}>
              {text('common.retry', 'Повторить')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-stack dashboard-page dashboard-page--glass">
      <PageHeader
        badge={text('dashboard.liveBadge', 'Live analytics')}
        title={text('dashboard.title', 'Dashboard')}
        subtitle={text(
          'dashboard.subtitle',
          'Оперативная сводка по парковкам Бишкека: места, загрузка, заявки и AI-прогнозы.',
        )}
        actions={
          <Button variant="secondary" onClick={loadDashboardData}>
            {text('dashboard.refresh', 'Обновить данные')}
          </Button>
        }
      />

      {optionalWarning && (
        <ErrorMessage
          title={text('dashboard.partialDataTitle', 'Часть блоков недоступна')}
          message={optionalWarning}
        />
      )}

      <section className="dashboard-glass-hero">
        <div className="dashboard-glass-hero__content">
          <Badge variant={averageLoadBadgeVariant}>
            {text(`dashboard.loadLevels.${averageLoadLevel}`, 'Текущая загрузка')}
          </Badge>

          <div>
            <h2>
              {text('dashboard.welcome', 'Добро пожаловать')}, {userName}
            </h2>
            <p>Минималистичная панель управления для мониторинга парковок, заявок и AI-модулей.</p>
          </div>

          <div className="dashboard-hero-metric">
            <span>{text('dashboard.currentLoad', 'Средняя загруженность')}</span>
            <strong>{formatPercent(summary.averageLoadPercentage)}</strong>
          </div>

          <div className={`dashboard-load-bar dashboard-load-bar--${averageLoadLevel}`}>
            <span style={{ width: averageLoadWidth }} />
          </div>

          <div className="dashboard-hero-actions">
            <Button variant="primary" onClick={() => navigate('/map')}>
              {text('dashboard.quick.map', 'Открыть карту')}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/parkings')}>
              {text('dashboard.quick.parkings', 'Открыть парковки')}
            </Button>
          </div>
        </div>

        <div className="dashboard-glass-hero__panel">
          <div className="dashboard-profile-card">
            <div className="dashboard-profile-card__top">
              <div className="dashboard-profile-card__avatar">
                {String(userName).slice(0, 1).toUpperCase()}
              </div>

              <div>
                <strong>{userName}</strong>
                <span>{user?.email || user?.login || text('common.unknown', 'Неизвестно')}</span>
              </div>

              <Badge variant={isAdmin ? 'success' : 'info'}>{roleLabel}</Badge>
            </div>
          </div>

          <div className="dashboard-capacity-grid">
            <CapacityItem
              label={text('dashboard.stats.totalPlaces', 'Всего мест')}
              value={formatNumber(summary.totalPlaces)}
              hint="100%"
            />
            <CapacityItem
              label={text('dashboard.stats.freePlaces', 'Свободно')}
              value={formatNumber(summary.freePlaces)}
              hint={freePlacesPercent}
            />
            <CapacityItem
              label={text('dashboard.stats.occupiedPlaces', 'Занято')}
              value={formatNumber(summary.occupiedPlaces)}
              hint={formatPercent(summary.averageLoadPercentage)}
            />
          </div>
        </div>
      </section>

      <section className="stats-grid stats-grid--four dashboard-stats-grid">
        {stats.map(({ key, ...item }) => (
          <StatCard key={key} {...item} />
        ))}
      </section>

      {isEmpty && (
        <EmptyState
          title={text('dashboard.emptyTitle', 'Данных для dashboard пока нет')}
          description={text(
            'dashboard.emptyDescription',
            'Backend отвечает, но аналитические таблицы пустые. Для проверки можно создать demo data через админ-кнопку.',
          )}
          icon="◎"
          action={
            <Button variant="primary" onClick={loadDashboardData}>
              {text('common.retry', 'Повторить')}
            </Button>
          }
        />
      )}

      <section className="content-grid content-grid--two dashboard-panels-grid">
        <Card
          className="dashboard-glass-card"
          title={text('dashboard.sections.popularParkings', 'Популярные парковки')}
          subtitle={text('dashboard.popularSubtitle', 'Парковки с наибольшим количеством заявок.')}
        >
          {popularParkings.length > 0 ? (
            <div className="dashboard-list">
              {popularParkings.map((parking) => (
                <div className="dashboard-list__item" key={parking.parking_id || parking.id}>
                  <div>
                    <strong>
                      {getParkingDisplayName(parking, text('common.unknown', 'Неизвестно'))}
                    </strong>
                    <span>#{parking.parking_id || parking.id}</span>
                  </div>

                  <Badge variant="info">
                    {formatNumber(parking.request_count || parking.requests_count || 0)}{' '}
                    {text('dashboard.popular.requests', 'запросов')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="dashboard-card-empty">
              {text('dashboard.popular.empty', 'Популярные парковки пока не найдены.')}
            </p>
          )}
        </Card>

        <Card
          className="dashboard-glass-card"
          title={text('dashboard.sections.peakHours', 'Пиковые часы')}
          subtitle={text('dashboard.peakSubtitle', 'Часы с наиболее заметной средней загруженностью.')}
        >
          {peakHours.length > 0 ? (
            <div className="dashboard-hour-list">
              {peakHours.map((item) => {
                const hour = Number(item.hour || 0);
                const loadPercentage = toNumber(item.average_load_percentage || item.averageLoadPercentage);
                const loadLevel = getLoadLevel(loadPercentage);
                const width = `${clampPercent(loadPercentage)}%`;

                return (
                  <div className="dashboard-hour-list__item" key={hour}>
                    <div className="dashboard-hour-list__header">
                      <strong>{String(hour).padStart(2, '0')}:00</strong>
                      <span>{formatPercent(loadPercentage)}</span>
                    </div>

                    <div className={`dashboard-mini-bar dashboard-mini-bar--${loadLevel}`}>
                      <span style={{ width }} />
                    </div>

                    <small>
                      {formatNumber(item.records_count || item.recordsCount || 0)}{' '}
                      {text('dashboard.peak.records', 'записей')}
                    </small>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="dashboard-card-empty">
              {text('dashboard.peak.empty', 'Пиковые часы пока не рассчитаны.')}
            </p>
          )}
        </Card>
      </section>

      <section className="content-grid content-grid--two">
        <Card
          className="dashboard-glass-card"
          title={text('dashboard.sections.quickActions', 'Быстрые действия')}
          subtitle={text('dashboard.quickSubtitle', 'Быстрый переход к основным разделам системы.')}
        >
          <div className="dashboard-actions-grid">
            {quickActions.map((action) => (
              <ActionCard key={action.label} action={action} />
            ))}
          </div>
        </Card>

        <Card
          className="dashboard-glass-card"
          title={
            isAdmin
              ? text('dashboard.sections.adminActions', 'Быстрые действия администратора')
              : text('dashboard.sections.driverActions', 'Быстрые действия водителя')
          }
          subtitle={
            isAdmin
              ? text('dashboard.adminActionsSubtitle', 'Действия администратора для управления и наполнения проекта.')
              : text('dashboard.driverActionsSubtitle', 'Действия водителя для поиска парковки и получения рекомендаций.')
          }
        >
          <div className="dashboard-actions-grid">
            {roleActions.map((action) => (
              <ActionCard key={action.label} action={action} />
            ))}
          </div>

          {seedFeedback && (
            <div className={`dashboard-feedback dashboard-feedback--${seedFeedback.type}`}>
              {seedFeedback.text}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

export default DashboardPage;