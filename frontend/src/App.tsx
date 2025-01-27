import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Suspense } from 'react';
import { CircularProgress } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { DevelopmentProvider } from './contexts/DevelopmentContext';

// Pages
import LoginPage from './pages/auth/LoginPage';
import HomePage from './pages/dashboard/HomePage';
import ErrorPage from './components/ErrorPage';
import UserSettings from './pages/settings/UserSettings';
import AdminSettings from './pages/settings/AdminSettings';
import WoodCalculator from './pages/factory/WoodCalculator';
import WoodTypeManagement from './pages/management/WoodTypeManagement';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import MainLayout from './layouts/MainLayout';
import { AuthWrapper } from './components/AuthWrapper';
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient();

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
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <DevelopmentProvider>
              <ThemeProvider theme={theme}>
                <CssBaseline />
                <RouterProvider router={router} />
              </ThemeProvider>
            </DevelopmentProvider>
          </AuthProvider>
        </QueryClientProvider>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;