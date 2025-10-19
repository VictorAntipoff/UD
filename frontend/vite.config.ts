/// <reference types="vite/client" />

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        buffer: 'buffer/',
      },
      dedupe: ['@emotion/react', '@emotion/styled', 'react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@emotion/react', '@emotion/styled', '@mui/material'],
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
      force: true,
    },
    server: {
      port: 3020,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3010',
          changeOrigin: true,
          secure: false
        },
      },
    },
    preview: {
      port: 3020
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      // Control modulePreload to prevent unused preloads
      modulePreload: {
        polyfill: false,
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Bundle everything together to avoid React duplication issues
            if (id.includes('node_modules')) {
              // Keep React, MUI, and Emotion in ONE chunk to prevent initialization errors
              if (id.includes('react') || id.includes('react-dom') || id.includes('@emotion') || id.includes('@mui')) {
                return 'vendor';
              }
              return 'vendor';
            }
          },
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    },
    // Make env variables available
    define: {
      __SUPABASE_URL__: JSON.stringify(process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL),
      __SUPABASE_ANON_KEY__: JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY),
      'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || env.VITE_API_URL)
    },
    assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
  };
});