import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  cancelParkingRequest,
  getParkingRequests,
  updateParkingRequestStatus,
} from '../../api/parkingRequestsApi';
import { getAllParkings } from '../../api/parkingsApi';
import AdminConfirmDialog from '../../components/admin/AdminConfirmDialog';
import AdminModal from '../../components/admin/AdminModal';
import AdminTable from '../../components/admin/AdminTable';
import RequestStatusForm from '../../components/admin/RequestStatusForm';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ErrorMessage from '../../components/common/ErrorMessage';
import PageHeader from '../../components/common/PageHeader';
import { formatDateTime } from '../../utils/formatters';

const requestStatuses = [
  { value: 'all', label: 'Все статусы' },
  { value: 'created', label: 'created — создан' },
  { value: 'processing', label: 'processing — в обработке' },
  { value: 'recommended', label: 'recommended — рекомендация выдана' },
  { value: 'completed', label: 'completed — завершён' },
  { value: 'cancelled', label: 'cancelled — отменён' },
];

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

const getErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail || error?.apiError?.detail;

  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item?.msg || item?.message || JSON.stringify(item)).join('; ');
  }

  return error?.message || fallback;
};

const getStatusBadgeVariant = (status) => {
  if (status === 'completed' || status === 'recommended') return 'success';
  if (status === 'processing') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'info';
};

const getStatusLabel = (status) => {
  const labels = {
    created: 'Создан',
    processing: 'В обработке',
    recommended: 'Рекомендация выдана',
    completed: 'Завершён',
    cancelled: 'Отменён',
  };

  return labels[status] || status || '—';
};

function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [parkings, setParkings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestToCancel, setRequestToCancel] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');

  const parkingMap = useMemo(
    () =>
      parkings.reduce((acc, parking) => {
        if (parking?.id) {
          acc[parking.id] = parking;
        }

        return acc;
      }, {}),
    [parkings],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setWarning('');

    const params = {
      limit: 100,
      offset: 0,
    };

    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }

    try {
      const [requestsResult, parkingsResult] = await Promise.allSettled([
        getParkingRequests(params),
        getAllParkings(),
      ]);

      if (requestsResult.status === 'fulfilled') {
        setRequests(extractItems(requestsResult.value));
      } else {
        setRequests([]);
        setError(getErrorMessage(requestsResult.reason, 'Не удалось загрузить запросы на парковку.'));
      }

      if (parkingsResult.status === 'fulfilled') {
        setParkings(extractItems(parkingsResult.value));
      } else {
        setParkings([]);
        setWarning('Запросы загружены, но список парковок получить не удалось. Названия будут показаны по parking_id.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const closeModal = () => {
    setSelectedRequest(null);
    setModalMode(null);
  };

  const openStatusModal = (request) => {
    setSelectedRequest(request);
    setModalMode('status');
  };

  const handleStatusUpdate = async (payload) => {
    if (!selectedRequest?.id) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await updateParkingRequestStatus(selectedRequest.id, payload);
      setSuccess('Статус запроса на парковку успешно обновлён.');
      closeModal();
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось обновить статус запроса на парковку.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!requestToCancel?.id) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await cancelParkingRequest(requestToCancel.id, {
        reason: 'Отменено администратором',
      });

      setSuccess('Запрос на парковку отменён.');
      setRequestToCancel(null);
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось отменить запрос на парковку.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'id',
      label: 'Запрос',
      render: (request) => (
        <div className="admin-main-cell">
          <strong>#{request.id}</strong>
          <span>user_id: {request.user_id || '—'}</span>
          <small>{formatDateTime(request.requested_at || request.created_at)}</small>
        </div>
      ),
    },
    {
      key: 'parking_id',
      label: 'Парковка',
      render: (request) => {
        const parking = parkingMap[request.parking_id];

        return (
          <div className="admin-main-cell">
            <strong>
              {parking
                ? cleanParkingName(parking.name || parking.parking_name, `Парковка #${request.parking_id}`)
                : `parking_id=${request.parking_id || '—'}`}
            </strong>
            <span>{parking?.address || 'Парковка может быть неактивной или удалённой.'}</span>
          </div>
        );
      },
    },
    {
      key: 'selected_zone_id',
      label: 'Зона',
      render: (request) => request.selected_zone_id || '—',
    },
    {
      key: 'status',
      label: 'Статус',
      render: (request) => (
        <Badge variant={getStatusBadgeVariant(request.status)}>
          {getStatusLabel(request.status)}
        </Badge>
      ),
    },
    {
      key: 'coordinates',
      label: 'Координаты пользователя',
      render: (request) => (
        <span className="admin-muted-text">
          {request.user_latitude && request.user_longitude
            ? `${request.user_latitude}, ${request.user_longitude}`
            : '—'}
        </span>
      ),
    },
    {
      key: 'recommendation_text',
      label: 'Рекомендация',
      render: (request) => (
        <span className="admin-muted-text">
          {request.recommendation_text || '—'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      label: 'Обновлено',
      render: (request) => formatDateTime(request.updated_at),
    },
  ];

  return (
    <div className="page-stack admin-page admin-requests-page">
      <PageHeader
        title="Админ: запросы на парковку"
        subtitle="Просмотр пользовательских запросов на парковку, фильтр по статусу, изменение статуса и отмена."
        badge="Requests"
        actions={
          <Button variant="secondary" onClick={loadData} disabled={isLoading}>
            Обновить
          </Button>
        }
      />

      {error && <ErrorMessage title="Ошибка" message={error} />}
      {warning && <ErrorMessage title="Предупреждение" message={warning} />}
      {success && <div className="admin-success-message">{success}</div>}

      <Card
        title="Фильтр"
        subtitle="Выберите статус для просмотра запросов на парковку."
        className="admin-filter-card"
      >
        <label className="form-field admin-select-field">
          <span>Статус</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setSuccess('');
            }}
          >
            {requestStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <Card className="admin-data-card">
        <AdminTable
          columns={columns}
          rows={requests}
          isLoading={isLoading}
          emptyMessage="Запросы на парковку не найдены для выбранного фильтра."
          actions={(request) => (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => openStatusModal(request)}
              >
                Статус
              </Button>

              <Button
                size="sm"
                variant="danger"
                onClick={() => setRequestToCancel(request)}
                disabled={request.status === 'cancelled'}
              >
                Отменить
              </Button>
            </>
          )}
        />
      </Card>

      <AdminModal
        isOpen={modalMode === 'status' && Boolean(selectedRequest)}
        title="Изменить статус запроса на парковку"
        description="PATCH /api/v1/parking-requests/{request_id}/status"
        onClose={closeModal}
      >
        <RequestStatusForm
          request={selectedRequest}
          isSubmitting={isSubmitting}
          onSubmit={handleStatusUpdate}
          onCancel={closeModal}
        />
      </AdminModal>

      <AdminConfirmDialog
        isOpen={Boolean(requestToCancel)}
        title="Отменить запрос на парковку?"
        description="Запрос будет отменён с причиной “Отменено администратором”."
        badge="Cancel"
        variant="warning"
        confirmLabel="Отменить запрос"
        isLoading={isSubmitting}
        details={[
          {
            label: 'Запрос на парковку',
            value: requestToCancel?.id ? `#${requestToCancel.id}` : '',
          },
          {
            label: 'Пользователь',
            value: requestToCancel?.user_id,
          },
          {
            label: 'Текущий статус',
            value: getStatusLabel(requestToCancel?.status),
          },
        ]}
        onCancel={() => setRequestToCancel(null)}
        onConfirm={handleCancelRequest}
      />
    </div>
  );
}

export default AdminRequestsPage;