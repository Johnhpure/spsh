import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '192.168.1.8',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://192.168.1.8:3002',
        changeOrigin: true,
      }
    }
  }
})
