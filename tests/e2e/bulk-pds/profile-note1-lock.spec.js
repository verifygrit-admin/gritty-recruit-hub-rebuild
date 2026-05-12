/**
 * Sprint 026 — Student /profile Note 1 lock
 *
 * Covers SPRINT_026_PLAN.md §4.4 row 3 and Note 1 (N1): student profile
 * page must NOT render the 5 new bulk-pds measurable fields as editable
 * form inputs. This spec asserts ABSENCE of inputs for:
 *   time_5_10_5, time_l_drill, bench_press, squat, clean
 *
 * Per the selector contract, there is no testid created for these fields
 * on the student profile. The assertion is that no input with the
 * matching `name` attribute (or any data-testid containing these tokens)
 * is rendered on /profile.
 *
 * Depends on Phase 2 wire-up only insofar as the student /profile page
 * remains accessible. Should pass even pre-Phase-2 because the field
 * inputs simply do not exist yet — that is the locked state we are
 * asserting will be preserved.
 */

import { test, expect } from '@playwright/test';
import {
  STUDENT_EMAIL,
  STUDENT_PASSWORD,
  gotoApp,
  signIn,
} from './_helpers.js';

const LOCKED_MEASURABLES = [
  'time_5_10_5',
  'time_l_drill',
  'bench_press',
  'squat',
  'clean',
];

test.describe('@bulk-pds Student profile — Note 1 lock', () => {
  test('no bulk-pds measurable inputs are rendered on /profile', async ({ page }) => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');

    await gotoApp(page);
    await signIn(page, STUDENT_EMAIL, STUDENT_PASSWORD);

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    for (const field of LOCKED_MEASURABLES) {
      // No <input name="field"> or <input data-testid="...field..."> permitted
      const byName = page.locator(`input[name="${field}"], select[name="${field}"], textarea[name="${field}"]`);
      await expect(
        byName,
        `student /profile must NOT render input for "${field}"`,
      ).toHaveCount(0);

      const byTestId = page.locator(`[data-testid*="${field}"]`);
      // Allow zero matches; if anything matches, fail with the testid surfaced.
      const tidCount = await byTestId.count();
      if (tidCount > 0) {
        const tids = [];
        for (let i = 0; i < tidCount; i++) {
          tids.push(await byTestId.nth(i).getAttribute('data-testid'));
        }
        throw new Error(`student /profile must NOT render any element with testid containing "${field}"; found: ${tids.join(', ')}`);
      }
    }
  });
});
