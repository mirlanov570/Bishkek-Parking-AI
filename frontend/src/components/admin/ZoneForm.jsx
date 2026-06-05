import { useEffect, useMemo, useState } from 'react';
import Button from '../common/Button';

const getInitialForm = (zone) => ({
  name: zone?.name || '',
  total_places: zone?.total_places ?? 10,
  occupied_places: zone?.occupied_places ?? 0,
  is_active: zone?.is_active ?? true,
});

function ZoneForm({ zone, mode = 'create', isSubmitting = false, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => getInitialForm(zone));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(getInitialForm(zone));
    setErrors({});
  }, [zone]);

  const submitLabel = useMemo(() => (mode === 'edit' ? 'Сохранить зону' : 'Создать зону'), [mode]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validate = () => {
    const nextErrors = {};
    const totalPlaces = Number(form.total_places);
    const occupiedPlaces = Number(form.occupied_places);

    if (form.name.trim().length < 1) nextErrors.name = 'Введите название зоны.';

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
      total_places: Number(form.total_places),
      occupied_places: Number(form.occupied_places),
      is_active: Boolean(form.is_active),
    });
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit} noValidate>
      <div className="admin-form__grid">
        <label className="form-field">
          <span>Название зоны</span>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Например: A сектор"
          />
          {errors.name && <small>{errors.name}</small>}
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

        <label className="admin-check-field">
          <input name="is_active" type="checkbox" checked={form.is_active} onChange={handleChange} />
          <span>Активная зона</span>
        </label>
      </div>

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

export default ZoneForm;