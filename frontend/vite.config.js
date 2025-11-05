import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'prop-types'],
          router: ['react-router-dom'],
          icons: ['lucide-react'],
          utils: ['axios'],
        }
      }
    },
    chunkSizeWarningLimit: 800,
  }
})