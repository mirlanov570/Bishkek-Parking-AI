import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createParkingZone,
  deleteZone,
  getParkingZones,
  updateZone,
  updateZoneStatus,
} from '../../api/parkingZonesApi';
import { getAllParkings } from '../../api/parkingsApi';
import AdminConfirmDialog from '../../components/admin/AdminConfirmDialog';
import AdminModal from '../../components/admin/AdminModal';
import AdminTable from '../../components/admin/AdminTable';
import ZoneForm from '../../components/admin/ZoneForm';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ErrorMessage from '../../components/common/ErrorMessage';
import PageHeader from '../../components/common/PageHeader';
import { formatDateTime, formatNumber, formatPercent } from '../../utils/formatters';

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getErrorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail || error?.apiError?.detail;

  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => item?.msg || JSON.stringify(item)).join('; ');

  return error?.message || fallback;
};

const getLoadBadgeVariant = (level) => {
  if (level === 'high') return 'danger';
  if (level === 'medium') return 'warning';
  return 'success';
};

function ZoneStatusForm({ zone, isSubmitting, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    total_places: zone?.total_places || 1,
    occupied_places: zone?.occupied_places || 0,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      total_places: zone?.total_places || 1,
      occupied_places: zone?.occupied_places || 0,
    });
    setError('');
  }, [zone]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const totalPlaces = Number(form.total_places);
    const occupiedPlaces = Number(form.occupied_places);

    if (!Number.isInteger(totalPlaces) || totalPlaces <= 0) {
      setError('Всего мест должно быть целым числом больше 0.');
      return;
    }

    if (!Number.isInteger(occupiedPlaces) || occupiedPlaces < 0 || occupiedPlaces > totalPlaces) {
      setError('Занятые места должны быть от 0 до общего количества мест.');
      return;
    }

    onSubmit({
      total_places: totalPlaces,
      occupied_places: occupiedPlaces,
    });
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      {error && <ErrorMessage title="Проверьте поля" message={error} />}

      <div className="admin-form__grid">
        <label className="form-field">
          <span>Всего мест</span>
          <input
            name="total_places"
            type="number"
            min="1"
            value={form.total_places}
            onChange={handleChange}
          />
        </label>

        <label className="form-field">
          <span>Занято мест</span>
          <input
            name="occupied_places"
            type="number"
            min="0"
            value={form.occupied_places}
            onChange={handleChange}
          />
        </label>
      </div>

      <div className="admin-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Обновить status
        </Button>
      </div>
    </form>
  );
}

