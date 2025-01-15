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
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_relativeSplatPath: true,
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
            <RouterProvider router={router} />
          </ErrorBoundary>
        </ThemeProvider>
      </AuthProvider>
    </DevelopmentProvider>
  );
}

export default App;