import { Navigate, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { 
  createBrowserRouter, 
  createRoutesFromElements, 
  Route,
  Outlet
} from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import WoodSlicer from './pages/WoodSlicer';
import HomePage from './pages/HomePage';
import MainLayout from './layouts/MainLayout';
import UserSettings from './pages/settings/UserSettings';
import AdminSettings from './pages/settings/AdminSettings';
import UnauthorizedPage from './pages/UnauthorizedPage';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </ThemeProvider>
    }>
      <Route path="login" element={<LoginPage />} />
      <Route path="unauthorized" element={<UnauthorizedPage />} />
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="factory">
          <Route path="wood-slicer" element={<WoodSlicer />} />
          <Route path="drying" element={<WoodSlicer />} />
        </Route>
        <Route path="settings">
          <Route path="user" element={<UserSettings />} />
          <Route 
            path="admin" 
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminSettings />
              </ProtectedRoute>
            } 
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  )
);

export default function App() {
  return <RouterProvider router={router} />;
}