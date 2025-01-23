import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Suspense } from 'react';
import { CircularProgress } from '@mui/material';

// Providers
import { AuthProvider } from './contexts/AuthContext';
import { DevelopmentProvider } from './contexts/DevelopmentContext';

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
            index: true,
            element: <Navigate to="/dashboard" replace />
          }
        ]
      }
    ]
  }
]);

export const App = () => {
  const updateHealth = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Health check response:', data);
      
      // Update your UI based on health status
      setHealthStatus(data.status === 'healthy');
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus(false);
    }
  };

  return (
    <ErrorBoundary>
      <Suspense fallback={<CircularProgress />}>
        <DevelopmentProvider>
          <AuthProvider>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <RouterProvider router={router} />
            </ThemeProvider>
          </AuthProvider>
        </DevelopmentProvider>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;