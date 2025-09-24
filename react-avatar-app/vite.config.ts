import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '192.168.124.43',
    port: 5173,
    proxy: {
      '/persona': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/openai': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
