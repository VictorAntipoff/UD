/// <reference types="vite/client" />

import { defineConfig, loadEnv, ConfigEnv, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

// Custom plugin to handle React Refresh warnings
const handleRefreshWarnings = (): Plugin => ({
  name: 'handle-refresh-warnings',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.endsWith('.tsx')) return;
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

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      handleRefreshWarnings(),
      react({
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: ['@emotion/babel-plugin']
        }
      })
    ],
    build: {
      outDir: 'build',
      sourcemap: true,
      minify: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@mui/icons-material']
          }
        }
      },
      chunkSizeWarningLimit: 1000,
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true
      }
    },
    optimizeDeps: {
      include: [
        '@emotion/react',
        '@emotion/styled',
        'hoist-non-react-statics',
        'prop-types',
        '@mui/styled-engine'
      ],
      esbuildOptions: {
        target: 'es2020'
      }
    },
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    esbuild: {
      supported: {
        'top-level-await': true
      }
    }
  };
}); 