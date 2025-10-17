import { RouteObject } from 'react-router-dom';
import Dashboard from '../pages/dashboard/Dashboard';
import {
  WoodCalculator,
  WoodSlicer,
  DryingProcess,
  ReceiptProcessing
} from '../pages/factory';
import WoodTransfer from '../pages/factory/WoodTransfer';
import InventoryReports from '../pages/factory/InventoryReports';
import { UserSettings, AdminSettings } from '../pages/settings';
import WoodTypeManagement from '../pages/management/WoodTypeManagement';
import WarehouseManagement from '../pages/management/WarehouseManagement';
import LoginPage from '../pages/auth/LoginPage';
import UnauthorizedPage from '../pages/auth/UnauthorizedPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import Layout from '../components/Layout/Layout';
import ApprovalsManagement from '../pages/management/ApprovalsManagement';
import WoodReceipt from '../pages/management/WoodReceipt';
import WoodDryingSettings from '../pages/management/WoodDryingSettings';
import AssetList from '../pages/assets/AssetList';
import AssetDetail from '../pages/assets/AssetDetail';
import AssetForm from '../pages/assets/AssetForm';
import ComingSoon from '../pages/ComingSoon';
import Pages from '../pages/website/Pages';
import PageEditor from '../pages/website/PageEditor';
import Files from '../pages/website/Files';

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <ComingSoon />
  },
  {
    path: '/dashboard',
    element: <ProtectedLayout><Layout /></ProtectedLayout>,
    children: [
      {
        index: true,
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
            path: 'wood-transfer',
            element: <WoodTransfer />
          },
          {
            path: 'inventory',
            element: <InventoryReports />
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
            path: 'warehouses',
            element: <WarehouseManagement />
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
      },
      {
        path: 'assets',
        children: [
          {
            index: true,
            element: <AssetList />
          },
          {
            path: 'new',
            element: <AssetForm />
          },
          {
            path: ':id',
            element: <AssetDetail />
          },
          {
            path: ':id/edit',
            element: <AssetForm />
          }
        ]
      },
      {
        path: 'website',
        children: [
          {
            path: 'pages',
            children: [
              {
                index: true,
                element: <Pages />
              },
              {
                path: ':pageId',
                element: <PageEditor />
              }
            ]
          },
          {
            path: 'files',
            element: <Files />
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