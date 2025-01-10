import { Navigate, RouterProvider, createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import AuthWrapper from './components/AuthWrapper';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DevelopmentProvider } from './contexts/DevelopmentContext';

// === Page Imports ===
import LoginPage from './pages/login/LoginPage';
import WoodSlicer from './pages/WoodSlicer';
import HomePage from './pages/HomePage';
import MainLayout from './layouts/MainLayout';
import UserSettings from './pages/settings/UserSettings';
import AdminSettings from './pages/settings/AdminSettings';
import DryingProcess from './pages/factory/DryingProcess';
import WoodCalculator from './pages/factory/WoodCalculator';

// === Router Configuration ===
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      {/* === Auth Routes === */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* === Protected Routes === */}
      <Route element={<AuthWrapper />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          
          {/* === Factory Hub Section === */}
          <Route path="factory">
            <Route path="wood-slicer" element={<WoodSlicer />} />
            <Route path="drying-process" element={<DryingProcess />} />
            <Route path="wood-calculator" element={<WoodCalculator />} />
          </Route>
          
          {/* === Settings Section === */}
          <Route path="settings">
            <Route path="user" element={<UserSettings />} />
            <Route path="admin" element={<AdminSettings />} />
          </Route>
        </Route>
      </Route>
      
      {/* === Fallback Route === */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  ),
  {
    future: {
      v7_relativeSplatPath: true,
      v7_normalizeFormMethod: true
    }
  }
);

function App() {
  return (
    <DevelopmentProvider>
      <AuthProvider>
        <ErrorBoundary>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <RouterProvider router={router} />
          </ThemeProvider>
        </ErrorBoundary>
      </AuthProvider>
    </DevelopmentProvider>
  );
}

export default App;