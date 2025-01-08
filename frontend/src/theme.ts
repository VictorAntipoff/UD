import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#CC0000',
      light: '#ff1a1a',
      dark: '#990000'
    },
    secondary: {
      main: '#666666',
      light: '#808080',
      dark: '#4d4d4d'
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff'
    }
  },
  typography: {
    fontFamily: [
      'Segoe UI',
      'Roboto',
      'Arial',
      'sans-serif'
    ].join(',')
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#666666',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
        }
      }
    }
  }
});

export default theme; 