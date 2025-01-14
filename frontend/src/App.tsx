import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

// Providers
import { AuthProvider } from './contexts/AuthContext';
import { DevelopmentProvider } from './contexts/DevelopmentContext';

// Components
import AuthWrapper from './components/AuthWrapper';
import { ErrorBoundary } from './components/ErrorBoundary';

// Layouts
import MainLayout from './layouts/MainLayout';

// Pages
import LoginPage from './pages/login/LoginPage';
import HomePage from './pages/HomePage';
import WoodSlicer from './pages/factory/WoodSlicer';
import DryingProcess from './pages/factory/DryingProcess';
import WoodCalculator from './pages/factory/WoodCalculator';
import UserSettings from './pages/settings/UserSettings';
import AdminSettings from './pages/settings/AdminSettings';

// Router configuration
const router = createBrowserRouter(
  [
    {
      path: '/login',
      element: <LoginPage />
    },
    {
      element: <AuthWrapper />,
      children: [
        {
          path: '/',
          element: <MainLayout />,
          children: [
            {
              index: true,
              element: <HomePage />
            },
            {
              path: 'factory',
              children: [
                { path: 'wood-slicer', element: <WoodSlicer /> },
                { path: 'drying-process', element: <DryingProcess /> },
                { path: 'wood-calculator', element: <WoodCalculator /> }
              ]
            },
            {
              path: 'settings',
              children: [
                { path: 'user', element: <UserSettings /> },
                { path: 'admin', element: <AdminSettings /> }
              ]
            }
          ]
        }
      ]
    },
    {
      path: '*',
      element: <Navigate to="/" replace />
    }
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true
    }
  }
);

function App() {
  return (
    <DevelopmentProvider>
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ErrorBoundary>
            <RouterProvider 
              router={router}
              future={{
                v7_startTransition: true
              }}
            />
          </ErrorBoundary>
        </ThemeProvider>
      </AuthProvider>
    </DevelopmentProvider>
  );
}

export default App;