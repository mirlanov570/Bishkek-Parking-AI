import { useCallback, useEffect, useMemo, useState } from 'react';
import { getLatestModelMetric, getModelMetrics } from '../api/modelMetricsApi';
import { getAllParkings } from '../api/parkingsApi';
import { getPredictions, predictParkingLoad, trainPredictionModel } from '../api/predictionsApi';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import ErrorMessage from '../components/common/ErrorMessage';
import Loader from '../components/common/Loader';
import PageHeader from '../components/common/PageHeader';
import ModelMetricsCard from '../components/predictions/ModelMetricsCard';
import PredictionForm from '../components/predictions/PredictionForm';
import PredictionHistoryTable from '../components/predictions/PredictionHistoryTable';
import PredictionResultCard from '../components/predictions/PredictionResultCard';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiErrors';
import { formatDateTime, formatNumber, formatPercent } from '../utils/formatters';

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const cleanParkingName = (name, fallback = 'Парковка') =>
  String(name || fallback)
    .replace(/^Demo Parking\s*[—-]\s*/i, '')
    .trim() || fallback;

const normalizeParkings = (items) =>
  items.map((parking) => ({
    ...parking,
    name: cleanParkingName(parking?.name || parking?.parking_name, `Парковка #${parking?.id}`),
  }));

const buildParkingMap = (parkings) =>
  parkings.reduce((acc, parking) => {
    if (parking?.id) {
      acc[parking.id] = parking;
    }

    return acc;
  }, {});

const sortLatestFirst = (items) =>
  [...items].sort(
    (left, right) =>
      new Date(right.created_at || right.prediction_datetime || 0) -
      new Date(left.created_at || left.prediction_datetime || 0),
  );

const getHighLoadCount = (predictions) =>
  predictions.filter((prediction) => {
    const level = String(prediction.predicted_load_level || '').toLowerCase();
    const color = String(prediction.predicted_color || '').toLowerCase();
    const percent = Number(prediction.predicted_load_percentage);

    return level === 'high' || color === 'red' || percent >= 80;
  }).length;

function StatCard({ label, value, hint, icon, variant = 'info' }) {
  return (
    <div className={`prediction-stat prediction-stat--${variant}`}>
      <div className="prediction-stat__icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <p>{hint}</p>}
      </div>
    </div>
  );
}

