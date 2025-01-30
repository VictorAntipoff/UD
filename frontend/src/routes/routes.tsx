import { RouteObject } from 'react-router-dom';
import Dashboard from '../pages/dashboard/Dashboard';
import WoodCalculator from '../pages/factory/WoodCalculator';
import WoodSlicer from '../pages/factory/WoodSlicer';
import UserSettings from '../pages/settings/UserSettings';
import AdminSettings from '../pages/settings/AdminSettings';
import WoodTypeManagement from '../pages/management/WoodTypeManagement';
import LoginPage from '../pages/auth/LoginPage';
import UnauthorizedPage from '../pages/auth/UnauthorizedPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import Layout from '../components/Layout/Layout';

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
};

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <ProtectedLayout><Dashboard /></ProtectedLayout>
  },
  {
    path: '/dashboard',
    element: <ProtectedLayout><Dashboard /></ProtectedLayout>
  },
  {
    path: '/factory',
    children: [
      {
        path: 'calculator',
        element: <ProtectedLayout><WoodCalculator /></ProtectedLayout>
      },
      {
        path: 'slicer',
        element: <ProtectedLayout><WoodSlicer /></ProtectedLayout>
      }
    ]
  },
  {
    path: '/management',
    children: [
      {
        path: 'wood-types',
        element: <ProtectedLayout><WoodTypeManagement /></ProtectedLayout>
      }
    ]
  },
  {
    path: '/settings',
    children: [
      {
        path: 'user',
        element: <ProtectedLayout><UserSettings /></ProtectedLayout>
      },
      {
        path: 'admin',
        element: <ProtectedLayout><AdminSettings /></ProtectedLayout>
      }
    ]
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />
  }
]; 