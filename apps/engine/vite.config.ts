import react from '@vitejs/plugin-react'
import { defaultClientConditions, defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ['@ancadeba/source', ...defaultClientConditions],
  },
  server: { port: 5173, strictPort: true },
})
