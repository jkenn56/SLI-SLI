import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: false,
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
      '/checkout': 'http://localhost:5000',
      '/admin': 'http://localhost:5000',
    },
  },
  build: {
    outDir: 'public',
    emptyOutDir: false,
    assetsDir: 'assets',
  },
});
