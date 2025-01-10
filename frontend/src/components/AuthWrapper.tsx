import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';

export default function AuthWrapper() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
} 