import { defineConfig, devices } from '@playwright/test'
import { e2ePorts, e2eUrls } from './tests/e2e/environment'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'engine',
      testMatch: '**/engine/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: e2eUrls.engine },
    },
    {
      name: 'editor',
      testMatch: '**/editor/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: e2eUrls.editor },
    },
  ],
  webServer: [
    {
      name: 'Editor API',
      command: 'pnpm --filter @ancadeba/editor-server dev',
      url: `${e2eUrls.server}/api/health`,
      env: { HOST: '127.0.0.1', PORT: String(e2ePorts.server) },
      reuseExistingServer: false,
    },
    {
      name: 'Engine',
      command: `pnpm --filter @ancadeba/engine dev --host 127.0.0.1 --port ${e2ePorts.engine} --strictPort`,
      url: e2eUrls.engine,
      reuseExistingServer: false,
    },
    {
      name: 'Editor UI',
      command: `pnpm --filter @ancadeba/editor-ui dev --host 127.0.0.1 --port ${e2ePorts.editor} --strictPort`,
      url: e2eUrls.editor,
      env: { EDITOR_API_TARGET: e2eUrls.server },
      reuseExistingServer: false,
    },
  ],
})
