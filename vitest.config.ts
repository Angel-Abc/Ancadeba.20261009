import { defineConfig } from 'vitest/config'

export default defineConfig({
  ssr: {
    resolve: {
      conditions: ['@ancadeba/source', 'module', 'node', 'development|production'],
    },
  },
  test: {
    environment: 'node',
    include: ['apps/*/src/**/*.test.{ts,tsx}', 'packages/*/src/**/*.test.ts'],
  },
})
