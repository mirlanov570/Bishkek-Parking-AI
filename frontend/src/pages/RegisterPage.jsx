import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { createUser } from '../api/usersApi';
import AppLogo from '../components/common/AppLogo';
import ThemeModeSwitch from '../components/common/ThemeModeSwitch';
import { useAuth } from '../context/AuthContext';
import { APP_NAME, USER_ROLE_IDS } from '../utils/constants';
import { getApiErrorMessage } from '../utils/apiErrors';

const KG_PHONE_PREFIX = '+996';

const INITIAL_FORM_DATA = {
  full_name: '',
  email: '',
  phone: KG_PHONE_PREFIX,
  login: '',
  password: '',
  confirmPassword: '',
};

function EyeIcon({ isOpen }) {
  if (isOpen) {
    return (
      <svg className="auth-password-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3 3L21 21"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M10.58 10.58A2 2 0 0 0 13.42 13.42"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M9.88 5.09A9.77 9.77 0 0 1 12 4.86C17 4.86 20.5 8.5 22 12C21.47 13.24 20.66 14.48 19.62 15.54"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.11 6.11C4.3 7.28 2.9 9.18 2 12C3.5 15.5 7 19.14 12 19.14C13.42 19.14 14.72 18.84 15.88 18.32"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg className="auth-password-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2 12C3.5 8.5 7 4.86 12 4.86C17 4.86 20.5 8.5 22 12C20.5 15.5 17 19.14 12 19.14C7 19.14 3.5 15.5 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const getKgPhoneLocalDigits = (phone) => {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('996')) {
    return digits.slice(3, 12);
  }

  if (digits.startsWith('0')) {
    return digits.slice(1, 10);
  }

  return digits.slice(0, 9);
};

const formatKgPhone = (value) => {
  const localDigits = getKgPhoneLocalDigits(value);

  const first = localDigits.slice(0, 3);
  const second = localDigits.slice(3, 6);
  const third = localDigits.slice(6, 9);

  return [KG_PHONE_PREFIX, first, second, third].filter(Boolean).join(' ');
};

function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    const nextValue = name === 'phone' ? formatKgPhone(value) : value;

    setFormData((currentData) => ({
      ...currentData,
      [name]: nextValue,
    }));

    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handlePhoneFocus = () => {
    if (!formData.phone.trim()) {
      setFormData((currentData) => ({
        ...currentData,
        phone: KG_PHONE_PREFIX,
      }));
    }
  };

  const validateForm = () => {
    const fullName = formData.full_name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const phoneLocalDigits = getKgPhoneLocalDigits(phone);
    const login = formData.login.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!fullName || !email || !phone || !login || !password || !confirmPassword) {
      return 'Заполните все поля регистрации.';
    }

    if (fullName.length < 2) {
      return 'ФИО должно содержать минимум 2 символа.';
    }

    if (login.length < 3) {
      return 'Логин должен содержать минимум 3 символа.';
    }

    if (phoneLocalDigits.length !== 9) {
      return 'Введите номер телефона в формате +996 XXX XXX XXX.';
    }

    if (password.length < 6) {
      return 'Пароль должен содержать минимум 6 символов.';
    }

    if (password !== confirmPassword) {
      return 'Пароли не совпадают.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const payload = {
      full_name: formData.full_name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      login: formData.login.trim(),
      password: formData.password,
      role_id: USER_ROLE_IDS.DRIVER,
      preferred_language: 'ru',
      is_active: true,
    };

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await createUser(payload);

      navigate('/login', {
        replace: true,
        state: {
          login: payload.login,
          message: 'Аккаунт создан. Теперь войдите в систему.',
        },
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Не удалось создать аккаунт. Проверьте данные формы.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <ThemeModeSwitch className="auth-theme-switch" />

      <section className="auth-card register-card" aria-labelledby="register-title">
        <div className="auth-brand">
          <AppLogo className="auth-logo" decorative />

          <div className="auth-heading">
            <span className="auth-eyebrow">{APP_NAME}</span>
            <h1 id="register-title" className="auth-title">
              Регистрация
            </h1>
            <p className="auth-subtitle">Создайте аккаунт водителя</p>
          </div>
        </div>

        <form className="auth-form auth-form--register" onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="form-error auth-message" role="alert">
              <span className="auth-message__icon" aria-hidden="true">
                !
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="auth-input-box">
            <label className="auth-field-label" htmlFor="full_name">
              ФИО
            </label>
            <input
              id="full_name"
              name="full_name"
              className="form-input auth-input auth-input--plain"
              type="text"
              autoComplete="name"
              placeholder="ФИО"
              value={formData.full_name}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="auth-two-columns">
            <div className="auth-input-box">
              <label className="auth-field-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                className="form-input auth-input auth-input--plain"
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            <div className="auth-input-box">
              <label className="auth-field-label" htmlFor="phone">
                Телефон
              </label>
              <input
                id="phone"
                name="phone"
                className="form-input auth-input auth-input--plain"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+996 XXX XXX XXX"
                value={formData.phone}
                onFocus={handlePhoneFocus}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="auth-input-box">
            <label className="auth-field-label" htmlFor="login">
              Логин
            </label>
            <input
              id="login"
              name="login"
              className="form-input auth-input auth-input--plain"
              type="text"
              autoComplete="username"
              placeholder="Логин"
              value={formData.login}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="auth-input-box auth-input-box--password">
            <label className="auth-field-label" htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              name="password"
              className="form-input auth-input auth-input--password password-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Пароль"
              value={formData.password}
              onChange={handleChange}
              disabled={isSubmitting}
            />

            <button
              type="button"
              className="password-toggle-button auth-password-toggle"
              onClick={() => setShowPassword((currentValue) => !currentValue)}
              disabled={isSubmitting}
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              <EyeIcon isOpen={showPassword} />
            </button>
          </div>

          <div className="auth-input-box auth-input-box--password">
            <label className="auth-field-label" htmlFor="confirmPassword">
              Повторите пароль
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              className="form-input auth-input auth-input--password password-input"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Повторите пароль"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isSubmitting}
            />

            <button
              type="button"
              className="password-toggle-button auth-password-toggle"
              onClick={() => setShowConfirmPassword((currentValue) => !currentValue)}
              disabled={isSubmitting}
              aria-label={showConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'}
              title={showConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              <EyeIcon isOpen={showConfirmPassword} />
            </button>
          </div>

          <button className="form-submit-button auth-submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Создаем аккаунт...' : 'Создать аккаунт'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Уже есть аккаунт?</span>
          <Link to="/login">Войти</Link>
        </div>
      </section>
    </main>
  );
}

export default RegisterPage;