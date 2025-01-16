/// <reference types="vite/client" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: './dist',
    sourcemap: true,
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material']
        },
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  server: {
    port: 3020,
    strictPort: true,
    host: true,
    proxy: {
      '^/api/.*': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('Proxy error:', err);
          });
        }
      }
    }
  },
  preview: {
    port: 3020,
    strictPort: true
  },
  esbuild: {
    supported: {
      'top-level-await': true
    }
  },
  optimizeDeps: {
    exclude: ['@swc/wasm-web'],
    include: ['react', 'react-dom']
  }
});