/**
 * Sprint 026 — Admin Bulk PDS batch approval E2E
 *
 * Covers SPRINT_026_PLAN.md §4.4 row 2 and goal G4: admin signs in,
 * navigates to /admin/bulk-pds, opens a pending batch, sees the
 * side-by-side A/B compare rows, clicks Verify and Update Profiles,
 * and confirms the batch is removed from the pending list.
 *
 * Depends on Phase 2 wire-up (Agent 1b admin UI + Agent 1c EFs). Will
 * run RED until then — at minimum it requires a seeded pending batch.
 */

import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  gotoApp,
  signIn,
} from './_helpers.js';

test.describe('@bulk-pds Admin Bulk PDS — batch approval', () => {
  test('admin approves an entire pending batch and it disappears from the list', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD not set');

    await gotoApp(page);
    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await page.goto('/admin/bulk-pds');
    await page.waitForSelector('[data-testid="bulk-pds-admin-tab-shell"]', { timeout: 15000 });

    const batchList = page.locator('[data-testid="bulk-pds-admin-batch-list"]');
    await batchList.waitFor({ state: 'visible' });

    // Identify the first pending batch row
    const batchRows = batchList.locator('[data-testid^="bulk-pds-admin-batch-row-"]');
    const count = await batchRows.count();
    expect(count, 'at least one pending batch required to run this spec').toBeGreaterThan(0);

    const firstRow = batchRows.first();
    const firstTestId = await firstRow.getAttribute('data-testid');
    // testid pattern: bulk-pds-admin-batch-row-<batch_id>
    const batchId = firstTestId.replace('bulk-pds-admin-batch-row-', '');
    expect(batchId).toBeTruthy();

    // Open the batch
    await firstRow.click();
    await page.waitForSelector('[data-testid="bulk-pds-admin-batch-detail"]', { timeout: 10000 });

    // Assert A/B side-by-side compare rows render
    const compareRows = page.locator('[data-testid^="bulk-pds-admin-compare-row-"]');
    await expect(compareRows.first()).toBeVisible({ timeout: 10000 });
    const compareCount = await compareRows.count();
    expect(compareCount).toBeGreaterThan(0);

    // Each compare row should have both an A (staging) and B (profile) card
    const firstCompareTestId = await compareRows.first().getAttribute('data-testid');
    const submissionId = firstCompareTestId.replace('bulk-pds-admin-compare-row-', '');
    await expect(page.locator(`[data-testid="bulk-pds-admin-staging-card-${submissionId}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="bulk-pds-admin-profile-card-${submissionId}"]`)).toBeVisible();

    // Approve the whole batch
    await page.click('[data-testid="bulk-pds-admin-batch-approve-btn"]');

    // Batch row disappears from the pending list
    await expect(page.locator(`[data-testid="bulk-pds-admin-batch-row-${batchId}"]`))
      .toHaveCount(0, { timeout: 15000 });
  });
});
