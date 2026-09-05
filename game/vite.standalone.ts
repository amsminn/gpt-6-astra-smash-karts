import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: 'dist-client', chunkSizeWarningLimit: 800 },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/ws': { target: 'ws://localhost:3001', ws: true },
      '/health': { target: 'http://localhost:3001' },
    },
  },
});
