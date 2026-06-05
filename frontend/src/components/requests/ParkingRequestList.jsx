import Badge from '../common/Badge';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import Loader from '../common/Loader';
import { formatDateTime } from '../../utils/formatters';

const getStatusVariant = (status) => {
  if (status === 'recommended' || status === 'completed') return 'success';
  if (status === 'processing') return 'warning';
  if (status === 'cancelled' || status === 'canceled' || status === 'rejected') return 'danger';
  return 'info';
};

const getStatusLabel = (status) => {
  const labels = {
    created: 'Создан',
    processing: 'В обработке',
    recommended: 'Рекомендация получена',
    completed: 'Завершен',
    cancelled: 'Отменен',
    canceled: 'Отменен',
    pending: 'Ожидает',
    approved: 'Подтвержден',
    rejected: 'Отклонен',
  };

  return labels[status] || status || 'Неизвестно';
};

const canCancelRequest = (request) => !['cancelled', 'canceled', 'completed'].includes(request?.status);
const canRecommendRequest = (request) => !['cancelled', 'canceled', 'completed'].includes(request?.status);

function ParkingRequestList({
  requests = [],
  parkingById = {},
  isLoading = false,
  actionState = {},
  onCancel,
  onRecommend,
}) {
  if (isLoading) {
    return (
      <div className="requests-list__loader">
        <Loader text="Загружаем мои запросы на парковку..." />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        title="Запросов на парковку пока нет"
        description="Создайте запрос “Ищу место” на странице парковок, затем получите по нему рекомендацию."
        icon="P"
      />
    );
  }

  return (
    <div className="requests-list">
      {requests.map((request) => {
        const parking = parkingById[request.parking_id];
        const currentAction = actionState[request.id];

        return (
          <article className="requests-list__item" key={request.id}>
            <div className="requests-list__main">
              <div className="requests-list__topline">
                <Badge variant="info">Запрос на парковку #{request.id}</Badge>
                <Badge variant={getStatusVariant(request.status)}>{getStatusLabel(request.status)}</Badge>
              </div>

              <h3>{parking?.name || `Парковка #${request.parking_id}`}</h3>
              <p>{parking?.address || 'Название парковки будет подтянуто через /parkings/{id}.'}</p>

              <div className="requests-list__meta">
                <div>
                  <span>parking_id</span>
                  <strong>{request.parking_id}</strong>
                </div>
                <div>
                  <span>requested_at</span>
                  <strong>{formatDateTime(request.requested_at)}</strong>
                </div>
                <div>
                  <span>selected_zone_id</span>
                  <strong>{request.selected_zone_id || '—'}</strong>
                </div>
              </div>

              <div className="requests-list__recommendation-text">
                <span>recommendation_text</span>
                <p>{request.recommendation_text || 'Рекомендация по этому запросу на парковку еще не получена.'}</p>
              </div>
            </div>

            <div className="requests-list__actions">
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => onRecommend(request)}
                isLoading={currentAction === 'recommend'}
                disabled={!canRecommendRequest(request) || Boolean(currentAction)}
              >
                Получить рекомендацию
              </Button>

              <Button
                variant="danger"
                size="sm"
                fullWidth
                onClick={() => onCancel(request)}
                isLoading={currentAction === 'cancel'}
                disabled={!canCancelRequest(request) || Boolean(currentAction)}
              >
                Отменить
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default ParkingRequestList;