function PredictionsPage() {
  const { isAdmin } = useAuth();

  const [parkings, setParkings] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [latestMetric, setLatestMetric] = useState(null);
  const [trainResult, setTrainResult] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const parkingById = useMemo(() => buildParkingMap(parkings), [parkings]);
  const highLoadCount = useMemo(() => getHighLoadCount(predictions), [predictions]);

  const selectedParking = latestPrediction?.parking_id ? parkingById[latestPrediction.parking_id] : null;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [parkingsResult, predictionsResult, metricsResult, latestMetricResult] =
        await Promise.allSettled([
          getAllParkings(),
          getPredictions({ limit: 50, offset: 0 }),
          getModelMetrics({ limit: 20, offset: 0 }),
          getLatestModelMetric(),
        ]);

      if (parkingsResult.status === 'fulfilled') {
        setParkings(normalizeParkings(extractItems(parkingsResult.value)));
      } else {
        throw parkingsResult.reason;
      }

      if (predictionsResult.status === 'fulfilled') {
        const predictionItems = sortLatestFirst(extractItems(predictionsResult.value));
        setPredictions(predictionItems);
        setLatestPrediction((currentPrediction) => currentPrediction || predictionItems[0] || null);
      } else {
        setPredictions([]);
      }

      if (metricsResult.status === 'fulfilled') {
        setMetrics(extractItems(metricsResult.value));
      } else {
        setMetrics([]);
      }

      if (latestMetricResult.status === 'fulfilled') {
        setLatestMetric(latestMetricResult.value || null);
      } else {
        setLatestMetric(null);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Не удалось загрузить страницу прогнозирования.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshPredictions = async (currentPrediction) => {
    const predictionsResponse = await getPredictions({ limit: 50, offset: 0 });
    const predictionItems = sortLatestFirst(extractItems(predictionsResponse));

    setPredictions(predictionItems);
    setLatestPrediction(currentPrediction || predictionItems[0] || null);
  };

  const handlePredict = async (payload) => {
    setIsSubmitting(true);
    setError('');
    setFeedback('');

    try {
      const prediction = await predictParkingLoad(payload);
      setLatestPrediction(prediction);
      setFeedback('Прогноз готов. Ниже показана ожидаемая загрузка выбранной парковки.');
      await refreshPredictions(prediction);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Не удалось получить прогноз.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrainModel = async () => {
    setIsTraining(true);
    setError('');
    setFeedback('');

    try {
      const result = await trainPredictionModel({});
      setTrainResult(result);
      setFeedback(result?.message || 'Модель успешно обучена. Метрики обновлены.');

      const [metricsResponse, latestMetricResponse] = await Promise.allSettled([
        getModelMetrics({ limit: 20, offset: 0 }),
        getLatestModelMetric(),
      ]);

      if (metricsResponse.status === 'fulfilled') {
        setMetrics(extractItems(metricsResponse.value));
      }

      if (latestMetricResponse.status === 'fulfilled') {
        setLatestMetric(latestMetricResponse.value || null);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Не удалось обучить модель.'));
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="page-stack predictions-page predictions-page--modern">
      <PageHeader
        title="Прогнозирование"
        subtitle="Выберите парковку и время, чтобы заранее понять, будет ли свободное место."
        badge="AI прогноз"
        actions={
          <div className="prediction-header-actions">
            {isAdmin && (
              <Button variant="secondary" onClick={handleTrainModel} isLoading={isTraining}>
                Обучить модель
              </Button>
            )}
            <Button variant="secondary" onClick={loadData} isLoading={isLoading}>
              Обновить
            </Button>
          </div>
        }
      />

      {error && <ErrorMessage title="Ошибка прогнозирования" message={error} />}

      {feedback && (
        <div className="prediction-feedback" role="status">
          <span aria-hidden="true">✓</span>
          <p>{feedback}</p>
        </div>
      )}

      <section className="prediction-guide">
        <Card className="prediction-guide__card prediction-guide__card--primary">
          <div className="prediction-guide__content">
            <Badge variant="info">Как это работает</Badge>
            <h2>Прогноз показывает будущую загруженность парковки</h2>
            <p>
              Система берёт выбранную дату и время, отправляет запрос в backend и показывает ожидаемые
              свободные места, занятые места и уровень загрузки.
            </p>
          </div>
        </Card>

        <div className="prediction-guide__steps">
          <div>
            <strong>1</strong>
            <span>Выберите парковку</span>
          </div>
          <div>
            <strong>2</strong>
            <span>Укажите дату и время</span>
          </div>
          <div>
            <strong>3</strong>
            <span>Получите понятный результат</span>
          </div>
        </div>
      </section>

      <section className="prediction-stats-grid" aria-label="Сводка прогнозирования">
        <StatCard
          icon="P"
          label="Парковок доступно"
          value={isLoading ? '...' : formatNumber(parkings.length)}
          hint="Можно выбрать в форме"
          variant="info"
        />
        <StatCard
          icon="↗"
          label="Прогнозов в истории"
          value={isLoading ? '...' : formatNumber(predictions.length)}
          hint="Последние 50 записей"
          variant="success"
        />
        <StatCard
          icon="!"
          label="Высокая загрузка"
          value={isLoading ? '...' : formatNumber(highLoadCount)}
          hint="Красные прогнозы"
          variant="warning"
        />
        <StatCard
          icon="∑"
          label="Качество модели"
          value={latestMetric?.r2_score !== undefined && latestMetric?.r2_score !== null ? formatPercent(Number(latestMetric.r2_score) * 100) : '—'}
          hint={latestMetric?.trained_at ? formatDateTime(latestMetric.trained_at) : 'Метрики появятся после обучения'}
          variant="neutral"
        />
      </section>

      {isLoading ? (
        <Card className="predictions-loading-card">
          <Loader text="Загружаем данные для прогнозирования..." />
        </Card>
      ) : (
        <>
          <section className="predictions-main-grid">
            <PredictionForm
              parkings={parkings}
              isLoading={isLoading}
              isSubmitting={isSubmitting}
              onSubmit={handlePredict}
            />

            <PredictionResultCard prediction={latestPrediction} parking={selectedParking} />
          </section>

          <section className="predictions-section-grid">
            <Card
              className="prediction-history-card"
              title="История прогнозов"
              subtitle="Последние прогнозы. На телефоне таблицу можно прокручивать горизонтально."
            >
              <PredictionHistoryTable
                predictions={predictions}
                parkingById={parkingById}
                isLoading={isLoading}
              />
            </Card>

            <ModelMetricsCard
              latestMetric={latestMetric}
              metrics={metrics}
              trainResult={trainResult}
              isLoading={isLoading}
              isAdmin={isAdmin}
              isTraining={isTraining}
              onTrain={handleTrainModel}
            />
          </section>
        </>
      )}
    </div>
  );
}

export default PredictionsPage;