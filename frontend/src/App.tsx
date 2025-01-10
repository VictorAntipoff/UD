import { RouterProvider, createBrowserRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom';
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

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route path="/login" element={<LoginPage />} />
      
      <Route element={<AuthWrapper />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          
          <Route path="factory">
            <Route path="wood-slicer" element={<WoodSlicer />} />
            <Route path="drying-process" element={<DryingProcess />} />
            <Route path="wood-calculator" element={<WoodCalculator />} />
          </Route>
          
          <Route path="settings">
            <Route path="user" element={<UserSettings />} />
            <Route path="admin" element={<AdminSettings />} />
          </Route>
        </Route>
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  )
);

function App() {
  return (
    <DevelopmentProvider>
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <RouterProvider router={router} />
        </ThemeProvider>
      </AuthProvider>
    </DevelopmentProvider>
  );
}

export default App;