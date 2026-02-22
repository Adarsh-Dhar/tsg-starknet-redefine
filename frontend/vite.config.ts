import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: './', // CRITICAL: Changes /assets/... to ./assets/...
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'js',
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'index.html', // Point this to your main entry
      },
    },
  },
})
