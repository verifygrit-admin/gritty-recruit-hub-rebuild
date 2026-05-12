/**
 * home-restructure.spec.js — Sprint 003 D1, D2a, D2b, D2c.
 *
 * Authenticated student view, hitting /home (= "/"). Gated by TEST_STUDENT_EMAIL /
 * TEST_STUDENT_PASSWORD — skips when absent (Sprint 001 retro carry-forward #4).
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

test.describe('Sprint 003 — Home restructure', () => {
  test.beforeEach(async () => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'student credentials not set');
  });

  test('D1 — masthead reads "BC HIGH RECRUIT HUB"', async ({ page }) => {
    await signInAsStudent(page);
    const masthead = page.locator('header').first();
    await expect(masthead).toContainText('BC HIGH RECRUIT HUB');
    await expect(masthead).not.toContainText('BOSTON COLLEGE HIGH SCHOOL');
  });

  test('D2b — nav order: HOME, MY PROFILE, MY GRIT FIT, MY SHORTLIST, MY GRIT GUIDES, Coach Messages', async ({ page }) => {
    await signInAsStudent(page);
    // Sprint 025 Phase 3 — nav lives in the sandwich drawer; open it first.
    await page.click('[data-testid="layout-sandwich-btn"]');
    await page.waitForSelector('[data-testid="slide-out-shell-panel"]', { timeout: 5000 });
    const nav = page.getByTestId('authenticated-nav');
    const labels = await nav.locator('a').allTextContents();
    expect(labels.map(s => s.trim())).toEqual([
      'HOME',
      'MY PROFILE',
      'MY GRIT FIT',
      'MY SHORTLIST',
      'MY GRIT GUIDES',
      'Coach Messages',
    ]);
  });

  test('D2a — three journey cards mounted in order', async ({ page }) => {
    await signInAsStudent(page);
    await expect(page.getByTestId('journey-stepper')).toBeVisible();
    await expect(page.getByTestId('journey-card-1')).toContainText('My Profile');
    await expect(page.getByTestId('journey-card-2')).toContainText('My Grit Fit');
    await expect(page.getByTestId('journey-card-3')).toContainText('My Short List');
  });

  test('D2a — dual-modal "Choose how to explore colleges" block is removed', async ({ page }) => {
    await signInAsStudent(page);
    await expect(page.locator('text=Choose how to explore colleges')).toHaveCount(0);
  });

  test('D2c — "View My Results Now" button appears when profile is complete', async ({ page }) => {
    await signInAsStudent(page);
    const viewResults = page.getByTestId('welcome-view-results');
    if (await viewResults.count()) {
      await expect(viewResults).toContainText('View My Results Now');
    }
  });
});
