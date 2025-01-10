import { useAuth } from '../contexts/AuthContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function AuthWrapper() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  console.log('AuthWrapper - isAuthenticated:', isAuthenticated);
  console.log('Current location:', location);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
} 