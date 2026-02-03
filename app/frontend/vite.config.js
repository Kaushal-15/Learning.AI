import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,

    // Proxy API requests to the backend during local development
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, ''), // Don't rewrite if backend expects /api
      },
    },

    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5183,
    },
  },
})
