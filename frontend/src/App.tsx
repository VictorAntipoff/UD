import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

// Providers
import { AuthProvider } from './contexts/AuthContext';
import { DevelopmentProvider } from './contexts/DevelopmentContext';

// Pages and Components
import LoginPage from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import AuthWrapper from './components/AuthWrapper';
import MainLayout from './layouts/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorPage } from './components/ErrorPage';

const router = createBrowserRouter(
  [
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
              index: true,
              element: <HomePage />
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
      v7_startTransition: false,
      v7_relativeSplatPath: false
    }
  }
);

export const App = () => {
  return (
    <ErrorBoundary>
      <DevelopmentProvider>
        <AuthProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <RouterProvider 
              router={router}
              future={{
                v7_startTransition: false,
                v7_relativeSplatPath: false
              }}
            />
          </ThemeProvider>
        </AuthProvider>
      </DevelopmentProvider>
    </ErrorBoundary>
  );
};

export default App;