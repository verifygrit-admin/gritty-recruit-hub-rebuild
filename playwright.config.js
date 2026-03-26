/**
 * Playwright Configuration — Gritty Recruit Hub Rebuild
 *
 * Owner: Quin (QA Agent)
 * Date: 2026-03-25
 *
 * baseURL: defaults to https://app.grittyfb.com
 *          override with PLAYWRIGHT_BASE_URL env var for local runs
 *
 * Browser: Chromium only (Phase 1 scope)
 * testDir: tests/ — picks up regression.spec.js
 * testMatch: *.spec.js — Playwright files only, isolates from Vitest .test.js files
 * timeout: 30s per test action
 * navigationTimeout: 30s — separate from action timeout
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Only pick up Playwright spec files — .test.js files belong to Vitest
  testMatch: '**/*.spec.js',

  // Timeout for each individual test (ms)
  timeout: 30_000,

  // Timeout for page.goto / page.waitForNavigation calls
  navigationTimeout: 30_000,

  // Fail CI fast: do not retry flaky tests in CI (retries only locally)
  retries: process.env.CI ? 0 : 1,

  // Parallel workers: 1 in CI to avoid auth session collisions on shared test accounts
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI ? 'list' : 'html',

  use: {
    // Base URL — override with PLAYWRIGHT_BASE_URL for non-production targets
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://app.grittyfb.com',

    // Capture trace on first retry (local) for debugging
    trace: 'on-first-retry',

    // Viewport consistent with desktop target
    viewport: { width: 1280, height: 720 },

    // Chromium only — Phase 1 scope (DEC-CFBRB per QA_STRATEGY_PHASE1.md)
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
