import { useEffect, useState } from 'react';
import Button from '../common/Button';

const statusOptions = [
  { value: 'created', label: 'created — создан' },
  { value: 'processing', label: 'processing — в обработке' },
  { value: 'recommended', label: 'recommended — рекомендация выдана' },
  { value: 'completed', label: 'completed — завершён' },
  { value: 'cancelled', label: 'cancelled — отменён' },
];

function RequestStatusForm({ request, isSubmitting = false, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    status: request?.status || 'created',
    recommendation_text: request?.recommendation_text || '',
  });

  useEffect(() => {
    setForm({
      status: request?.status || 'created',
      recommendation_text: request?.recommendation_text || '',
    });
  }, [request]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit({
      status: form.status,
      recommendation_text: form.recommendation_text.trim() || null,
    });
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label className="form-field">
        <span>Статус запроса на парковку</span>
        <select name="status" value={form.status} onChange={handleChange}>
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>

      <label className="form-field">
        <span>Комментарий / recommendation_text</span>
        <textarea
          name="recommendation_text"
          rows="4"
          value={form.recommendation_text}
          onChange={handleChange}
          placeholder="Можно оставить пустым"
        />
      </label>

      <div className="admin-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Обновить статус
        </Button>
      </div>
    </form>
  );
}

export default RequestStatusForm;