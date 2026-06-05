import Badge from '../common/Badge';
import Card from '../common/Card';
import LoadProgress from '../parkings/LoadProgress';
import { formatDateTime, formatNumber, formatPercent } from '../../utils/formatters';
import { getLoadLevel } from '../../utils/loadStatus';

import {
  formatObjectSchedule,
  getInfrastructureSummaryFromObjects,
  getNearbyObjectTypeLabel,
  getZoneTypeLabel,
} from '../../utils/infrastructure';

const formatDecimal = (value, suffix = '', fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) return fallback;

  return `${numericValue.toFixed(2)}${suffix}`;
};

function RecommendationCard({
  recommendation,
  recommendedParking,
  requestedParking,
  nearbyObjects = [],
  isHighlighted = false,
}) {
  if (!recommendation) return null;

  const loadLevel = getLoadLevel(
    recommendedParking?.load_level || recommendation.current_load_percentage,
  );

  const parkingTitle = recommendedParking?.name || `Парковка #${recommendation.recommended_parking_id}`;
  const parkingAddress = recommendedParking?.address || 'Название будет подтянуто после ответа /parkings/{id}.';

  const zoneType = recommendedParking?.zone_type || 'mixed';
  const infrastructureSummary = getInfrastructureSummaryFromObjects(nearbyObjects);
  const topObjects = infrastructureSummary.activeObjects.slice(0, 4);

  return (
    <Card className={isHighlighted ? 'recommendation-card recommendation-card--highlighted' : 'recommendation-card'}>
      <div className="recommendation-card__header">
        <div>
          <div className="recommendation-card__badges">
            <Badge variant="info">Рекомендация #{recommendation.id}</Badge>
            <Badge variant="success">Parking #{recommendation.recommended_parking_id}</Badge>
            <Badge variant="neutral">{getZoneTypeLabel(zoneType)}</Badge>
          </div>
          <h2>{parkingTitle}</h2>
          <p>{parkingAddress}</p>
        </div>
        <span className="recommendation-card__date">
          {formatDateTime(recommendation.created_at)}
        </span>
      </div>

      {requestedParking && (
        <div className="recommendation-card__requested">
          <span>Запрошенная парковка</span>
          <strong>{requestedParking.name}</strong>
        </div>
      )}

      <div className="recommendation-card__parking-panel">
        <div className="recommendation-card__parking-icon" aria-hidden="true">
          P
        </div>
        <div>
          <strong>{parkingTitle}</strong>
          <span>{parkingAddress}</span>
        </div>
        {recommendedParking && (
          <div className="recommendation-card__parking-meta">
            <span>Свободно</span>
            <strong>{formatNumber(recommendedParking.free_places)}</strong>
          </div>
        )}
      </div>

      <div className="recommendation-card__metrics">
        <div>
          <span>Расстояние</span>
          <strong>{formatDecimal(recommendation.distance_km, ' км')}</strong>
        </div>
        <div>
          <span>Текущая загрузка</span>
          <strong>{formatPercent(recommendation.current_load_percentage)}</strong>
        </div>
        <div>
          <span>Прогноз загрузки</span>
          <strong>{formatPercent(recommendation.predicted_load_percentage)}</strong>
        </div>
        <div>
          <span>Ожидаемо свободно</span>
          <strong>{formatNumber(recommendation.expected_free_places)}</strong>
        </div>
        <div>
          <span>Score</span>
          <strong>{formatDecimal(recommendation.score)}</strong>
        </div>
      </div>

      <LoadProgress
        value={recommendation.current_load_percentage}
        level={loadLevel}
        label="Текущая загруженность"
        statusLabel={loadLevel}
      />

      <section className="recommendation-card__infrastructure">
        <div className="recommendation-card__infrastructure-header">
          <div>
            <span>Инфраструктура учтена</span>
            <strong>{getZoneTypeLabel(zoneType)}</strong>
          </div>
          <Badge variant={infrastructureSummary.activeObjectsCount > 0 ? 'info' : 'neutral'}>
            {formatNumber(infrastructureSummary.activeObjectsCount)} объектов
          </Badge>
        </div>

        <div className="recommendation-card__infrastructure-metrics">
          <div>
            <span>Активные объекты</span>
            <strong>{formatNumber(infrastructureSummary.activeObjectsCount)}</strong>
          </div>
          <div>
            <span>Суммарный вес</span>
            <strong>{infrastructureSummary.totalWeight.toFixed(2)}</strong>
          </div>
          <div>
            <span>Тип зоны</span>
            <strong>{zoneType}</strong>
          </div>
        </div>

        {topObjects.length > 0 ? (
          <div className="recommendation-card__objects">
            {topObjects.map((item) => (
              <article key={item.id}>
                <Badge variant="neutral">{getNearbyObjectTypeLabel(item.object_type)}</Badge>
                <strong>{item.name}</strong>
                <span>{formatObjectSchedule(item)}</span>
                <small>
                  {formatNumber(item.distance_m)} м · вес {Number(item.influence_weight || 0).toFixed(2)}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <p className="recommendation-card__empty-infrastructure">
            Для этой парковки активные объекты рядом не указаны или не попали в текущий график активности.
          </p>
        )}
      </section>

      <div className="recommendation-card__reason">
        <strong>Объяснение рекомендации</strong>
        <p>{recommendation.reason || 'Backend не вернул текст объяснения.'}</p>
      </div>
    </Card>
  );
}

export default RecommendationCard;