import Badge from '../common/Badge';
import Button from '../common/Button';
import Card from '../common/Card';
import EmptyState from '../common/EmptyState';
import Loader from '../common/Loader';
import { formatDateTime, formatNumber } from '../../utils/formatters';

const formatMetric = (value, digits = 4) => {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
    return '—';
  }

  return Number(value).toFixed(digits);
};

const getQualityLabel = (r2Score) => {
  const score = Number(r2Score);

  if (!Number.isFinite(score)) return 'Нет данных';
  if (score >= 0.8) return 'Хорошее качество';
  if (score >= 0.5) return 'Среднее качество';
  return 'Нужно улучшить';
};

const getQualityVariant = (r2Score) => {
  const score = Number(r2Score);

  if (!Number.isFinite(score)) return 'neutral';
  if (score >= 0.8) return 'success';
  if (score >= 0.5) return 'warning';
  return 'danger';
};

function ModelMetricsCard({
  latestMetric,
  metrics = [],
  trainResult,
  isLoading = false,
  isAdmin = false,
  isTraining = false,
  onTrain,
}) {
  return (
    <Card
      className="model-metrics-card model-metrics-card--modern"
      title="Качество модели"
      subtitle="Здесь видно, насколько хорошо модель обучена. Чем ниже MAE/MSE и чем выше R², тем лучше."
      actions={
        isAdmin ? (
          <Button variant="secondary" size="sm" onClick={onTrain} isLoading={isTraining}>
            Обучить
          </Button>
        ) : null
      }
    >
      {isLoading ? (
        <div className="prediction-card-loader">
          <Loader text="Загружаем метрики модели..." />
        </div>
      ) : latestMetric ? (
        <>
          <div className="model-quality-banner">
            <Badge variant={getQualityVariant(latestMetric.r2_score)}>{getQualityLabel(latestMetric.r2_score)}</Badge>
            <strong>{latestMetric.model_name || 'Модель прогнозирования'}</strong>
            <span>{latestMetric.trained_at ? `Обучена: ${formatDateTime(latestMetric.trained_at)}` : 'Дата обучения не указана'}</span>
          </div>

          <div className="model-metrics-card__latest model-metrics-card__latest--modern">
            <div>
              <span>MAE</span>
              <strong>{formatMetric(latestMetric.mae)}</strong>
              <small>средняя ошибка</small>
            </div>
            <div>
              <span>MSE</span>
              <strong>{formatMetric(latestMetric.mse)}</strong>
              <small>штраф за большие ошибки</small>
            </div>
            <div>
              <span>R²</span>
              <strong>{formatMetric(latestMetric.r2_score)}</strong>
              <small>чем ближе к 1, тем лучше</small>
            </div>
            <div>
              <span>Train</span>
              <strong>{formatNumber(latestMetric.train_rows_count)}</strong>
              <small>строк обучения</small>
            </div>
            <div>
              <span>Test</span>
              <strong>{formatNumber(latestMetric.test_rows_count)}</strong>
              <small>строк проверки</small>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon="∑"
          title="Метрик пока нет"
          description="После обучения модели здесь появятся показатели качества."
          action={
            isAdmin ? (
              <Button variant="primary" onClick={onTrain} isLoading={isTraining}>
                Обучить модель
              </Button>
            ) : null
          }
        />
      )}

      {trainResult && (
        <div className="model-metrics-card__train-result model-metrics-card__train-result--modern">
          <strong>Последнее обучение</strong>
          <p>{trainResult.message || 'Модель успешно обучена.'}</p>
          <div>
            <Badge variant="success">metric_id: {trainResult.metric_id || '—'}</Badge>
            <Badge variant="info">train: {formatNumber(trainResult.train_rows_count)}</Badge>
            <Badge variant="info">test: {formatNumber(trainResult.test_rows_count)}</Badge>
          </div>
        </div>
      )}

      {metrics.length > 0 && (
        <div className="model-metrics-card__history model-metrics-card__history--modern">
          <strong>История обучения</strong>
          <div className="model-metrics-card__history-list">
            {metrics.slice(0, 5).map((metric) => (
              <div key={metric.id}>
                <span>{formatDateTime(metric.trained_at)}</span>
                <strong>
                  MAE {formatMetric(metric.mae)} · MSE {formatMetric(metric.mse)} · R²{' '}
                  {formatMetric(metric.r2_score)}
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default ModelMetricsCard;