import { Navigate, RouterProvider, createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import AuthWrapper from './components/AuthWrapper';
import { ErrorBoundary } from './components/ErrorBoundary';

// === Page Imports ===
import LoginPage from './pages/LoginPage';
import WoodSlicer from './pages/WoodSlicer';
import HomePage from './pages/HomePage';
import MainLayout from './layouts/MainLayout';
import UserSettings from './pages/settings/UserSettings';
import AdminSettings from './pages/settings/AdminSettings';

// === Router Configuration ===
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      {/* === Auth Routes === */}
      <Route element={<AuthWrapper />}>
        <Route path="login" element={<LoginPage />} />
        
        {/* === Main Application Routes === */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          
          {/* === Factory Section === */}
          <Route path="factory">
            <Route path="wood-slicer" element={<WoodSlicer />} />
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
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_normalizeFormMethod: true,
      v7_prependBasename: true
    }
  }
);

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RouterProvider router={router} />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;