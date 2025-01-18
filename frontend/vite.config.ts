/// <reference types="vite/client" />

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

// Custom plugin to handle React Refresh warnings
const handleRefreshWarnings = (): Plugin => ({
  name: 'handle-refresh-warnings',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.endsWith('.tsx')) return;

    // Add @vite-ignore to the specific React Refresh dynamic imports
    return code.replace(
      /(\s+)import\(import\.meta\.url\)\.then\(\(currentExports\)/g,
      '$1/* @vite-ignore */\nimport(import.meta.url).then((currentExports)'
    );
  }
});

const getApiUrl = (mode: string, env: Record<string, string>) => {
  switch (mode) {
    case 'production':
      return 'https://ud-backend.vercel.app';
    case 'staging':
      return 'https://ud-backend-staging.vercel.app';
    default:
      return env.VITE_API_URL || 'http://localhost:3010';
  }
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      handleRefreshWarnings(),
      react()
    ],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(getApiUrl(mode, env))
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