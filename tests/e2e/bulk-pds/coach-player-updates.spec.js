/**
 * Sprint 026 — Coach Bulk PDS happy-path E2E
 *
 * Covers SPRINT_026_PLAN.md §4.4 row 1: coach signs in -> /coach/player-updates
 * -> opens student picker -> adds 2 students -> fills measurables on each card
 * -> submits batch -> asserts submit toast appears and card list is cleared.
 *
 * Depends on Phase 2 wire-up (coach UI built by Agent 1a + EF round-trip).
 * Will run RED until then. All selectors per tests/e2e/bulk-pds/SELECTORS.md.
 */

import { test, expect } from '@playwright/test';
import {
  COACH_EMAIL,
  COACH_PASSWORD,
  gotoApp,
  signIn,
} from './_helpers.js';

test.describe('@bulk-pds Coach Bulk PDS — happy path', () => {
  test('coach submits a 2-player update batch and sees confirmation toast', async ({ page }) => {
    test.skip(!COACH_EMAIL || !COACH_PASSWORD, 'TEST_COACH_EMAIL / TEST_COACH_PASSWORD not set');

    await gotoApp(page);
    await signIn(page, COACH_EMAIL, COACH_PASSWORD);

    // Navigate to /coach/player-updates
    await page.goto('/coach/player-updates');
    await page.waitForSelector('[data-testid="bulk-pds-coach-page"]', { timeout: 15000 });

    // Add Student #1
    const picker = page.locator('[data-testid="bulk-pds-coach-student-picker"]');
    await picker.waitFor({ state: 'visible' });
    const studentOptions = await picker.locator('option').all();
    // First non-placeholder option
    const firstStudentValue = await studentOptions[1].getAttribute('value');
    expect(firstStudentValue, 'coach must have at least 1 linked student to run this spec').toBeTruthy();
    await picker.selectOption(firstStudentValue);
    await page.click('[data-testid="bulk-pds-coach-student-add-btn"]');
    await page.waitForSelector(`[data-testid="bulk-pds-coach-card-${firstStudentValue}"]`, { timeout: 5000 });

    // Add Student #2
    const secondStudentValue = await studentOptions[2].getAttribute('value');
    expect(secondStudentValue, 'coach must have at least 2 linked students to run this spec').toBeTruthy();
    await picker.selectOption(secondStudentValue);
    await page.click('[data-testid="bulk-pds-coach-student-add-btn"]');
    await page.waitForSelector(`[data-testid="bulk-pds-coach-card-${secondStudentValue}"]`, { timeout: 5000 });

    // Fill measurables on both cards (8 write fields per card per §6 G6)
    for (const sid of [firstStudentValue, secondStudentValue]) {
      await page.fill(`[data-testid="bulk-pds-coach-field-height-${sid}"]`, '6-2');
      await page.fill(`[data-testid="bulk-pds-coach-field-weight-${sid}"]`, '195');
      await page.fill(`[data-testid="bulk-pds-coach-field-speed_40-${sid}"]`, '4.65');
      await page.fill(`[data-testid="bulk-pds-coach-field-time_5_10_5-${sid}"]`, '4.30');
      await page.fill(`[data-testid="bulk-pds-coach-field-time_l_drill-${sid}"]`, '6.95');
      await page.fill(`[data-testid="bulk-pds-coach-field-bench_press-${sid}"]`, '225');
      await page.fill(`[data-testid="bulk-pds-coach-field-squat-${sid}"]`, '315');
      await page.fill(`[data-testid="bulk-pds-coach-field-clean-${sid}"]`, '225');
    }

    // Submit
    await page.click('[data-testid="bulk-pds-coach-submit-btn"]');

    // Toast appears
    const toast = page.locator('[data-testid="bulk-pds-coach-submit-toast"]');
    await expect(toast).toBeVisible({ timeout: 10000 });

    // Card list cleared after successful submission
    const cardList = page.locator('[data-testid="bulk-pds-coach-card-list"]');
    await expect(cardList.locator('[data-testid^="bulk-pds-coach-card-"]')).toHaveCount(0, { timeout: 5000 });
  });
});
