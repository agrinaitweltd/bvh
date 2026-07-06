import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        terms: resolve(__dirname, 'terms.html'),
        fleet: resolve(__dirname, 'fleet.html'),
        booking: resolve(__dirname, 'booking.html'),
        login: resolve(__dirname, 'login.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        userDashboard: resolve(__dirname, 'user-dashboard.html'),
        adminAnalytics: resolve(__dirname, 'admin-analytics.html'),
        adminTransactions: resolve(__dirname, 'admin-transactions.html'),
        adminInvoices: resolve(__dirname, 'admin-invoices.html'),
        adminSettings: resolve(__dirname, 'admin-settings.html'),
        adminCars: resolve(__dirname, 'admin-cars.html'),
        adminDriverChecks: resolve(__dirname, 'admin-driver-checks.html'),
      },
    },
  },
});
