import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SETSU-MAKER',
        short_name: 'SETSU',
        description: '建具職人のための手順書作成アプリ',
        theme_color: '#1d4ed8',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/contents/sm/app',
        scope: '/contents/sm/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        navigateFallback: '/contents/sm/index.html',
        navigateFallbackDenylist: [/^\/contents\/sm\/api/],
      },
    }),
  ],
  base: '/contents/sm/',
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@fujiruki/react-image-editor-lightbox': resolve('../../react-image-editor-lightbox/src/lib/index.ts'),
    },
  },
  server: {
    port: 5179,
    strictPort: true,
    proxy: {
      '/contents/sm/api': {
        target: 'http://localhost:8004',
        rewrite: (path) => path.replace('/contents/sm/api', ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    pool: 'vmThreads',
  },
})
