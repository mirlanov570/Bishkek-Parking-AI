import Badge from '../common/Badge';
import Card from '../common/Card';
import EmptyState from '../common/EmptyState';
import { formatDateTime, formatNumber, formatPercent } from '../../utils/formatters';
import { getLoadLabel } from '../../utils/loadStatus';
import { getInfrastructureSummary, getZoneTypeLabel } from '../../utils/infrastructure';

const cleanParkingName = (name, fallback = 'Парковка') =>
  String(name || fallback)
    .replace(/^Demo Parking\s*[—-]\s*/i, '')
    .trim() || fallback;

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const getResultTone = (prediction) => {
  const color = String(prediction?.predicted_color || '').toLowerCase();
  const level = String(prediction?.predicted_load_level || '').toLowerCase();
  const percent = toNumber(prediction?.predicted_load_percentage, 0);

  if (color === 'red' || level === 'high' || percent >= 80) return 'danger';
  if (color === 'yellow' || level === 'medium' || percent >= 50) return 'warning';
  return 'success';
};

const getResultCopy = (tone) => {
  if (tone === 'danger') {
    return {
      title: 'Высокая загрузка',
      text: 'Лучше выбрать другое время или посмотреть альтернативную парковку.',
      badge: 'Мест может не хватить',
    };
  }

  if (tone === 'warning') {
    return {
      title: 'Средняя загрузка',
      text: 'Свободные места возможны, но лучше приехать немного заранее.',
      badge: 'Есть риск ожидания',
    };
  }

  return {
    title: 'Низкая загрузка',
    text: 'Хорошее время для поездки: вероятность найти место выше.',
    badge: 'Можно ехать',
  };
};

const getBadgeVariantByTone = (tone) => {
  if (tone === 'danger') return 'danger';
  if (tone === 'warning') return 'warning';
  return 'success';
};

const getFeatureNumber = (features, key) => {
  const value = Number(features?.[key] || 0);
  return Number.isFinite(value) ? value : 0;
};

const buildInfrastructureDetails = (features) => [
  {
    key: 'zone_type',
    label: 'Тип зоны',
    value: getZoneTypeLabel(features?.zone_type),
  },
  {
    key: 'active_objects_count',
    label: 'Активные объекты рядом',
    value: formatNumber(getFeatureNumber(features, 'active_objects_count')),
  },
  {
    key: 'active_objects_weight',
    label: 'Суммарный вес объектов',
    value: getFeatureNumber(features, 'active_objects_weight').toFixed(2),
  },
  {
    key: 'requests_last_hour',
    label: 'Заявки за последний час',
    value: formatNumber(getFeatureNumber(features, 'requests_last_hour')),
  },
  {
    key: 'nearby_university_count',
    label: 'Вузы активны',
    value: formatNumber(getFeatureNumber(features, 'nearby_university_count')),
  },
  {
    key: 'nearby_school_count',
    label: 'Школы активны',
    value: formatNumber(getFeatureNumber(features, 'nearby_school_count')),
  },
  {
    key: 'nearby_mall_count',
    label: 'ТЦ активны',
    value: formatNumber(getFeatureNumber(features, 'nearby_mall_count')),
  },
  {
    key: 'nearby_office_count',
    label: 'Офисы активны',
    value: formatNumber(getFeatureNumber(features, 'nearby_office_count')),
  },
];

const normalizeFeatureValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? formatNumber(value) : value.toFixed(2);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatFeatureLabel = (key) =>
  String(key)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function PredictionResultCard({ prediction, parking }) {
  if (!prediction) {
    return (
      <Card
        className="prediction-result-card prediction-result-card--modern prediction-result-card--empty"
        title="Результат"
        subtitle="Здесь появится понятный результат после расчёта прогноза."
      >
        <EmptyState
          icon="↗"
          title="Прогноз ещё не получен"
          description="Заполните форму слева и нажмите “Получить прогноз”."
        />
      </Card>
    );
  }

  const tone = getResultTone(prediction);
  const copy = getResultCopy(tone);
  const badgeVariant = getBadgeVariantByTone(tone);
  const loadLevel = prediction.predicted_load_level || prediction.predictedLoadLevel;
  const color = prediction.predicted_color || prediction.predictedColor;
  const percent = toNumber(prediction.predicted_load_percentage, 0);
  const features = prediction.features || {};
  const infrastructureSummary = getInfrastructureSummary(features);
  const infrastructureDetails = buildInfrastructureDetails(features);
  const featureEntries = Object.entries(features).slice(0, 8);
  const parkingName = cleanParkingName(
    parking?.name || parking?.parking_name,
    prediction.parking_id ? `Парковка #${prediction.parking_id}` : 'Парковка',
  );

  return (
    <Card className={`prediction-result-card prediction-result-card--modern prediction-result-card--${tone}`}>
      <div className="prediction-result-hero">
        <div className="prediction-result-hero__content">
          <div className="prediction-result-card__badges">
            <Badge variant={badgeVariant}>{copy.badge}</Badge>
            <Badge variant="neutral">{prediction.model_name || prediction.modelName || 'AI model'}</Badge>
          </div>

          <span className="prediction-result-card__eyebrow">Результат прогноза</span>
          <h2>{copy.title}</h2>
          <p>{copy.text}</p>

          <div className="prediction-result-card__parking">
            <strong>{parkingName}</strong>
            <span>{formatDateTime(prediction.prediction_datetime || prediction.predictionDatetime)}</span>
          </div>
        </div>

        <div className="prediction-gauge" style={{ '--prediction-percent': `${Math.min(Math.max(percent, 0), 100)}%` }}>
          <div className="prediction-gauge__inner">
            <strong>{formatPercent(percent)}</strong>
            <span>загрузка</span>
          </div>
        </div>
      </div>

      <div className="prediction-result-metrics">
        <div>
          <span>Свободных мест</span>
          <strong>{formatNumber(prediction.predicted_free_places)}</strong>
        </div>
        <div>
          <span>Занятых мест</span>
          <strong>{formatNumber(prediction.predicted_occupied_places)}</strong>
        </div>
        <div>
          <span>Уровень</span>
          <strong>{getLoadLabel(loadLevel)}</strong>
        </div>
        <div>
          <span>Цвет backend</span>
          <strong>{color || '—'}</strong>
        </div>
      </div>

      <section className="prediction-infrastructure-explain">
        <div className="prediction-infrastructure-explain__header">
          <div>
            <span>Почему такой прогноз</span>
            <h3>Модель учитывает инфраструктуру рядом</h3>
          </div>
          <Badge variant={infrastructureSummary.hasInfrastructure ? 'info' : 'neutral'}>
            {getZoneTypeLabel(infrastructureSummary.zoneType)}
          </Badge>
        </div>

        <div className="prediction-infrastructure-grid">
          {infrastructureDetails.map((item) => (
            <div key={item.key}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <p>
          Эти признаки приходят из backend поля <code>features</code>: тип зоны, день недели, час,
          активные объекты рядом и количество заявок водителей за последний час.
        </p>
      </section>

      <details className="prediction-result-details">
        <summary>Показать технические признаки расчёта</summary>

        {featureEntries.length === 0 ? (
          <p>Backend не вернул список features для этого прогноза.</p>
        ) : (
          <div className="prediction-features-grid prediction-features-grid--modern">
            {featureEntries.map(([key, value]) => (
              <div key={key}>
                <span>{formatFeatureLabel(key)}</span>
                <strong>{normalizeFeatureValue(value)}</strong>
              </div>
            ))}
          </div>
        )}
      </details>
    </Card>
  );
}

export default PredictionResultCard;