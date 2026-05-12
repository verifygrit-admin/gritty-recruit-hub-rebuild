/**
 * Sprint 026 — Coach Bulk PDS mobile viewport E2E
 *
 * Covers SPRINT_026_PLAN.md §4.4 row 4 and goal G3: at 375x667, Player Update
 * Cards stack single-column and dropdown remains usable. Same happy-path flow
 * as desktop spec but viewport-constrained.
 *
 * Depends on Phase 2 wire-up (Agent 1a coach UI). Will run RED until then.
 */

import { test, expect } from '@playwright/test';
import {
  COACH_EMAIL,
  COACH_PASSWORD,
  gotoApp,
  signIn,
} from './_helpers.js';

test.use({ viewport: { width: 375, height: 667 } });

test.describe('@bulk-pds Coach Bulk PDS — mobile 375x667', () => {
  test('cards stack single-column on mobile viewport', async ({ page }) => {
    test.skip(!COACH_EMAIL || !COACH_PASSWORD, 'TEST_COACH_EMAIL / TEST_COACH_PASSWORD not set');

    await gotoApp(page);
    await signIn(page, COACH_EMAIL, COACH_PASSWORD);

    await page.goto('/coach/player-updates');
    await page.waitForSelector('[data-testid="bulk-pds-coach-page"]', { timeout: 15000 });

    const picker = page.locator('[data-testid="bulk-pds-coach-student-picker"]');
    await picker.waitFor({ state: 'visible' });
    const opts = await picker.locator('option').all();
    const v1 = await opts[1].getAttribute('value');
    const v2 = await opts[2].getAttribute('value');
    expect(v1).toBeTruthy();
    expect(v2).toBeTruthy();

    await picker.selectOption(v1);
    await page.click('[data-testid="bulk-pds-coach-student-add-btn"]');
    await page.waitForSelector(`[data-testid="bulk-pds-coach-card-${v1}"]`, { timeout: 5000 });

    await picker.selectOption(v2);
    await page.click('[data-testid="bulk-pds-coach-student-add-btn"]');
    await page.waitForSelector(`[data-testid="bulk-pds-coach-card-${v2}"]`, { timeout: 5000 });

    // Single-column assertion: both cards share the same horizontal axis range
    // (card1.right <= card2.left would mean side-by-side; we want stacked, so
    // card1.bottom <= card2.top with x ranges overlapping).
    const card1 = await page.locator(`[data-testid="bulk-pds-coach-card-${v1}"]`).boundingBox();
    const card2 = await page.locator(`[data-testid="bulk-pds-coach-card-${v2}"]`).boundingBox();
    expect(card1, 'card1 bounding box').not.toBeNull();
    expect(card2, 'card2 bounding box').not.toBeNull();

    // Stacked: card2 starts at-or-below card1's bottom edge.
    expect(card2.y).toBeGreaterThanOrEqual(card1.y + card1.height - 1);

    // Horizontal overlap (same column) — left edges within 16px tolerance.
    expect(Math.abs(card1.x - card2.x)).toBeLessThanOrEqual(16);

    // Dropdown remains within viewport width.
    const pickerBox = await picker.boundingBox();
    expect(pickerBox.x).toBeGreaterThanOrEqual(0);
    expect(pickerBox.x + pickerBox.width).toBeLessThanOrEqual(375);
  });
});
