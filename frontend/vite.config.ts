// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'terser', // Fixes the "t is not a function" renaming error
    terserOptions: {
      compress: {
        passes: 2,
      },
      mangle: {
        reserved: ['factory', 't'], // Prevents critical React 19 variables from being renamed
      },
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      }
    }
  }
})