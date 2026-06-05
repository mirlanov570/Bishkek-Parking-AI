import { useEffect, useMemo, useState } from 'react';
import Button from '../common/Button';
import { ZONE_TYPE_OPTIONS } from '../../utils/infrastructure';

const getInitialForm = (parking) => ({
  name: parking?.name || '',
  address: parking?.address || '',
  latitude: parking?.latitude ?? '42.8746',
  longitude: parking?.longitude ?? '74.5698',
  zone_type: parking?.zone_type || 'mixed',
  total_places: parking?.total_places ?? 10,
  occupied_places: parking?.occupied_places ?? 0,
  working_hours: parking?.working_hours || '',
  description: parking?.description || '',
  is_active: parking?.is_active ?? true,
});

const toNumber = (value) => Number(String(value).replace(',', '.'));

function ParkingForm({ parking, mode = 'create', isSubmitting = false, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => getInitialForm(parking));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(getInitialForm(parking));
    setErrors({});
  }, [parking]);

  const submitLabel = useMemo(
    () => (mode === 'edit' ? 'Сохранить парковку' : 'Создать парковку'),
    [mode],
  );

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validate = () => {
    const nextErrors = {};
    const latitude = toNumber(form.latitude);
    const longitude = toNumber(form.longitude);
    const totalPlaces = Number(form.total_places);
    const occupiedPlaces = Number(form.occupied_places);

    if (form.name.trim().length < 2) nextErrors.name = 'Минимум 2 символа.';
    if (form.address.trim().length < 2) nextErrors.address = 'Минимум 2 символа.';

    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      nextErrors.latitude = 'Широта должна быть от -90 до 90.';
    }

    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      nextErrors.longitude = 'Долгота должна быть от -180 до 180.';
    }

    if (!form.zone_type) {
      nextErrors.zone_type = 'Выберите тип зоны.';
    }

    if (!Number.isInteger(totalPlaces) || totalPlaces <= 0) {
      nextErrors.total_places = 'Всего мест должно быть целым числом больше 0.';
    }

    if (!Number.isInteger(occupiedPlaces) || occupiedPlaces < 0) {
      nextErrors.occupied_places = 'Занятые места должны быть целым числом от 0.';
    }

    if (occupiedPlaces > totalPlaces) {
      nextErrors.occupied_places = 'Занятых мест не может быть больше общего количества.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validate()) return;

    onSubmit({
      name: form.name.trim(),
      address: form.address.trim(),
      latitude: toNumber(form.latitude),
      longitude: toNumber(form.longitude),
      zone_type: form.zone_type,
      total_places: Number(form.total_places),
      occupied_places: Number(form.occupied_places),
      working_hours: form.working_hours.trim() || null,
      description: form.description.trim() || null,
      is_active: Boolean(form.is_active),
    });
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit} noValidate>
      <div className="admin-form__grid">
        <label className="form-field">
          <span>Название</span>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Например: ЦУМ парковка"
          />
          {errors.name && <small>{errors.name}</small>}
        </label>

        <label className="form-field">
          <span>Адрес</span>
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Адрес парковки"
          />
          {errors.address && <small>{errors.address}</small>}
        </label>

        <label className="form-field">
          <span>Широта</span>
          <input name="latitude" value={form.latitude} onChange={handleChange} inputMode="decimal" />
          {errors.latitude && <small>{errors.latitude}</small>}
        </label>

        <label className="form-field">
          <span>Долгота</span>
          <input name="longitude" value={form.longitude} onChange={handleChange} inputMode="decimal" />
          {errors.longitude && <small>{errors.longitude}</small>}
        </label>

        <label className="form-field">
          <span>Тип зоны</span>
          <select name="zone_type" value={form.zone_type} onChange={handleChange}>
            {ZONE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.zone_type && <small>{errors.zone_type}</small>}
        </label>

        <label className="form-field">
          <span>Всего мест</span>
          <input
            name="total_places"
            type="number"
            min="1"
            value={form.total_places}
            onChange={handleChange}
          />
          {errors.total_places && <small>{errors.total_places}</small>}
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
          {errors.occupied_places && <small>{errors.occupied_places}</small>}
        </label>

        <label className="form-field">
          <span>График работы</span>
          <input
            name="working_hours"
            value={form.working_hours}
            onChange={handleChange}
            placeholder="Например: 08:00-22:00"
          />
        </label>

        <label className="admin-check-field">
          <input name="is_active" type="checkbox" checked={form.is_active} onChange={handleChange} />
          <span>Активная парковка</span>
        </label>
      </div>

      <label className="form-field">
        <span>Описание</span>
        <textarea
          name="description"
          rows="4"
          value={form.description}
          onChange={handleChange}
          placeholder="Краткое описание парковки"
        />
      </label>

      <div className="admin-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default ParkingForm;