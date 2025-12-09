import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,
    port: 5173,
    strictPort: true,

    // FIX: allow ALL hosts including ngrok
    allowedHosts: true,

    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5183,
    },
  },
})
