// === Application Entry Point ===
// File: src/main.tsx
// Description: Main entry point for the React application

import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { SnackbarProvider } from 'notistack';

// Configure axios defaults
import axios from 'axios';
axios.defaults.baseURL = import.meta.env.VITE_API_URL;
axios.defaults.withCredentials = true;

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const root = createRoot(container);

root.render(
  <SnackbarProvider
    maxSnack={3}
    anchorOrigin={{
      vertical: 'top',
      horizontal: 'right',
    }}
    autoHideDuration={4000}
  >
    <App />
  </SnackbarProvider>
);