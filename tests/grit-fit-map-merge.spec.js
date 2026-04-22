/**
 * grit-fit-map-merge.spec.js — Sprint 003 D3 acceptance cases.
 * Gated on student credentials; skips when absent (carry-forward #4).
 */

import { test, expect } from '@playwright/test';

const STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL;
const STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD;

async function signInAsStudent(page) {
  await page.goto('/login');
  await page.fill('[data-testid="login-email"]', STUDENT_EMAIL);
  await page.fill('[data-testid="login-password"]', STUDENT_PASSWORD);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL('/', { timeout: 15000 });
}

test.describe('Sprint 003 D3 — Map merge', () => {
  test.beforeEach(async () => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'student credentials not set');
  });

  test('browse-map route no longer serves Browse Map', async ({ page }) => {
    await page.goto('/browse-map');
    // After Sprint 003 D3, the catchall redirects to /.
    await expect(page).not.toHaveURL(/\/browse-map$/);
    await expect(page.locator('[data-testid="browse-map-page"]')).toHaveCount(0);
  });

  test('/gritfit mounts the unified map', async ({ page }) => {
    await signInAsStudent(page);
    await page.goto('/gritfit');
    await expect(page.getByTestId('leaflet-map-container')).toBeVisible();
    await expect(page.getByTestId('filter-recruiting-list')).toBeVisible();
  });

  test('Recruiting List filter toggles work', async ({ page }) => {
    await signInAsStudent(page);
    await page.goto('/gritfit');
    const dd = page.getByTestId('filter-recruiting-list');
    await dd.selectOption('gritfit');
    await dd.selectOption('shortlist');
    await dd.selectOption('all');
  });

  test('Existing filter bar preserved (conference/state/division)', async ({ page }) => {
    await signInAsStudent(page);
    await page.goto('/gritfit');
    await expect(page.getByTestId('filter-conference')).toBeVisible();
    await expect(page.getByTestId('filter-division')).toBeVisible();
    await expect(page.getByTestId('filter-state')).toBeVisible();
  });

  test('Map/Table view toggle works', async ({ page }) => {
    await signInAsStudent(page);
    await page.goto('/gritfit');
    await page.getByTestId('view-toggle-table').click();
    await page.getByTestId('view-toggle-map').click();
    await expect(page.getByTestId('leaflet-map-container')).toBeVisible();
  });

  test('Recalculate button still present', async ({ page }) => {
    await signInAsStudent(page);
    await page.goto('/gritfit');
    await expect(page.getByTestId('recalculate-button')).toBeVisible();
  });

  test('Search box still present', async ({ page }) => {
    await signInAsStudent(page);
    await page.goto('/gritfit');
    await expect(page.getByTestId('search-schools')).toBeVisible();
  });
});
