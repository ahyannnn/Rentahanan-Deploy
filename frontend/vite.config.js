import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          icons: ['lucide-react'], // Lucide icons in their own chunk
          utils: ['axios'], // Add other utility libraries you use
        }
      }
    },
    chunkSizeWarningLimit: 800,
  }
})