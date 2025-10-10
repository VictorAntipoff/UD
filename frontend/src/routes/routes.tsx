import { RouteObject } from 'react-router-dom';
import Dashboard from '../pages/dashboard/Dashboard';
import { 
  WoodCalculator, 
  WoodSlicer, 
  DryingProcess,
  ReceiptProcessing 
} from '../pages/factory';
import { UserSettings, AdminSettings } from '../pages/settings';
import WoodTypeManagement from '../pages/management/WoodTypeManagement';
import LoginPage from '../pages/auth/LoginPage';
import UnauthorizedPage from '../pages/auth/UnauthorizedPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import Layout from '../components/Layout/Layout';
import ApprovalsManagement from '../pages/management/ApprovalsManagement';
import WoodReceipt from '../pages/management/WoodReceipt';
import WoodDryingSettings from '../pages/management/WoodDryingSettings';

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <ProtectedLayout><Layout /></ProtectedLayout>,
    children: [
      {
        path: '/',
        element: <Dashboard />
      },
      {
        path: 'dashboard',
        element: <Dashboard />
      },
      {
        path: 'factory',
        children: [
          {
            path: 'wood-calculator',
            element: <WoodCalculator />
          },
          {
            path: 'wood-slicer',
            element: <WoodSlicer />
          },
          {
            path: 'drying-process',
            element: <DryingProcess />
          },
          {
            path: 'receipt-processing',
            element: <ReceiptProcessing />
          }
        ]
      },
      {
        path: 'management',
        children: [
          {
            path: 'wood-types',
            element: <WoodTypeManagement />
          },
          {
            path: 'approvals',
            element: <ApprovalsManagement />
          },
          {
            path: 'wood-receipt',
            element: <WoodReceipt />
          },
          {
            path: 'drying-settings',
            element: <WoodDryingSettings />
          }
        ]
      },
      {
        path: 'settings',
        children: [
          {
            path: 'user',
            element: <UserSettings />
          },
          {
            path: 'admin',
            element: <AdminSettings />
          }
        ]
      }
    ]
  },
  {
    path: 'login',
    element: <LoginPage />
  },
  {
    path: 'unauthorized',
    element: <UnauthorizedPage />
  }
]; 