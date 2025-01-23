import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Dashboard from '../pages/Dashboard';
import WoodCalculator from '../pages/factory/WoodCalculator';
import WoodTypeManagement from '../pages/management/WoodTypeManagement';
import UserSettings from '../pages/UserSettings';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import LoginPage from '../pages/LoginPage';
import ProtectedRoute from '../components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '/',
        element: <Dashboard />
      },
      {
        path: '/dashboard',
        element: <Dashboard />
      },
      {
        path: '/factory',
        element: (
          <ProtectedRoute>
            <WoodCalculator />
          </ProtectedRoute>
        )
      },
      {
        path: '/management/wood-types',
        element: (
          <ProtectedRoute>
            <WoodTypeManagement />
          </ProtectedRoute>
        )
      },
      {
        path: '/settings',
        element: (
          <ProtectedRoute>
            <UserSettings />
          </ProtectedRoute>
        )
      },
      {
        path: '/unauthorized',
        element: <UnauthorizedPage />
      }
    ]
  }
]);

export default router; 