/// <reference types="vite/client" />

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'https://ud-backend-production.up.railway.app')
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@mui/icons-material']
          }
        }
      }
    },
    server: {
      port: 3020,
      strictPort: true,
      proxy: {
        '^/api/.*': {
          target: 'http://localhost:3010',
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});