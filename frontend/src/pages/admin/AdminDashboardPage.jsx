import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateInfrastructureHistory, seedDemoData } from '../../api/adminApi';
import { getLatestModelMetric, getModelMetrics } from '../../api/modelMetricsApi';
import { getParkingRequests } from '../../api/parkingRequestsApi';
import { getAllParkings } from '../../api/parkingsApi';
import { trainPredictionModel } from '../../api/predictionsApi';
import { getUsers } from '../../api/usersApi';
import AdminConfirmDialog from '../../components/admin/AdminConfirmDialog';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import { formatDateTime, formatNumber } from '../../utils/formatters';

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const getErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail || error?.apiError?.detail;

  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item?.msg || item?.message || JSON.stringify(item)).join('; ');
  }

  return error?.message || fallback;
};

const seedPayload = {
  reset: false,
  days: 90,
  history_points_per_day: 6,
  drivers_count: 5,
  requests_count: 80,
  predictions_count: 60,
};

const infrastructureHistoryPayload = {
  reset_generated: true,
  days: 120,
  history_points_per_day: 8,
  generate_requests: true,
  max_requests_per_point: 5,
};

const trainPayload = {
  parking_id: null,
  test_size: 0.2,
  min_rows: 30,
};

const adminLinks = [
  {
    to: '/admin/parkings',
    icon: 'P',
    title: 'Парковки',
    description: 'Создание, редактирование, удаление и ручное обновление загрузки парковок.',
  },
  {
    to: '/admin/zones',
    icon: 'Z',
    title: 'Зоны',
    description: 'Управление зонами внутри выбранной парковки и обновление занятых мест.',
  },
  {
    to: '/admin/users',
    icon: 'U',
    title: 'Пользователи',
    description: 'Создание admin/driver пользователей, роли, язык и активность аккаунта.',
  },
  {
    to: '/admin/requests',
    icon: 'R',
    title: 'Запросы на парковку',
    description: 'Просмотр всех запросов на парковку, фильтр и изменение статуса.',
  },
];

function AdminStatCard({ title, value, description, icon, variant = 'info' }) {
  return (
    <Card className="admin-stat-card">
      <span className={`admin-stat-card__icon admin-stat-card__icon--${variant}`}>{icon}</span>
      <strong>{value}</strong>
      <span>{title}</span>
      <p>{description}</p>
    </Card>
  );
}

function ResultGrid({ rows }) {
  if (!rows.length) return null;

  return (
    <div className="admin-result-grid">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value ?? '—'}</strong>
        </div>
      ))}
    </div>
  );
}

