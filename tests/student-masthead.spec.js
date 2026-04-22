/**
 * student-masthead.spec.js — Sprint 003 D1 Playwright acceptance.
 * Covers mobile + desktop masthead on every authenticated student route.
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

test.describe('Sprint 003 D1 — Student masthead', () => {
  test.beforeEach(async () => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'student credentials not set');
  });

  for (const route of ['/', '/gritfit', '/shortlist', '/profile']) {
    test(`masthead reads "BC HIGH RECRUIT HUB" on ${route} (desktop)`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await signInAsStudent(page);
      await page.goto(route);
      await expect(page.locator('header').first()).toContainText('BC HIGH RECRUIT HUB');
    });

    test(`masthead reads "BC HIGH RECRUIT HUB" on ${route} (mobile)`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await signInAsStudent(page);
      await page.goto(route);
      await expect(page.locator('header').first()).toContainText('BC HIGH RECRUIT HUB');
    });
  }
});
