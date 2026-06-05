import { useEffect, useState } from 'react';
import Button from '../common/Button';

const getInitialForm = (user) => ({
  full_name: user?.full_name || '',
  email: user?.email || '',
  phone: user?.phone || '',
  login: user?.login || '',
  password: '',
  role_id: user?.role_id ?? 2,
  preferred_language: user?.preferred_language || 'ru',
  is_active: user?.is_active ?? true,
});

const isEmailLike = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function UserForm({ user, roles = [], mode = 'create', isSubmitting = false, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => getInitialForm(user));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(getInitialForm(user));
    setErrors({});
  }, [user]);

  const roleOptions = roles.length
    ? roles
    : [
        { id: 1, code: 'admin', name: 'Администратор' },
        { id: 2, code: 'driver', name: 'Водитель' },
      ];

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (form.full_name.trim().length < 2) nextErrors.full_name = 'Минимум 2 символа.';
    if (!isEmailLike(form.email.trim())) nextErrors.email = 'Введите корректный email.';
    if (form.phone.trim().length < 3) nextErrors.phone = 'Минимум 3 символа.';
    if (form.login.trim().length < 3) nextErrors.login = 'Минимум 3 символа.';

    if (mode === 'create' && form.password.length < 6) {
      nextErrors.password = 'Пароль обязателен при создании, минимум 6 символов.';
    }

    if (mode === 'edit' && form.password && form.password.length < 6) {
      nextErrors.password = 'Новый пароль должен быть минимум 6 символов.';
    }

    if (!Number(form.role_id)) nextErrors.role_id = 'Выберите роль.';

    if (!['ru', 'ky', 'en'].includes(form.preferred_language)) {
      nextErrors.preferred_language = 'Выберите ru, ky или en.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validate()) return;

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      login: form.login.trim(),
      role_id: Number(form.role_id),
      preferred_language: form.preferred_language,
      is_active: Boolean(form.is_active),
    };

    if (form.password) {
      payload.password = form.password;
    }

    onSubmit(payload);
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit} noValidate>
      <div className="admin-form__grid">
        <label className="form-field">
          <span>ФИО</span>
          <input
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            placeholder="Имя пользователя"
          />
          {errors.full_name && <small>{errors.full_name}</small>}
        </label>

        <label className="form-field">
          <span>Email</span>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="user@example.com"
          />
          {errors.email && <small>{errors.email}</small>}
        </label>

        <label className="form-field">
          <span>Телефон</span>
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="+996..." />
          {errors.phone && <small>{errors.phone}</small>}
        </label>

        <label className="form-field">
          <span>Логин</span>
          <input name="login" value={form.login} onChange={handleChange} placeholder="login" />
          {errors.login && <small>{errors.login}</small>}
        </label>

        <label className="form-field">
          <span>{mode === 'edit' ? 'Новый пароль' : 'Пароль'}</span>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder={mode === 'edit' ? 'Оставьте пустым без смены' : 'Минимум 6 символов'}
          />
          {errors.password && <small>{errors.password}</small>}
        </label>

        <label className="form-field">
          <span>Роль</span>
          <select name="role_id" value={form.role_id} onChange={handleChange}>
            {roleOptions.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name || role.code || `Role #${role.id}`} ({role.code || `id ${role.id}`})
              </option>
            ))}
          </select>
          {errors.role_id && <small>{errors.role_id}</small>}
        </label>

        <label className="form-field">
          <span>Язык</span>
          <select name="preferred_language" value={form.preferred_language} onChange={handleChange}>
            <option value="ru">Русский</option>
            <option value="ky">Кыргызский</option>
            <option value="en">English</option>
          </select>
          {errors.preferred_language && <small>{errors.preferred_language}</small>}
        </label>

        <label className="admin-check-field">
          <input name="is_active" type="checkbox" checked={form.is_active} onChange={handleChange} />
          <span>Активный пользователь</span>
        </label>
      </div>

      <div className="admin-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {mode === 'edit' ? 'Сохранить пользователя' : 'Создать пользователя'}
        </Button>
      </div>
    </form>
  );
}

export default UserForm;