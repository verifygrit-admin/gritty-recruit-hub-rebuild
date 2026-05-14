/**
 * Playwright Configuration — Sprint 027 Admin Account Updates suite.
 *
 * Separate from playwright.config.js because Sprint 027 needs:
 *   - A local Vite dev server (frontend not yet deployed; branch sprint-027/...)
 *   - Service-role minted admin storageState (no password in env)
 *   - Isolated testDir to keep this suite from re-running everything
 *
 * Run: npx playwright test --config=playwright.admin-account-updates.config.js
 */

import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const STORAGE_STATE = resolve(__dirname, 'tests/e2e/admin-account-updates/.auth/admin.json');
const BASE_URL = process.env.VITE_DEV_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests/e2e/admin-account-updates',
  testMatch: '**/*.spec.js',

  // Skip the helper / setup folder
  testIgnore: ['**/_setup/**', '**/_helpers/**'],

  timeout: 60_000,
  navigationTimeout: 30_000,

  retries: 0,
  workers: 1, // serialize against the live admin session + DB writes

  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/e2e/admin-account-updates/playwright-report', open: 'never' }],
    ['json', { outputFile: 'tests/e2e/admin-account-updates/playwright-results.json' }],
  ],

  // Mint the admin storageState before any test runs.
  globalSetup: resolve(__dirname, 'tests/e2e/admin-account-updates/_setup/admin-session-mint.js'),

  use: {
    baseURL: BASE_URL,
    storageState: STORAGE_STATE,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 800 },
  },

  // Auto-spawn the Vite dev server.
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
