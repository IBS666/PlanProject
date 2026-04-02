
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
  include: ['react-pdf']
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5279',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})