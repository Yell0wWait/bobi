import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['bobi-logo.png', 'bobi-accueil.png', 'bobi-erreur.png', 'bobi-shaker.png'],
      manifest: {
        name: 'Bobi - Majordome des Cocktails',
        short_name: 'Bobi',
        description: 'Votre majordome personnel pour cocktails et gastronomie',
        theme_color: '#1C1C1C',
        background_color: '#FDFDFD',
        display: 'standalone',
        icons: [
          {
            src: '/bobi-logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/bobi-logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5 MB
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5174
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Séparer les dépendances volumineuses
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'icons': ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 600 // Ajuster le seuil d'avertissement
  }
})