function AdminZonesPage() {
  const [parkings, setParkings] = useState([]);
  const [selectedParkingId, setSelectedParkingId] = useState('');
  const [zones, setZones] = useState([]);
  const [isParkingsLoading, setIsParkingsLoading] = useState(true);
  const [isZonesLoading, setIsZonesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [zoneToDelete, setZoneToDelete] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedParking = useMemo(
    () => parkings.find((parking) => String(parking.id) === String(selectedParkingId)) || null,
    [parkings, selectedParkingId],
  );

  const loadParkings = useCallback(async () => {
    setIsParkingsLoading(true);
    setError('');

    try {
      const response = await getAllParkings();
      const items = extractItems(response);

      setParkings(items);
      setSelectedParkingId((currentId) => currentId || (items[0]?.id ? String(items[0].id) : ''));
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось загрузить парковки для выбора.'));
    } finally {
      setIsParkingsLoading(false);
    }
  }, []);

  const loadZones = useCallback(async () => {
    if (!selectedParkingId) {
      setZones([]);
      return;
    }

    setIsZonesLoading(true);
    setError('');

    try {
      const response = await getParkingZones(selectedParkingId, { limit: 100, offset: 0 });
      setZones(extractItems(response));
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось загрузить зоны выбранной парковки.'));
    } finally {
      setIsZonesLoading(false);
    }
  }, [selectedParkingId]);

  useEffect(() => {
    loadParkings();
  }, [loadParkings]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const closeModal = () => {
    setModalMode(null);
    setSelectedZone(null);
  };

  const handleCreate = async (payload) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await createParkingZone(selectedParkingId, payload);
      setSuccess('Зона успешно создана.');
      closeModal();
      await loadZones();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось создать зону.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (payload) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await updateZone(selectedZone.id, payload);
      setSuccess('Зона успешно обновлена.');
      closeModal();
      await loadZones();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось обновить зону.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (payload) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await updateZoneStatus(selectedZone.id, payload);
      setSuccess('Статус зоны успешно обновлен через /zones/{zone_id}/status.');
      closeModal();
      await loadZones();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось обновить status зоны.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!zoneToDelete) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await deleteZone(zoneToDelete.id);
      setSuccess('Зона удалена.');
      setZoneToDelete(null);
      await loadZones();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось удалить зону.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Зона',
      render: (zone) => (
        <div className="admin-main-cell">
          <strong>{zone.name}</strong>
          <span>
            ID: {zone.id} · parking_id: {zone.parking_id}
          </span>
        </div>
      ),
    },
    {
      key: 'places',
      label: 'Места',
      render: (zone) => (
        <div className="admin-main-cell">
          <strong>
            {formatNumber(zone.occupied_places)} / {formatNumber(zone.total_places)}
          </strong>
          <span>Свободно: {formatNumber(zone.free_places)}</span>
        </div>
      ),
    },
    {
      key: 'load',
      label: 'Загрузка',
      render: (zone) => (
        <div className="admin-main-cell">
          <Badge variant={getLoadBadgeVariant(zone.load_level)}>{zone.load_level || 'low'}</Badge>
          <span>{formatPercent(zone.load_percentage)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Статус',
      render: (zone) => (
        <Badge variant={zone.is_active ? 'success' : 'neutral'}>
          {zone.is_active ? 'active' : 'inactive'}
        </Badge>
      ),
    },
    {
      key: 'updated_at',
      label: 'Обновлено',
      render: (zone) => formatDateTime(zone.updated_at),
    },
  ];

  return (
    <div className="page-stack admin-page">
      <PageHeader
        title="Админ: зоны парковок"
        subtitle="Выберите парковку, затем управляйте зонами и их загрузкой."
        badge="Zones"
        actions={
          <div className="admin-header-actions">
            <Button
              variant="secondary"
              onClick={loadZones}
              disabled={!selectedParkingId || isZonesLoading}
            >
              Обновить
            </Button>

            <Button onClick={() => setModalMode('create')} disabled={!selectedParkingId}>
              Создать зону
            </Button>
          </div>
        }
      />

      {error && <ErrorMessage title="Ошибка" message={error} />}
      {success && <div className="admin-success-message">{success}</div>}

      <Card title="Выбор парковки" subtitle="Зоны загружаются для выбранного объекта." className="admin-filter-card">
        <label className="form-field admin-select-field">
          <span>Парковка</span>
          <select
            value={selectedParkingId}
            onChange={(event) => setSelectedParkingId(event.target.value)}
            disabled={isParkingsLoading}
          >
            {parkings.map((parking) => (
              <option key={parking.id} value={parking.id}>
                {parking.name} · свободно {parking.free_places ?? '—'} /{' '}
                {parking.total_places ?? '—'}
              </option>
            ))}
          </select>
        </label>

        {selectedParking && (
          <div className="admin-selected-info">
            <Badge variant={selectedParking.is_active ? 'success' : 'neutral'}>
              {selectedParking.is_active ? 'active' : 'inactive'}
            </Badge>
            <strong>{selectedParking.name}</strong>
            <span>{selectedParking.address}</span>
          </div>
        )}
      </Card>

      <Card className="admin-data-card">
        <AdminTable
          columns={columns}
          rows={zones}
          isLoading={isZonesLoading}
          emptyMessage="У выбранной парковки зон пока нет."
          actions={(zone) => (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedZone(zone);
                  setModalMode('edit');
                }}
              >
                Изменить
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedZone(zone);
                  setModalMode('status');
                }}
              >
                Status
              </Button>

              <Button size="sm" variant="danger" onClick={() => setZoneToDelete(zone)}>
                Удалить
              </Button>
            </>
          )}
        />
      </Card>

      <AdminModal
        isOpen={modalMode === 'create'}
        title="Создать зону"
        description="Новая зона будет создана внутри выбранной парковки."
        onClose={closeModal}
      >
        <ZoneForm
          mode="create"
          isSubmitting={isSubmitting}
          onSubmit={handleCreate}
          onCancel={closeModal}
        />
      </AdminModal>

      <AdminModal
        isOpen={modalMode === 'edit'}
        title="Редактировать зону"
        description="Изменение основных параметров зоны."
        onClose={closeModal}
      >
        <ZoneForm
          zone={selectedZone}
          mode="edit"
          isSubmitting={isSubmitting}
          onSubmit={handleUpdate}
          onCancel={closeModal}
        />
      </AdminModal>

      <AdminModal
        isOpen={modalMode === 'status'}
        title="Обновить status зоны"
        description="Быстрый ввод total_places и occupied_places."
        onClose={closeModal}
      >
        <ZoneStatusForm
          zone={selectedZone}
          isSubmitting={isSubmitting}
          onSubmit={handleStatusUpdate}
          onCancel={closeModal}
        />
      </AdminModal>

      <AdminConfirmDialog
        isOpen={Boolean(zoneToDelete)}
        title="Удалить зону?"
        description="Зона будет удалена через DELETE /zones/{zone_id}."
        badge="Delete"
        variant="danger"
        confirmLabel="Удалить"
        isLoading={isSubmitting}
        details={[
          { label: 'Зона', value: zoneToDelete?.name },
          { label: 'ID', value: zoneToDelete?.id },
          { label: 'parking_id', value: zoneToDelete?.parking_id },
        ]}
        onCancel={() => setZoneToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default AdminZonesPage;