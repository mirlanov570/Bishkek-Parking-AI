import { useEffect, useMemo, useState } from 'react';
import Button from '../common/Button';
import {
  NEARBY_OBJECT_TYPE_OPTIONS,
  WEEKDAY_OPTIONS,
  parseActiveDays,
} from '../../utils/infrastructure';

const getInitialForm = (nearbyObject) => ({
  name: nearbyObject?.name || '',
  object_type: nearbyObject?.object_type || 'university',
  distance_m: nearbyObject?.distance_m ?? 300,
  open_time: nearbyObject?.open_time ? String(nearbyObject.open_time).slice(0, 5) : '08:00',
  close_time: nearbyObject?.close_time ? String(nearbyObject.close_time).slice(0, 5) : '18:00',
  active_days: parseActiveDays(nearbyObject?.active_days || '1,2,3,4,5'),
  influence_weight: nearbyObject?.influence_weight ?? 1,
  is_active: nearbyObject?.is_active ?? true,
  whole_day: !nearbyObject?.open_time || !nearbyObject?.close_time,
});

const toNumber = (value) => Number(String(value).replace(',', '.'));

function NearbyObjectForm({ nearbyObject, mode = 'create', isSubmitting = false, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => getInitialForm(nearbyObject));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(getInitialForm(nearbyObject));
    setErrors({});
  }, [nearbyObject]);

  const submitLabel = useMemo(
    () => (mode === 'edit' ? 'Сохранить объект' : 'Добавить объект'),
    [mode],
  );

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const toggleDay = (day) => {
    setForm((currentForm) => {
      const exists = currentForm.active_days.includes(day);
      const nextDays = exists
        ? currentForm.active_days.filter((item) => item !== day)
        : [...currentForm.active_days, day];

      return {
        ...currentForm,
        active_days: nextDays.sort((left, right) => left - right),
      };
    });
  };

  const validate = () => {
    const nextErrors = {};
    const distance = Number(form.distance_m);
    const weight = toNumber(form.influence_weight);

    if (form.name.trim().length < 2) {
      nextErrors.name = 'Минимум 2 символа.';
    }

    if (!Number.isInteger(distance) || distance < 0) {
      nextErrors.distance_m = 'Расстояние должно быть целым числом от 0.';
    }

    if (!Number.isFinite(weight) || weight < 0) {
      nextErrors.influence_weight = 'Вес влияния должен быть числом от 0.';
    }

    if (!form.active_days.length) {
      nextErrors.active_days = 'Выберите хотя бы один день.';
    }

    if (!form.whole_day && (!form.open_time || !form.close_time)) {
      nextErrors.time = 'Укажите время или включите режим «весь день».';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validate()) return;

    onSubmit({
      name: form.name.trim(),
      object_type: form.object_type,
      distance_m: Number(form.distance_m),
      open_time: form.whole_day ? null : form.open_time,
      close_time: form.whole_day ? null : form.close_time,
      active_days: form.active_days.join(','),
      influence_weight: toNumber(form.influence_weight),
      is_active: Boolean(form.is_active),
    });
  };

  return (
    <form className="admin-form infrastructure-form" onSubmit={handleSubmit} noValidate>
      <div className="admin-form__grid">
        <label className="form-field form-field--full">
          <span>Название объекта</span>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Например: КГТУ им. Раззакова"
          />
          {errors.name && <small>{errors.name}</small>}
        </label>

        <label className="form-field">
          <span>Тип объекта</span>
          <select name="object_type" value={form.object_type} onChange={handleChange}>
            {NEARBY_OBJECT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Расстояние, м</span>
          <input
            name="distance_m"
            type="number"
            min="0"
            value={form.distance_m}
            onChange={handleChange}
          />
          {errors.distance_m && <small>{errors.distance_m}</small>}
        </label>

        <label className="form-field">
          <span>Время открытия</span>
          <input
            name="open_time"
            type="time"
            value={form.open_time}
            onChange={handleChange}
            disabled={form.whole_day}
          />
        </label>

        <label className="form-field">
          <span>Время закрытия</span>
          <input
            name="close_time"
            type="time"
            value={form.close_time}
            onChange={handleChange}
            disabled={form.whole_day}
          />
          {errors.time && <small>{errors.time}</small>}
        </label>

        <label className="form-field">
          <span>Вес влияния</span>
          <input
            name="influence_weight"
            type="number"
            min="0"
            step="0.1"
            value={form.influence_weight}
            onChange={handleChange}
          />
          {errors.influence_weight && <small>{errors.influence_weight}</small>}
        </label>

        <label className="admin-check-field">
          <input name="whole_day" type="checkbox" checked={form.whole_day} onChange={handleChange} />
          <span>Активен весь день</span>
        </label>

        <label className="admin-check-field">
          <input name="is_active" type="checkbox" checked={form.is_active} onChange={handleChange} />
          <span>Объект активен</span>
        </label>
      </div>

      <div className="infrastructure-days-field">
        <div className="infrastructure-days-field__header">
          <span>Дни активности</span>
          <div>
            <button type="button" onClick={() => setForm((currentForm) => ({ ...currentForm, active_days: [1, 2, 3, 4, 5] }))}>
              Пн–Пт
            </button>
            <button type="button" onClick={() => setForm((currentForm) => ({ ...currentForm, active_days: [6, 7] }))}>
              Сб–Вс
            </button>
            <button type="button" onClick={() => setForm((currentForm) => ({ ...currentForm, active_days: [1, 2, 3, 4, 5, 6, 7] }))}>
              Каждый день
            </button>
          </div>
        </div>

        <div className="infrastructure-day-pills">
          {WEEKDAY_OPTIONS.map((day) => (
            <button
              key={day.value}
              type="button"
              className={form.active_days.includes(day.value) ? 'is-active' : ''}
              onClick={() => toggleDay(day.value)}
              title={day.label}
            >
              {day.short}
            </button>
          ))}
        </div>

        {errors.active_days && <small>{errors.active_days}</small>}
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

export default NearbyObjectForm;