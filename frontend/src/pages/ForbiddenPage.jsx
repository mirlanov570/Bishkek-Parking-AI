import { Link } from 'react-router-dom';

function ForbiddenPage() {
  return (
    <main className="simple-page">
      <section className="simple-card">
        <span className="simple-code">403</span>
        <h1>Доступ запрещён</h1>
        <p>
          У вашей роли нет прав для просмотра этой страницы. Если доступ нужен,
          обратитесь к администратору системы.
        </p>

        <div className="simple-actions">
          <Link className="primary-button" to="/dashboard">
            На dashboard
          </Link>
          <Link className="secondary-button" to="/login">
            Войти другим пользователем
          </Link>
        </div>
      </section>
    </main>
  );
}

export default ForbiddenPage;