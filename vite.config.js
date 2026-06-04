import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const apiProxy = {
  '/users': { target: 'http://localhost:3001', changeOrigin: true },
  '/tickets': { target: 'http://localhost:3001', changeOrigin: true },
  '/comments': { target: 'http://localhost:3001', changeOrigin: true },
  '/login': { target: 'http://localhost:3001', changeOrigin: true }
}

export default defineConfig({
  root: __dirname,
  publicDir: 'public',
  server: {
    port: 5173,
    proxy: apiProxy
  },
  preview: {
    port: 4173,
    proxy: apiProxy
  },
  build: {
    rollupOptions: {
      input: {
        login: path.resolve(__dirname, 'public/login.html'),
        tickets: path.resolve(__dirname, 'public/tickets.html'),
        'ticket-detail': path.resolve(__dirname, 'public/ticket-detail.html'),
        dashboard: path.resolve(__dirname, 'public/dashboard.html')
      }
    }
  }
})