function AdminDashboardPage() {
  const [summary, setSummary] = useState({
    parkings: 0,
    users: 0,
    requests: 0,
    metrics: 0,
  });

  const [latestMetric, setLatestMetric] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeedConfirmOpen, setIsSeedConfirmOpen] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [seedError, setSeedError] = useState('');

  const [isHistoryConfirmOpen, setIsHistoryConfirmOpen] = useState(false);
  const [isGeneratingHistory, setIsGeneratingHistory] = useState(false);
  const [historyResult, setHistoryResult] = useState(null);
  const [historyError, setHistoryError] = useState('');

  const [isTrainConfirmOpen, setIsTrainConfirmOpen] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainResult, setTrainResult] = useState(null);
  const [trainError, setTrainError] = useState('');

  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [
        parkingsResponse,
        usersResponse,
        requestsResponse,
        metricsResponse,
        latestMetricResponse,
      ] = await Promise.allSettled([
        getAllParkings(),
        getUsers({ limit: 100, offset: 0 }),
        getParkingRequests({ limit: 100, offset: 0 }),
        getModelMetrics({ limit: 100, offset: 0 }),
        getLatestModelMetric(),
      ]);

      if (parkingsResponse.status !== 'fulfilled') throw parkingsResponse.reason;
      if (usersResponse.status !== 'fulfilled') throw usersResponse.reason;
      if (requestsResponse.status !== 'fulfilled') throw requestsResponse.reason;

      setSummary({
        parkings: extractItems(parkingsResponse.value).length,
        users: extractItems(usersResponse.value).length,
        requests: extractItems(requestsResponse.value).length,
        metrics: metricsResponse.status === 'fulfilled'
          ? extractItems(metricsResponse.value).length
          : 0,
      });

      setLatestMetric(
        latestMetricResponse.status === 'fulfilled'
          ? latestMetricResponse.value
          : null,
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось загрузить сводку админ-панели.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleSeedDemoData = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    setSeedError('');

    try {
      const response = await seedDemoData(seedPayload);
      setSeedResult(response);
      setIsSeedConfirmOpen(false);
      await loadSummary();
    } catch (requestError) {
      setSeedError(getErrorMessage(requestError, 'Не удалось сгенерировать demo data.'));
    } finally {
      setIsSeeding(false);
    }
  };

  const handleGenerateInfrastructureHistory = async () => {
    setIsGeneratingHistory(true);
    setHistoryResult(null);
    setHistoryError('');

    try {
      const response = await generateInfrastructureHistory(infrastructureHistoryPayload);
      setHistoryResult(response);
      setIsHistoryConfirmOpen(false);
      await loadSummary();
    } catch (requestError) {
      setHistoryError(getErrorMessage(requestError, 'Не удалось сгенерировать историю по инфраструктуре.'));
    } finally {
      setIsGeneratingHistory(false);
    }
  };

  const handleTrainModel = async () => {
    setIsTraining(true);
    setTrainResult(null);
    setTrainError('');

    try {
      const response = await trainPredictionModel(trainPayload);
      setTrainResult(response);
      setIsTrainConfirmOpen(false);
      await loadSummary();
    } catch (requestError) {
      setTrainError(getErrorMessage(requestError, 'Не удалось переобучить ML-модель.'));
    } finally {
      setIsTraining(false);
    }
  };

  const seedRows = useMemo(() => {
    if (!seedResult) return [];

    return [
      ['Парковки создано', formatNumber(seedResult.created_parkings)],
      ['Парковки обновлено', formatNumber(seedResult.updated_parkings)],
      ['Зоны создано', formatNumber(seedResult.created_zones)],
      ['Зоны обновлено', formatNumber(seedResult.updated_zones)],
      ['Driver пользователей', formatNumber(seedResult.created_drivers)],
      ['История загрузки', formatNumber(seedResult.history_records_created)],
      ['Запросы', formatNumber(seedResult.parking_requests_created)],
      ['Рекомендации', formatNumber(seedResult.recommendations_created)],
      ['Уведомления', formatNumber(seedResult.notifications_created)],
      ['Прогнозы', formatNumber(seedResult.predictions_created)],
      ['Метрики модели', formatNumber(seedResult.model_metrics_created)],
    ];
  }, [seedResult]);

  const historyRows = useMemo(() => {
    if (!historyResult) return [];

    return [
      ['Парковок обработано', formatNumber(historyResult.parkings_processed)],
      ['Объектов рядом учтено', formatNumber(historyResult.nearby_objects_used)],
      ['История создана', formatNumber(historyResult.history_records_created)],
      ['Заявки созданы', formatNumber(historyResult.parking_requests_created)],
      ['Дней истории', formatNumber(historyResult.days)],
      ['Точек в день', formatNumber(historyResult.history_points_per_day)],
      ['Начато', formatDateTime(historyResult.started_at)],
      ['Завершено', formatDateTime(historyResult.finished_at)],
    ];
  }, [historyResult]);

  const trainRows = useMemo(() => {
    if (!trainResult) return [];

    return [
      ['Модель', trainResult.model_name],
      ['Parking ID', trainResult.parking_id || 'Общая модель'],
      ['Train rows', formatNumber(trainResult.train_rows_count)],
      ['Test rows', formatNumber(trainResult.test_rows_count)],
      ['MAE', trainResult.mae],
      ['MSE', trainResult.mse],
      ['R2 score', trainResult.r2_score],
      ['Metric ID', trainResult.metric_id],
      ['Файл модели', trainResult.model_file],
    ];
  }, [trainResult]);

  const latestMetricRows = useMemo(() => {
    if (!latestMetric) return [];

    return [
      ['Модель', latestMetric.model_name],
      ['Parking ID', latestMetric.parking_id || 'Общая модель'],
      ['MAE', latestMetric.mae],
      ['MSE', latestMetric.mse],
      ['R2 score', latestMetric.r2_score],
      ['Train rows', formatNumber(latestMetric.train_rows_count)],
      ['Test rows', formatNumber(latestMetric.test_rows_count)],
      ['Дата обучения', formatDateTime(latestMetric.created_at || latestMetric.trained_at)],
    ];
  }, [latestMetric]);

  return (
    <div className="page-stack admin-page">
      <PageHeader
        title="Админ-панель"
        subtitle="Компактный модуль администратора: парковки, инфраструктура, генерация истории и обучение ML-модели."
        badge="Admin only"
        actions={
          <Button variant="secondary" onClick={loadSummary} disabled={isLoading}>
            Обновить
          </Button>
        }
      />

      {error && <ErrorMessage title="Ошибка загрузки" message={error} />}

      {isLoading ? (
        <Card>
          <Loader text="Загружаем админ-сводку..." />
        </Card>
      ) : (
        <section className="stats-grid stats-grid--four admin-dashboard-stats">
          <AdminStatCard
            title="Парковки"
            value={formatNumber(summary.parkings)}
            description="Активные объекты системы."
            icon="P"
          />
          <AdminStatCard
            title="Пользователи"
            value={formatNumber(summary.users)}
            description="Администраторы и водители."
            icon="U"
            variant="success"
          />
          <AdminStatCard
            title="Запросы на парковку"
            value={formatNumber(summary.requests)}
            description="Запросы водителей."
            icon="R"
            variant="warning"
          />
          <AdminStatCard
            title="ML метрики"
            value={formatNumber(summary.metrics)}
            description="История обучений модели."
            icon="AI"
            variant="neutral"
          />
        </section>
      )}

      <section className="admin-link-grid">
        {adminLinks.map((link) => (
          <Link key={link.to} to={link.to} className="admin-link-card">
            <span>{link.icon}</span>
            <strong>{link.title}</strong>
            <p>{link.description}</p>
          </Link>
        ))}
      </section>

      <Card
        className="admin-ml-card"
        title="ML-панель инфраструктуры"
        subtitle="Полный цикл для защиты: изменить объекты рядом → сгенерировать историю → переобучить модель → проверить прогноз."
        actions={<Badge variant="info">Infrastructure ML</Badge>}
      >
        <div className="admin-ml-flow">
          <div>
            <span>1</span>
            <strong>Обновить инфраструктуру</strong>
            <p>Добавьте вузы, школы, ТЦ, кафе, кинотеатры и офисы в разделе парковок.</p>
            <Link to="/admin/parkings">Открыть парковки</Link>
          </div>

          <div>
            <span>2</span>
            <strong>Сгенерировать историю</strong>
            <p>Backend создаст историю загруженности с учётом типа зоны, времени и объектов рядом.</p>
            <Button onClick={() => setIsHistoryConfirmOpen(true)} isLoading={isGeneratingHistory}>
              Сгенерировать историю
            </Button>
          </div>

          <div>
            <span>3</span>
            <strong>Переобучить модель</strong>
            <p>LinearRegression обучится на новой истории и начнёт учитывать инфраструктурные признаки.</p>
            <Button variant="secondary" onClick={() => setIsTrainConfirmOpen(true)} isLoading={isTraining}>
              Переобучить ML
            </Button>
          </div>

          <div>
            <span>4</span>
            <strong>Проверить прогноз</strong>
            <p>На странице прогнозирования будет видно объяснение: тип зоны, активные объекты и заявки.</p>
            <Link to="/predictions">Открыть прогнозы</Link>
          </div>
        </div>

        <div className="admin-ml-warning">
          <Badge variant="warning">Важно</Badge>
          <p>
            После изменения объектов рядом или типа зоны лучше заново сгенерировать историю и
            переобучить модель. Иначе прогноз может использовать старые закономерности.
          </p>
        </div>

        {historyError && <ErrorMessage title="История не создана" message={historyError} />}
        {trainError && <ErrorMessage title="Модель не обучена" message={trainError} />}

        {historyResult && (
          <div className="admin-seed-result admin-ml-result">
            <Badge variant="success">История создана</Badge>
            <strong>{historyResult.message || 'История загруженности успешно создана.'}</strong>
            <ResultGrid rows={historyRows} />
          </div>
        )}

        {trainResult && (
          <div className="admin-seed-result admin-ml-result">
            <Badge variant="success">ML обучена</Badge>
            <strong>{trainResult.message || 'Модель успешно обучена.'}</strong>
            <ResultGrid rows={trainRows} />
          </div>
        )}

        {latestMetric && (
          <div className="admin-ml-latest">
            <div>
              <Badge variant="neutral">Последняя метрика</Badge>
              <strong>Текущий результат обучения</strong>
            </div>
            <ResultGrid rows={latestMetricRows} />
          </div>
        )}
      </Card>

      <Card
        title="Demo data"
        subtitle="Старый генератор демонстрационных данных. Для новой инфраструктурной ML-логики лучше использовать ML-панель выше."
        actions={<Badge variant="warning">Seed</Badge>}
      >
        <div className="admin-seed-box">
          <div>
            <strong>POST /api/v1/admin/seed-demo-data</strong>
            <p>
              Будут созданы демонстрационные парковки, зоны, история, запросы на парковку,
              рекомендации, уведомления, прогнозы и метрики модели. reset=false.
            </p>
          </div>

          <Button onClick={() => setIsSeedConfirmOpen(true)} isLoading={isSeeding}>
            Сгенерировать demo data
          </Button>
        </div>

        {seedError && <ErrorMessage title="Demo data не создана" message={seedError} />}

        {seedResult && (
          <div className="admin-seed-result">
            <Badge variant="success">Успешно</Badge>
            <strong>{seedResult.message || 'Demo data успешно создана.'}</strong>
            <ResultGrid rows={seedRows} />
          </div>
        )}
      </Card>

      <AdminConfirmDialog
        isOpen={isHistoryConfirmOpen}
        title="Сгенерировать историю по инфраструктуре?"
        description="Backend удалит старую generated-историю и создаст новую историю загрузки с учётом объектов рядом."
        badge="Infrastructure history"
        variant="warning"
        confirmLabel="Сгенерировать"
        isLoading={isGeneratingHistory}
        details={[
          { label: 'reset_generated', value: String(infrastructureHistoryPayload.reset_generated) },
          { label: 'days', value: String(infrastructureHistoryPayload.days) },
          { label: 'points/day', value: String(infrastructureHistoryPayload.history_points_per_day) },
          { label: 'generate_requests', value: String(infrastructureHistoryPayload.generate_requests) },
          { label: 'max_requests', value: String(infrastructureHistoryPayload.max_requests_per_point) },
        ]}
        onCancel={() => setIsHistoryConfirmOpen(false)}
        onConfirm={handleGenerateInfrastructureHistory}
      />

      <AdminConfirmDialog
        isOpen={isTrainConfirmOpen}
        title="Переобучить ML-модель?"
        description="Модель будет заново обучена на истории загрузки, включая признаки инфраструктуры."
        badge="Train ML"
        variant="warning"
        confirmLabel="Переобучить"
        isLoading={isTraining}
        details={[
          { label: 'parking_id', value: 'null / общая модель' },
          { label: 'test_size', value: String(trainPayload.test_size) },
          { label: 'min_rows', value: String(trainPayload.min_rows) },
        ]}
        onCancel={() => setIsTrainConfirmOpen(false)}
        onConfirm={handleTrainModel}
      />

      <AdminConfirmDialog
        isOpen={isSeedConfirmOpen}
        title="Сгенерировать demo data?"
        description="Backend добавит демонстрационные данные для защиты дипломного проекта. Для инфраструктурной модели лучше использовать ML-панель."
        badge="Seed demo"
        variant="warning"
        confirmLabel="Запустить seed"
        isLoading={isSeeding}
        details={[
          { label: 'reset', value: String(seedPayload.reset) },
          { label: 'days', value: String(seedPayload.days) },
          { label: 'requests', value: String(seedPayload.requests_count) },
          { label: 'predictions', value: String(seedPayload.predictions_count) },
        ]}
        onCancel={() => setIsSeedConfirmOpen(false)}
        onConfirm={handleSeedDemoData}
      />
    </div>
  );
}

export default AdminDashboardPage;