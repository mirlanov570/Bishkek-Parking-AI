import { useState } from 'react';
import axios from 'axios';
import { APP_NAME, HEALTH_ENDPOINTS, PROJECT_LINKS } from '../utils/constants';

const getStatusLabel = (state) => {
  const labels = {
    idle: 'Ожидает',
    loading: 'Проверка',
    success: 'Доступен',
    error: 'Ошибка',
  };

  return labels[state] || state;
};

const createInitialHealthChecks = () =>
  HEALTH_ENDPOINTS.map((endpoint) => ({
    ...endpoint,
    state: 'idle',
    status: null,
    message: 'Проверка ещё не выполнялась.',
    data: null,
  }));

function HomePage() {
  const [healthChecks, setHealthChecks] = useState(createInitialHealthChecks);
  const [isChecking, setIsChecking] = useState(false);

  const updateHealthCheck = (key, payload) => {
    setHealthChecks((currentChecks) =>
      currentChecks.map((check) =>
        check.key === key
          ? {
              ...check,
              ...payload,
            }
          : check,
      ),
    );
  };

  const checkEndpoint = async (endpoint) => {
    updateHealthCheck(endpoint.key, {
      state: 'loading',
      status: null,
      message: 'Выполняется запрос...',
      data: null,
    });

    try {
      const response = await axios.get(endpoint.url, {
        timeout: 5000,
        headers: {
          Accept: 'application/json',
        },
      });

      updateHealthCheck(endpoint.key, {
        state: 'success',
        status: response.status,
        message: `Успешно. HTTP статус: ${response.status}`,
        data: response.data,
      });
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.response?.statusText ||
        error.message ||
        'Не удалось подключиться.';

      updateHealthCheck(endpoint.key, {
        state: 'error',
        status: error.response?.status || null,
        message,
        data: error.response?.data || null,
      });
    }
  };

  const checkBackendHealth = async () => {
    setIsChecking(true);

    try {
      await Promise.all(HEALTH_ENDPOINTS.map((endpoint) => checkEndpoint(endpoint)));
    } finally {
      setIsChecking(false);
    }
  };

  const successCount = healthChecks.filter((check) => check.state === 'success').length;
  const errorCount = healthChecks.filter((check) => check.state === 'error').length;

  return (
    <main className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <div className="project-badge">Diploma Project Frontend</div>

          <h1>{APP_NAME}</h1>

          <p className="hero-description">
            Интеллектуальная система мониторинга, анализа и прогнозирования
            загруженности парковок города Бишкек.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="primary-button"
              onClick={checkBackendHealth}
              disabled={isChecking}
            >
              {isChecking ? 'Проверка...' : 'Проверить backend'}
            </button>

            <a
              className="secondary-button"
              href={PROJECT_LINKS.swagger}
              target="_blank"
              rel="noreferrer"
            >
              Открыть Swagger
            </a>
          </div>
        </div>

        <div className="hero-card">
          <div className="status-card-header">
            <div>
              <span className="status-card-title">Backend Connection</span>
              <p className="status-card-subtitle">
                Проверка /health, /health/db и /api/v1/ping
              </p>
            </div>
            <span
              className={`status-indicator ${
                errorCount > 0 ? 'error' : successCount === healthChecks.length ? 'success' : 'idle'
              }`}
            >
              {successCount}/{healthChecks.length}
            </span>
          </div>

          <div className="health-check-list">
            {healthChecks.map((check) => (
              <article key={check.key} className={`health-check-item ${check.state}`}>
                <div className="health-check-main">
                  <div>
                    <h2>{check.label}</h2>
                    <p>
                      {check.method} {check.url}
                    </p>
                  </div>
                  <span className={`status-indicator ${check.state}`}>
                    {getStatusLabel(check.state)}
                  </span>
                </div>

                <p className="status-message">{check.message}</p>

                {check.data && (
                  <pre className="status-response">
                    {JSON.stringify(check.data, null, 2)}
                  </pre>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="info-card">
          <div className="info-card-icon">API</div>
          <h2>Backend</h2>
          <p>Основной backend-сервер FastAPI.</p>
          <a href={PROJECT_LINKS.backend} target="_blank" rel="noreferrer">
            {PROJECT_LINKS.backend}
          </a>
        </article>

        <article className="info-card">
          <div className="info-card-icon">DOCS</div>
          <h2>Swagger</h2>
          <p>Документация и тестирование API endpoints.</p>
          <a href={PROJECT_LINKS.swagger} target="_blank" rel="noreferrer">
            {PROJECT_LINKS.swagger}
          </a>
        </article>

        <article className="info-card">
          <div className="info-card-icon">WEB</div>
          <h2>Frontend</h2>
          <p>React/Vite приложение для пользовательского интерфейса.</p>
          <a href={PROJECT_LINKS.frontend} target="_blank" rel="noreferrer">
            {PROJECT_LINKS.frontend}
          </a>
        </article>
      </section>
    </main>
  );
}

export default HomePage;