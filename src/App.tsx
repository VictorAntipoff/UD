import { ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        {/* Your app content */}
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App; 