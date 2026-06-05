import { useMemo, useState } from 'react';
import Button from '../common/Button';
import Card from '../common/Card';

import Badge from '../common/Badge';
import { getZoneTypeLabel } from '../../utils/infrastructure';

const buildParkingLabel = (parking) => {
  if (!parking) return '';

  const freePlaces = parking.free_places ?? '—';
  const load = parking.load_percentage ?? '—';

  const zone = getZoneTypeLabel(parking.zone_type);

  return `#${parking.id} — ${parking.name} (${zone}, ${freePlaces} свободно, ${load}% загрузка)`;
};

function RecommendationForm({ parkings = [], onSubmit, isSubmitting = false }) {
  const [formData, setFormData] = useState({
    requested_parking_id: '',
    user_latitude: '',
    user_longitude: '',
    use_prediction: true,
    popularity_days: 30,
  });

  const activeParkings = useMemo(
    () => parkings.filter((parking) => parking?.is_active !== false),
    [parkings],
  );

  const selectedParking = useMemo(
    () => activeParkings.find((parking) => String(parking.id) === String(formData.requested_parking_id)),
    [activeParkings, formData.requested_parking_id],
  );

  const updateField = (fieldName, value) => {
    setFormData((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      use_prediction: Boolean(formData.use_prediction),
      popularity_days: Number(formData.popularity_days) || 30,
    };

    if (formData.requested_parking_id) {
      payload.requested_parking_id = Number(formData.requested_parking_id);
    }

    if (formData.user_latitude !== '') {
      payload.user_latitude = Number(formData.user_latitude);
    }

    if (formData.user_longitude !== '') {
      payload.user_longitude = Number(formData.user_longitude);
    }

    onSubmit(payload);
  };

  return (
    <Card
      className="recommendation-form-card"
      title="Получить рекомендацию"
      subtitle="AI выберет оптимальную парковку с учетом загрузки, прогноза, расстояния, популярности и инфраструктуры рядом."
    >
      <form className="recommendation-form" onSubmit={handleSubmit}>
        <label className="form-group">
          <span className="form-label">Желаемая парковка</span>
          <select
            className="form-input"
            value={formData.requested_parking_id}
            onChange={(event) => updateField('requested_parking_id', event.target.value)}
            disabled={isSubmitting}
          >
            <option value="">Любая подходящая парковка</option>
            {activeParkings.map((parking) => (
              <option key={parking.id} value={parking.id}>
                {buildParkingLabel(parking)}
              </option>
            ))}
          </select>

          {selectedParking && (
            <div className="recommendation-selected-zone">
              <Badge variant="info">{getZoneTypeLabel(selectedParking.zone_type)}</Badge>
              <span>
                Backend сравнит эту парковку с другими вариантами и учтёт активные объекты рядом.
              </span>
            </div>
          )}
        </label>

        <div className="recommendation-form__grid">
          <label className="form-group">
            <span className="form-label">Широта пользователя</span>
            <input
              className="form-input"
              type="number"
              min="-90"
              max="90"
              step="0.000001"
              value={formData.user_latitude}
              onChange={(event) => updateField('user_latitude', event.target.value)}
              placeholder="например 42.8746"
              disabled={isSubmitting}
            />
          </label>

          <label className="form-group">
            <span className="form-label">Долгота пользователя</span>
            <input
              className="form-input"
              type="number"
              min="-180"
              max="180"
              step="0.000001"
              value={formData.user_longitude}
              onChange={(event) => updateField('user_longitude', event.target.value)}
              placeholder="например 74.5698"
              disabled={isSubmitting}
            />
          </label>
        </div>

        <div className="recommendation-form__grid recommendation-form__grid--settings">
          <label className="recommendation-form__checkbox">
            <input
              type="checkbox"
              checked={formData.use_prediction}
              onChange={(event) => updateField('use_prediction', event.target.checked)}
              disabled={isSubmitting}
            />
            <span>
              <strong>Использовать прогноз</strong>
              <small>Учитывать последнюю AI-оценку будущей загруженности.</small>
            </span>
          </label>

          <label className="form-group">
            <span className="form-label">Популярность за дней</span>
            <input
              className="form-input"
              type="number"
              min="1"
              max="365"
              value={formData.popularity_days}
              onChange={(event) => updateField('popularity_days', event.target.value)}
              disabled={isSubmitting}
            />
          </label>
        </div>

        <div className="recommendation-form__actions">
          <Button type="submit" isLoading={isSubmitting}>
            Получить рекомендацию
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default RecommendationForm;