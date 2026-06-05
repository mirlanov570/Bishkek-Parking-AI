import { Navigate, useLocation } from 'react-router-dom';
import Loader from '../components/common/Loader';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, adminOnly = false, driverOnly = false }) {
  const { isAuthenticated, isLoading, isAdmin, isDriver } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loader fullPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/403" replace />;
  }

  if (driverOnly && !isDriver) {
    return <Navigate to="/403" replace />;
  }

  return children;
}

export default ProtectedRoute;