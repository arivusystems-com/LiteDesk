import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Avoid writing cache under node_modules (can fail on some setups with restricted permissions)
  cacheDir: '.vite',
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // Add this proxy configuration:
  server: {
    // port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000', // Your Express server
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '') // Removes /api prefix when sending to backend
      },
      // Proxy portal API endpoints only (not frontend routes like /portal/dashboard)
      // Match portal API endpoints: /portal/me, /portal/org, /portal/health, /portal/audits, /portal/actions, etc.
      '^/portal/(me|org|health|audits|actions)': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        // Vite proxy forwards headers by default, but we can be explicit
        // Note: Authorization header should be forwarded automatically
      }
    }
  },
  // resolve: { alias: { '@': path.resolve(__dirname, './src') } }
})
