/// <reference types="vite/client" />

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192-maskable.png', 'pwa-512x512-maskable.png'],
        manifest: {
          name: 'UDesign',
          short_name: 'UDesign',
          description: 'Factory management system for wood processing and drying operations',
          theme_color: '#dc2626',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'any',
          scope: '/',
          start_url: '/dashboard',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-1024x1024.png',
              sizes: '1024x1024',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-192x192-maskable.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/pwa-512x512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5 // 5 minutes
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: true,
          type: 'module'
        }
      })
    ],
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
      strictPort: true, // Fail if port 3020 is already in use instead of trying next port
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3010',
          changeOrigin: true,
          secure: false
        },
        '/uploads': {
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