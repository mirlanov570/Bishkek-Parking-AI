import Badge from '../common/Badge';
import EmptyState from '../common/EmptyState';
import Loader from '../common/Loader';
import { formatDateTime, formatNumber, formatPercent } from '../../utils/formatters';
import { getLoadLabel } from '../../utils/loadStatus';

const cleanParkingName = (name, fallback = 'Парковка') =>
  String(name || fallback)
    .replace(/^Demo Parking\s*[—-]\s*/i, '')
    .trim() || fallback;

const getBadgeVariant = (prediction) => {
  const color = String(prediction?.predicted_color || '').toLowerCase();
  const level = String(prediction?.predicted_load_level || '').toLowerCase();
  const percent = Number(prediction?.predicted_load_percentage);

  if (color === 'red' || level === 'high' || percent >= 80) return 'danger';
  if (color === 'yellow' || level === 'medium' || percent >= 50) return 'warning';
  return 'success';
};

function PredictionHistoryTable({ predictions = [], parkingById = {}, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="prediction-history__state">
        <Loader text="Загружаем историю прогнозов..." />
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <EmptyState
        icon="≡"
        title="История прогнозов пока пустая"
        description="Создайте первый прогноз, и он появится здесь."
      />
    );
  }

  return (
    <div className="prediction-history prediction-history--modern">
      <div className="prediction-history__table-wrap">
        <table className="prediction-history__table prediction-history__table--modern">
          <thead>
            <tr>
              <th>Парковка</th>
              <th>Когда прогнозируем</th>
              <th>Свободно</th>
              <th>Занято</th>
              <th>Загрузка</th>
              <th>Создано</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((prediction) => {
              const parking = parkingById[prediction.parking_id];
              const level = prediction.predicted_load_level;

              return (
                <tr key={prediction.id}>
                  <td>
                    <strong>{cleanParkingName(parking?.name || parking?.parking_name, `Парковка #${prediction.parking_id}`)}</strong>
                    <span>Прогноз #{prediction.id}</span>
                  </td>
                  <td>{formatDateTime(prediction.prediction_datetime)}</td>
                  <td>{formatNumber(prediction.predicted_free_places)}</td>
                  <td>{formatNumber(prediction.predicted_occupied_places)}</td>
                  <td>
                    <Badge variant={getBadgeVariant(prediction)}>
                      {formatPercent(prediction.predicted_load_percentage)} · {getLoadLabel(level)}
                    </Badge>
                  </td>
                  <td>{formatDateTime(prediction.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PredictionHistoryTable;