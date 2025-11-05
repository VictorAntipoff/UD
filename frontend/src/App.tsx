import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { TimezoneProvider } from './contexts/TimezoneContext';
import { routes } from './routes/routes';
import theme from './theme/theme';
import PWAInstallPrompt from './components/PWAInstallPrompt';

const router = createBrowserRouter(routes, {
  future: {
    v7_relativeSplatPath: true,
    v7_startTransition: true
  }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <TimezoneProvider>
          <RouterProvider
            router={router}
            future={{ v7_startTransition: true }}
          />
          <PWAInstallPrompt />
        </TimezoneProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;