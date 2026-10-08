import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // XAMPP serves this project from /pk. Proxy through Apache so starting
      // the Vite client by itself still gives the app a working PHP API.
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => `/pk${path}`,
      },
      '/uploads': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => `/pk/backend${path}`,
      },
    },
  },
})
