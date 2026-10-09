import react from '@vitejs/plugin-react'
import { defaultClientConditions, defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ['@ancadeba/source', ...defaultClientConditions],
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': process.env.EDITOR_API_TARGET ?? 'http://127.0.0.1:3000',
    },
  },
})
