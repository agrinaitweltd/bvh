import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        services: resolve(__dirname, 'services.html'),
        fleet: resolve(__dirname, 'fleet.html'),
        booking: resolve(__dirname, 'booking.html'),
      },
    },
  },
});
