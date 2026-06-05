import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createParking,
  deleteParking,
  getAllParkings,
  updateParking,
  updateParkingStatus,
} from '../../api/parkingsApi';
import {
  createParkingNearbyObject,
  deleteNearbyObject,
  getParkingNearbyObjects,
  updateNearbyObject,
} from '../../api/nearbyObjectsApi';
import AdminConfirmDialog from '../../components/admin/AdminConfirmDialog';
import AdminModal from '../../components/admin/AdminModal';
import AdminTable from '../../components/admin/AdminTable';
import NearbyObjectForm from '../../components/admin/NearbyObjectForm';
import ParkingForm from '../../components/admin/ParkingForm';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ErrorMessage from '../../components/common/ErrorMessage';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import { formatDateTime, formatNumber, formatPercent } from '../../utils/formatters';
import {
  formatObjectSchedule,
  getNearbyObjectTypeLabel,
  getZoneTypeLabel,
} from '../../utils/infrastructure';

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

function StatusForm({ parking, isSubmitting, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    total_places: parking?.total_places || 1,
    occupied_places: parking?.occupied_places || 0,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      total_places: parking?.total_places || 1,
      occupied_places: parking?.occupied_places || 0,
    });
    setError('');
  }, [parking]);

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

function InfrastructureManager({
  parking,
  objects,
  isLoading,
  isSubmitting,
  error,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [formMode, setFormMode] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [objectToDelete, setObjectToDelete] = useState(null);

  useEffect(() => {
    setFormMode(null);
    setSelectedObject(null);
    setObjectToDelete(null);
  }, [parking?.id]);

  const activeObjects = useMemo(
    () => objects.filter((item) => item.is_active !== false),
    [objects],
  );

  const totalWeight = useMemo(
    () => activeObjects.reduce((sum, item) => sum + Number(item.influence_weight || 0), 0),
    [activeObjects],
  );

  const closeForm = () => {
    setFormMode(null);
    setSelectedObject(null);
  };

  const handleCreate = async (payload) => {
    await onCreate(payload);
    closeForm();
  };

  const handleUpdate = async (payload) => {
    if (!selectedObject) return;
    await onUpdate(selectedObject.id, payload);
    closeForm();
  };

  const handleDelete = async () => {
    if (!objectToDelete) return;
    await onDelete(objectToDelete.id);
    setObjectToDelete(null);
  };

  return (
    <div className="infrastructure-manager">
      <div className="infrastructure-manager__summary">
        <div>
          <span>Парковка</span>
          <strong>{parking?.name || '—'}</strong>
        </div>
        <div>
          <span>Тип зоны</span>
          <strong>{getZoneTypeLabel(parking?.zone_type)}</strong>
        </div>
        <div>
          <span>Активных объектов</span>
          <strong>{formatNumber(activeObjects.length)}</strong>
        </div>
        <div>
          <span>Суммарный вес</span>
          <strong>{totalWeight.toFixed(2)}</strong>
        </div>
      </div>

      <div className="infrastructure-manager__toolbar">
        <p>
          Эти объекты используются ML-моделью вместе с типом зоны, днём недели и временем.
          Например, вуз утром в будний день повышает прогнозируемую загруженность.
        </p>
        <div>
          <Button variant="secondary" onClick={onRefresh} isLoading={isLoading}>
            Обновить
          </Button>
          <Button onClick={() => setFormMode('create')}>Добавить объект</Button>
        </div>
      </div>

      {error && <ErrorMessage title="Ошибка инфраструктуры" message={error} />}

      {formMode && (
        <div className="infrastructure-editor-card">
          <div className="infrastructure-editor-card__header">
            <div>
              <Badge variant="info">Infrastructure</Badge>
              <h3>{formMode === 'edit' ? 'Изменить объект рядом' : 'Добавить объект рядом'}</h3>
              <p>Укажите тип объекта, расстояние, график активности и силу влияния.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={closeForm} disabled={isSubmitting}>
              Закрыть
            </Button>
          </div>

          <NearbyObjectForm
            mode={formMode}
            nearbyObject={selectedObject}
            isSubmitting={isSubmitting}
            onSubmit={formMode === 'edit' ? handleUpdate : handleCreate}
            onCancel={closeForm}
          />
        </div>
      )}

      {objectToDelete && (
        <div className="infrastructure-delete-card">
          <div>
            <Badge variant="danger">Delete</Badge>
            <strong>Удалить объект рядом?</strong>
            <p>
              {objectToDelete.name} больше не будет учитываться в будущих прогнозах.
            </p>
          </div>
          <div>
            <Button variant="secondary" onClick={() => setObjectToDelete(null)} disabled={isSubmitting}>
              Отмена
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isSubmitting}>
              Удалить
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="admin-table-state">
          <Loader text="Загружаем объекты рядом..." />
        </div>
      ) : objects.length === 0 ? (
        <div className="admin-table-state">
          <Badge variant="neutral">Empty</Badge>
          <p>Для этой парковки пока нет объектов рядом.</p>
        </div>
      ) : (
        <div className="nearby-object-list">
          {objects.map((item) => (
            <article key={item.id} className="nearby-object-card">
              <div className="nearby-object-card__main">
                <div>
                  <Badge variant={item.is_active ? 'info' : 'neutral'}>
                    {getNearbyObjectTypeLabel(item.object_type)}
                  </Badge>
                  <h3>{item.name}</h3>
                  <p>{formatObjectSchedule(item)}</p>
                </div>

                <div className="nearby-object-card__metrics">
                  <div>
                    <span>Расстояние</span>
                    <strong>{formatNumber(item.distance_m)} м</strong>
                  </div>
                  <div>
                    <span>Вес</span>
                    <strong>{Number(item.influence_weight || 0).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span>Статус</span>
                    <strong>{item.is_active ? 'Активен' : 'Выключен'}</strong>
                  </div>
                </div>
              </div>

              <div className="nearby-object-card__actions">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSelectedObject(item);
                    setFormMode('edit');
                    setObjectToDelete(null);
                  }}
                >
                  Изменить
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setObjectToDelete(item);
                    closeForm();
                  }}
                >
                  Удалить
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminParkingsPage() {
  const [parkings, setParkings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [selectedParking, setSelectedParking] = useState(null);
  const [parkingToDelete, setParkingToDelete] = useState(null);
  const [nearbyObjects, setNearbyObjects] = useState([]);
  const [isInfrastructureLoading, setIsInfrastructureLoading] = useState(false);
  const [infrastructureError, setInfrastructureError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadParkings = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await getAllParkings();
      setParkings(extractItems(response));
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось загрузить парковки.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadNearbyObjects = useCallback(async (parkingId) => {
    if (!parkingId) return;

    setIsInfrastructureLoading(true);
    setInfrastructureError('');

    try {
      const response = await getParkingNearbyObjects(parkingId, {
        limit: 100,
        offset: 0,
        only_active: false,
      });

      setNearbyObjects(extractItems(response));
    } catch (requestError) {
      setNearbyObjects([]);
      setInfrastructureError(getErrorMessage(requestError, 'Не удалось загрузить объекты рядом.'));
    } finally {
      setIsInfrastructureLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParkings();
  }, [loadParkings]);

  const closeModal = () => {
    setModalMode(null);
    setSelectedParking(null);
    setNearbyObjects([]);
    setInfrastructureError('');
  };

  const openInfrastructureModal = async (parking) => {
    setSelectedParking(parking);
    setModalMode('infrastructure');
    await loadNearbyObjects(parking.id);
  };

  const handleCreate = async (payload) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await createParking(payload);
      setSuccess('Парковка успешно создана.');
      closeModal();
      await loadParkings();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось создать парковку.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (payload) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await updateParking(selectedParking.id, payload);
      setSuccess('Парковка успешно обновлена.');
      closeModal();
      await loadParkings();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось обновить парковку.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (payload) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await updateParkingStatus(selectedParking.id, payload);
      setSuccess('Статус парковки успешно обновлен через /status.');
      closeModal();
      await loadParkings();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось обновить статус парковки.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!parkingToDelete) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await deleteParking(parkingToDelete.id);
      setSuccess('Парковка удалена.');
      setParkingToDelete(null);
      await loadParkings();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось удалить парковку.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNearbyObject = async (payload) => {
    if (!selectedParking) return;

    setIsSubmitting(true);
    setInfrastructureError('');
    setSuccess('');

    try {
      await createParkingNearbyObject(selectedParking.id, payload);
      setSuccess('Объект рядом успешно добавлен.');
      await loadNearbyObjects(selectedParking.id);
    } catch (requestError) {
      setInfrastructureError(getErrorMessage(requestError, 'Не удалось добавить объект рядом.'));
      throw requestError;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNearbyObject = async (objectId, payload) => {
    if (!selectedParking) return;

    setIsSubmitting(true);
    setInfrastructureError('');
    setSuccess('');

    try {
      await updateNearbyObject(objectId, payload);
      setSuccess('Объект рядом успешно обновлен.');
      await loadNearbyObjects(selectedParking.id);
    } catch (requestError) {
      setInfrastructureError(getErrorMessage(requestError, 'Не удалось обновить объект рядом.'));
      throw requestError;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNearbyObject = async (objectId) => {
    if (!selectedParking) return;

    setIsSubmitting(true);
    setInfrastructureError('');
    setSuccess('');

    try {
      await deleteNearbyObject(objectId);
      setSuccess('Объект рядом удален.');
      await loadNearbyObjects(selectedParking.id);
    } catch (requestError) {
      setInfrastructureError(getErrorMessage(requestError, 'Не удалось удалить объект рядом.'));
      throw requestError;
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Парковка',
      render: (parking) => (
        <div className="admin-main-cell">
          <strong>{parking.name}</strong>
          <span>{parking.address}</span>
          <small>ID: {parking.id}</small>
        </div>
      ),
    },
    {
      key: 'zone_type',
      label: 'Инфраструктура',
      render: (parking) => (
        <div className="admin-main-cell">
          <Badge variant="info">{getZoneTypeLabel(parking.zone_type)}</Badge>
          <span>{parking.zone_type || 'mixed'}</span>
        </div>
      ),
    },
    {
      key: 'places',
      label: 'Места',
      render: (parking) => (
        <div className="admin-main-cell">
          <strong>
            {formatNumber(parking.occupied_places)} / {formatNumber(parking.total_places)}
          </strong>
          <span>Свободно: {formatNumber(parking.free_places)}</span>
        </div>
      ),
    },
    {
      key: 'load',
      label: 'Загрузка',
      render: (parking) => (
        <div className="admin-main-cell">
          <Badge variant={getLoadBadgeVariant(parking.load_level)}>
            {parking.load_level || 'low'}
          </Badge>
          <span>{formatPercent(parking.load_percentage)}</span>
        </div>
      ),
    },
    {
      key: 'coordinates',
      label: 'Координаты',
      render: (parking) => (
        <span className="admin-muted-text">
          {parking.latitude}, {parking.longitude}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Статус',
      render: (parking) => (
        <Badge variant={parking.is_active ? 'success' : 'neutral'}>
          {parking.is_active ? 'active' : 'inactive'}
        </Badge>
      ),
    },
    {
      key: 'updated_at',
      label: 'Обновлено',
      render: (parking) => formatDateTime(parking.updated_at),
    },
  ];

  return (
    <div className="page-stack admin-page">
      <PageHeader
        title="Админ: парковки"
        subtitle="CRUD парковок, тип зоны и управление объектами инфраструктуры рядом."
        badge="Parkings"
        actions={
          <div className="admin-header-actions">
            <Button variant="secondary" onClick={loadParkings} disabled={isLoading}>
              Обновить
            </Button>
            <Button onClick={() => setModalMode('create')}>Создать парковку</Button>
          </div>
        }
      />

      {error && <ErrorMessage title="Ошибка" message={error} />}
      {success && <div className="admin-success-message">{success}</div>}

      <Card className="admin-data-card">
        <AdminTable
          columns={columns}
          rows={parkings}
          isLoading={isLoading}
          emptyMessage="Парковки пока не найдены. Создайте первую парковку или запустите demo data."
          actions={(parking) => (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedParking(parking);
                  setModalMode('edit');
                }}
              >
                Изменить
              </Button>

              <Button size="sm" variant="secondary" onClick={() => openInfrastructureModal(parking)}>
                Инфраструктура
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedParking(parking);
                  setModalMode('status');
                }}
              >
                Status
              </Button>

              <Button size="sm" variant="danger" onClick={() => setParkingToDelete(parking)}>
                Удалить
              </Button>
            </>
          )}
        />
      </Card>

      <AdminModal
        isOpen={modalMode === 'create'}
        title="Создать парковку"
        description="Заполните данные парковки и выберите тип зоны для ML-прогноза."
        onClose={closeModal}
        size="lg"
      >
        <ParkingForm
          mode="create"
          isSubmitting={isSubmitting}
          onSubmit={handleCreate}
          onCancel={closeModal}
        />
      </AdminModal>

      <AdminModal
        isOpen={modalMode === 'edit'}
        title="Редактировать парковку"
        description="Изменение основных данных парковки и типа инфраструктурной зоны."
        onClose={closeModal}
        size="lg"
      >
        <ParkingForm
          parking={selectedParking}
          mode="edit"
          isSubmitting={isSubmitting}
          onSubmit={handleUpdate}
          onCancel={closeModal}
        />
      </AdminModal>

      <AdminModal
        isOpen={modalMode === 'status'}
        title="Обновить status парковки"
        description="Быстрый ввод total_places и occupied_places."
        onClose={closeModal}
      >
        <StatusForm
          parking={selectedParking}
          isSubmitting={isSubmitting}
          onSubmit={handleStatusUpdate}
          onCancel={closeModal}
        />
      </AdminModal>

      <AdminModal
        isOpen={modalMode === 'infrastructure'}
        title="Инфраструктура рядом"
        description="Объекты рядом с парковкой: вузы, школы, ТЦ, кафе, кинотеатры, офисы и другие точки влияния."
        onClose={closeModal}
        size="lg"
      >
        <InfrastructureManager
          parking={selectedParking}
          objects={nearbyObjects}
          isLoading={isInfrastructureLoading}
          isSubmitting={isSubmitting}
          error={infrastructureError}
          onRefresh={() => loadNearbyObjects(selectedParking?.id)}
          onCreate={handleCreateNearbyObject}
          onUpdate={handleUpdateNearbyObject}
          onDelete={handleDeleteNearbyObject}
        />
      </AdminModal>

      <AdminConfirmDialog
        isOpen={Boolean(parkingToDelete)}
        title="Удалить парковку?"
        description="Действие удалит выбранную парковку через DELETE /parkings/{id}."
        badge="Delete"
        variant="danger"
        confirmLabel="Удалить"
        isLoading={isSubmitting}
        details={[
          { label: 'Название', value: parkingToDelete?.name },
          { label: 'Адрес', value: parkingToDelete?.address },
          { label: 'ID', value: parkingToDelete?.id },
        ]}
        onCancel={() => setParkingToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default AdminParkingsPage;