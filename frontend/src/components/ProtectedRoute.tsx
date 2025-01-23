import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null; // or a loading spinner
  }

  if (!isAuthenticated) {
    // Store the current location before redirecting
    sessionStorage.setItem('redirectUrl', location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
} 