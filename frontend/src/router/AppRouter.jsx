import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminParkingsPage from '../pages/admin/AdminParkingsPage';
import AdminRequestsPage from '../pages/admin/AdminRequestsPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminZonesPage from '../pages/admin/AdminZonesPage';
import AnalyticsPage from '../pages/AnalyticsPage';
import DashboardPage from '../pages/DashboardPage';
import ForbiddenPage from '../pages/ForbiddenPage';
import LoginPage from '../pages/LoginPage';
import MapPage from '../pages/MapPage';
import MyRequestsPage from '../pages/MyRequestsPage';
import NotFoundPage from '../pages/NotFoundPage';
import ParkingsPage from '../pages/ParkingsPage';
import PredictionsPage from '../pages/PredictionsPage';
import RecommendationsPage from '../pages/RecommendationsPage';
import RegisterPage from '../pages/RegisterPage';
import { API_ERROR_EVENTS } from '../utils/apiErrors';
import ProtectedRoute from './ProtectedRoute';

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <main className="auth-status-page">
        <div className="auth-status-card">
          <div className="auth-spinner" />
          <h1>{t('common.loading')}</h1>
          <p>{t('auth.checking')}</p>
        </div>
      </main>
    );
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

function ApiEventsGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleForbidden = () => {
      navigate('/403', { replace: true });
    };

    window.addEventListener(API_ERROR_EVENTS.FORBIDDEN, handleForbidden);

    return () => {
      window.removeEventListener(API_ERROR_EVENTS.FORBIDDEN, handleForbidden);
    };
  }, [navigate]);

  return null;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <ApiEventsGuard />

      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/parkings" element={<ParkingsPage />} />
          <Route path="/my-requests" element={<MyRequestsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/predictions" element={<PredictionsPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/parkings"
            element={
              <ProtectedRoute adminOnly>
                <AdminParkingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/zones"
            element={
              <ProtectedRoute adminOnly>
                <AdminZonesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/requests"
            element={
              <ProtectedRoute adminOnly>
                <AdminRequestsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;