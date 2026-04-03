import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/mcp-portal/' : '/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3200',
      '/mcp': 'http://localhost:3200',
    },
  },
}))
