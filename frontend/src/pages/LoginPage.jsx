import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { APP_NAME } from '../utils/constants';
import AppLogo from '../components/common/AppLogo';
import ThemeModeSwitch from '../components/common/ThemeModeSwitch';
import { getApiErrorMessage } from '../utils/apiErrors';

function EyeIcon({ isOpen }) {
  if (isOpen) {
    return (
      <svg
        className="auth-password-toggle__icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
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
    <svg
      className="auth-password-toggle__icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M2 12C3.5 8.5 7 4.86 12 4.86C17 4.86 20.5 8.5 22 12C20.5 15.5 17 19.14 12 19.14C7 19.14 3.5 15.5 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, login } = useAuth();

  const [formData, setFormData] = useState({
    username: location.state?.login || '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectPath = useMemo(() => {
    const fromPath = location.state?.from?.pathname;

    if (!fromPath || fromPath === '/login' || fromPath === '/register') {
      return '/dashboard';
    }

    return fromPath;
  }, [location.state]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectPath]);

  if (!isLoading && isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    if (errorMessage) {
      setErrorMessage('');
    }

    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const username = formData.username.trim();
    const password = formData.password;

    if (!username || !password) {
      setErrorMessage('Введите логин и пароль.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await login({
        username,
        password,
      });

      navigate(redirectPath, { replace: true });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Не удалось выполнить вход. Проверьте логин и пароль.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <ThemeModeSwitch className="auth-theme-switch" />

      <section className="auth-card login-card" aria-labelledby="login-title">
        <div className="auth-brand">
          <AppLogo className="auth-logo" decorative />

          <div className="auth-heading">
            <span className="auth-eyebrow">{APP_NAME}</span>
            <h1 id="login-title" className="auth-title">
              Вход
            </h1>
            <p className="auth-subtitle">Введите данные аккаунта</p>
          </div>
        </div>

        <form className="auth-form auth-form--compact" onSubmit={handleSubmit}>
          {successMessage && (
            <div className="form-success auth-message" role="status">
              <span className="auth-message__icon" aria-hidden="true">
                ✓
              </span>
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="form-error auth-message" role="alert">
              <span className="auth-message__icon" aria-hidden="true">
                !
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="auth-input-box">
            <label className="auth-field-label" htmlFor="username">
              Логин
            </label>
            <input
              id="username"
              name="username"
              className="form-input auth-input auth-input--plain"
              type="text"
              autoComplete="username"
              placeholder="Логин"
              value={formData.username}
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
              autoComplete="current-password"
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

          <button className="form-submit-button auth-submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Выполняется вход...' : 'Войти'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Нет аккаунта?</span>
          <Link to="/register">Зарегистрироваться</Link>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;