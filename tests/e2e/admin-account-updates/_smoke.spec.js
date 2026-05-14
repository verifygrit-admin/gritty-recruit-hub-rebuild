/**
 * Phase 3.4 — Validate that the minted admin storageState gets past AdminRoute
 * and renders the AccountUpdatesShell. If this fails, no other Phase 3 spec
 * can run.
 */

import { test, expect } from '@playwright/test';

test('admin session loads /admin/account-updates without redirect', async ({ page }) => {
  await page.goto('/admin/account-updates', { waitUntil: 'networkidle' });
  // Should NOT have been redirected to /admin-login.
  expect(page.url()).toMatch(/\/admin\/account-updates/);
  // Shell should mount.
  await expect(page.locator('[data-testid="account-updates-shell"]')).toBeVisible({ timeout: 15_000 });
  // Toggle bar with all 7 entities should render.
  await expect(page.locator('[data-testid="account-updates-toggle-bar"]')).toBeVisible();
  for (const key of ['students','hs_coaches','counselors','high_schools','colleges','college_coaches','recruiting_events']) {
    await expect(page.locator(`[data-testid="account-updates-toggle-${key}"]`)).toBeVisible();
  }
});
