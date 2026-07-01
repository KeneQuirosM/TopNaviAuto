import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  publicDir: false,
  resolve: {
    alias: {
      '@': resolve(__dirname, 'lib'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        adminIndex: resolve(__dirname, 'admin/index.html'),
        adminDashboard: resolve(__dirname, 'admin/dashboard.html'),
        adminProducts: resolve(__dirname, 'admin/products.html'),
        adminPromotions: resolve(__dirname, 'admin/promotions.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
});
