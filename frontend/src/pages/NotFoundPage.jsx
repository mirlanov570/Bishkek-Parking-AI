import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <main className="simple-page">
      <section className="simple-card">
        <span className="simple-code">404</span>
        <h1>Страница не найдена</h1>
        <p>
          Такого маршрута в frontend пока нет. Проверьте адрес страницы или
          вернитесь в систему.
        </p>

        <div className="simple-actions">
          <Link className="primary-button" to="/dashboard">
            На dashboard
          </Link>
          <Link className="secondary-button" to="/login">
            На страницу входа
          </Link>
        </div>
      </section>
    </main>
  );
}

export default NotFoundPage;