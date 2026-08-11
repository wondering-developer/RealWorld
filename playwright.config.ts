import { defineConfig } from '@playwright/test';
import { baseConfig } from './realworld/specs/e2e/playwright.base';

/**
 * Angular-specific Playwright configuration.
 * Extends the shared RealWorld base config with the Angular dev server.
 */
export default defineConfig({
  ...baseConfig,
  testDir: '.',
  testMatch: ['realworld/specs/e2e/**/*.spec.ts', 'e2e/**/*.spec.ts'],
  retries: 1,
  workers: 1,

  use: {
    ...baseConfig.use,
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },

  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
