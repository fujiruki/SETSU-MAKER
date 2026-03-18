import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/contents/sm/',
  server: {
    port: 5179,
    strictPort: true,
    proxy: {
      '/contents/sm/api': {
        target: 'http://localhost:8004',
        rewrite: (path) => path.replace('/contents/sm/api', '/api'),
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
