// === Application Entry Point ===
// File: src/main.tsx
// Description: Main entry point for the React application

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// @vite-ignore
import './config/axios';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);