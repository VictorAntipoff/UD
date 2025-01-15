/// <reference types="vite/client" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build'
  },
  server: {
    port: 3020,
    strictPort: true,
    host: true,
    hmr: {
      overlay: false
    }
  }
});