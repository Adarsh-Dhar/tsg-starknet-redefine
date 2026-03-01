// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-files',
      writeBundle() {
        // Copy manifest.json
        fs.copyFileSync(
          path.resolve(__dirname, 'public/manifest.json'),
          path.resolve(__dirname, 'dist/manifest.json')
        )
        
        // Copy content.js
        fs.copyFileSync(
          path.resolve(__dirname, 'public/content.js'),
          path.resolve(__dirname, 'dist/content.js')
        )
        
        // Copy background.js
        fs.copyFileSync(
          path.resolve(__dirname, 'public/background.js'),
          path.resolve(__dirname, 'dist/background.js')
        )
        
        // Copy popup.js
        fs.copyFileSync(
          path.resolve(__dirname, 'public/popup.js'),
          path.resolve(__dirname, 'dist/popup.js')
        )
        
        // Copy icons
        const iconsDir = path.resolve(__dirname, 'public/icons')
        const distIconsDir = path.resolve(__dirname, 'dist/icons')
        if (!fs.existsSync(distIconsDir)) {
          fs.mkdirSync(distIconsDir, { recursive: true })
        }
        if (fs.existsSync(iconsDir)) {
          fs.readdirSync(iconsDir).forEach(file => {
            fs.copyFileSync(
              path.resolve(iconsDir, file),
              path.resolve(distIconsDir, file)
            )
          })
        }
      }
    }
  ],
  publicDir: false, // Disable default public dir copying
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