import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Suspense } from 'react';
import { CircularProgress } from '@mui/material';

// Providers
import { AuthProvider } from './contexts/AuthContext';

// Pages and Components
import LoginPage from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import AuthWrapper from './components/AuthWrapper';
import MainLayout from './layouts/MainLayout';
import { ErrorPage } from './components/ErrorPage';
import UserSettings from './pages/settings/UserSettings';
import AdminSettings from './pages/settings/AdminSettings';
import WoodCalculator from './pages/factory/WoodCalculator';
import ProtectedRoute from './components/ProtectedRoute';
import WoodTypeManagement from './pages/management/WoodTypeManagement';
import UnauthorizedPage from './pages/UnauthorizedPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: <AuthWrapper />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '',
        element: <MainLayout />,
        children: [
          {
            path: 'dashboard',
            element: <ProtectedRoute><HomePage /></ProtectedRoute>
          },
          {
            path: 'settings/user',
            element: <ProtectedRoute><UserSettings /></ProtectedRoute>
          },
          {
            path: 'settings/admin',
            element: <ProtectedRoute><AdminSettings /></ProtectedRoute>
          },
          {
            path: 'factory/wood-calculator',
            element: <ProtectedRoute><WoodCalculator /></ProtectedRoute>
          },
          {
            path: 'management/wood-types',
            element: <ProtectedRoute><WoodTypeManagement /></ProtectedRoute>
          },
          {
            path: 'unauthorized',
            element: <UnauthorizedPage />
          },
          {
            index: true,
            element: <Navigate to="/dashboard" replace />
          }
        ]
      }
    ]
  }
]);

export const App = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<CircularProgress />}>
        <AuthProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <RouterProvider router={router} />
          </ThemeProvider>
        </AuthProvider>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;