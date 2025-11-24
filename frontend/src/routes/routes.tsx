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
import { UserSettings, AdminSettings, NotificationSettings } from '../pages/settings';
import WoodTypeManagement from '../pages/management/WoodTypeManagement';
import WarehouseManagement from '../pages/management/WarehouseManagement';
import StockAdjustment from '../pages/management/StockAdjustment';
import LoginPage from '../pages/auth/LoginPage';
import UnauthorizedPage from '../pages/auth/UnauthorizedPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import Layout from '../components/Layout/Layout';
import ApprovalsManagement from '../pages/management/ApprovalsManagement';
import WoodReceipt from '../pages/management/WoodReceipt';
import WoodDryingSettings from '../pages/management/WoodDryingSettings';
import DryingCostReports from '../pages/management/DryingCostReports';
import AssetList from '../pages/assets/AssetList';
import AssetDetail from '../pages/assets/AssetDetail';
import AssetForm from '../pages/assets/AssetForm';
import AssetSettings from '../pages/assets/AssetSettings';
import AssetLocations from '../pages/assets/AssetLocations';
import AssetTransfers from '../pages/assets/AssetTransfers';
import AssetReports from '../pages/assets/AssetReports';
import ComingSoon from '../pages/ComingSoon';
import Pages from '../pages/website/Pages';
import PageEditor from '../pages/website/PageEditor';
import Files from '../pages/website/Files';
import Clients from '../pages/crm/Clients';
import NotificationCentre from '../pages/notifications/NotificationCentre';

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
            path: 'stock-adjustment',
            element: <StockAdjustment />
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
          },
          {
            path: 'drying-cost-reports',
            element: <DryingCostReports />
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
          },
          {
            path: 'notifications',
            element: <NotificationSettings />
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
            path: 'settings',
            element: <AssetSettings />
          },
          {
            path: 'locations',
            element: <AssetLocations />
          },
          {
            path: 'transfers',
            element: <AssetTransfers />
          },
          {
            path: 'reports',
            element: <AssetReports />
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
      },
      {
        path: 'crm',
        children: [
          {
            path: 'clients',
            element: <Clients />
          }
        ]
      },
      {
        path: 'notifications',
        element: <NotificationCentre />
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