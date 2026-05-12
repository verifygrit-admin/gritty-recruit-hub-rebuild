/**
 * coach-dashboard-tabs.spec.js — Item 5 CoachDashboard DOM-Based Tab Tests
 *
 * Owner: Quin (QA Agent)
 * Date: 2026-03-29
 * Suite: TC-ITEM5-011 through TC-ITEM5-015
 *
 * Decision basis: Item 5 Decision 2 — TABS copy removed.
 * All assertions are DOM-based (data-testid selectors), not derived from the
 * TABS constant copy. If TABS changes in CoachDashboardPage.jsx, the DOM
 * assertion catches the drift without any constant maintenance here.
 *
 * Covers:
 *   TC-ITEM5-011: Coach dashboard renders three tabs in correct order
 *   TC-ITEM5-012: Students tab is active by default
 *   TC-ITEM5-013: Clicking Calendar tab activates it
 *   TC-ITEM5-014: Clicking Reports tab activates it
 *   TC-ITEM5-015: Access-denied state renders for non-coach role
 *
 * Environment variables:
 *   TEST_COACH_EMAIL / TEST_COACH_PASSWORD — seeded coach account
 *   TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD — seeded student account (TC-015)
 *
 * Run: npx playwright test tests/coach-dashboard-tabs.spec.js
 * Run headed: npx playwright test tests/coach-dashboard-tabs.spec.js --headed
 */

import { test, expect } from '@playwright/test';

// ── Credentials ─────────────────────────────────────────────────────────────────

const COACH_EMAIL    = process.env.TEST_COACH_EMAIL;
const COACH_PASSWORD = process.env.TEST_COACH_PASSWORD;
const STUDENT_EMAIL    = process.env.TEST_STUDENT_EMAIL;
const STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD;

// ── Helpers ──────────────────────────────────────────────────────────────────────

async function gotoApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('grh_tutSeen', '1');
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

async function signIn(page, email, password) {
  await page.fill('[data-testid="login-email"]', email);
  await page.fill('[data-testid="login-password"]', password);
  await page.click('[data-testid="login-submit"]');
  // Sprint 025 Phase 3 — auth nav now lives inside the sandwich drawer.
  // Wait on the sandwich button (always present when authenticated) instead
  // of the drawer-internal nav, which only mounts when the drawer is open.
  await page.waitForSelector('[data-testid="layout-sandwich-btn"]', { timeout: 15000 });
}

async function gotoCoachDashboard(page) {
  await page.goto('/coach');
  await page.waitForSelector(
    '[data-testid="coach-dashboard-page"], [data-testid="coach-dashboard-empty"], [data-testid="coach-dashboard-denied"]',
    { timeout: 10000 }
  );
}

// ── TC-ITEM5-011 ─────────────────────────────────────────────────────────────────

test('TC-ITEM5-011: Coach dashboard renders three tabs in correct order', async ({ page }) => {
  test.skip(!COACH_EMAIL || !COACH_PASSWORD, 'TEST_COACH_EMAIL / TEST_COACH_PASSWORD not set');

  await gotoApp(page);
  await signIn(page, COACH_EMAIL, COACH_PASSWORD);
  await gotoCoachDashboard(page);

  await expect(page.locator('[data-testid="tab-students"]')).toBeVisible();
  await expect(page.locator('[data-testid="tab-calendar"]')).toBeVisible();
  await expect(page.locator('[data-testid="tab-reports"]')).toBeVisible();

  const tabs = page.locator('[data-testid^="tab-"]');
  const tabCount = await tabs.count();
  expect(tabCount).toBe(3);

  const firstTab  = await tabs.nth(0).getAttribute('data-testid');
  const secondTab = await tabs.nth(1).getAttribute('data-testid');
  const thirdTab  = await tabs.nth(2).getAttribute('data-testid');

  expect(firstTab).toBe('tab-students');
  expect(secondTab).toBe('tab-calendar');
  expect(thirdTab).toBe('tab-reports');

  await expect(page.locator('[data-testid="tab-students"]')).toHaveText('Students');
  await expect(page.locator('[data-testid="tab-calendar"]')).toHaveText('Calendar');
  await expect(page.locator('[data-testid="tab-reports"]')).toHaveText('Reports');
});

// ── TC-ITEM5-012 ─────────────────────────────────────────────────────────────────

test('TC-ITEM5-012: Students tab is active by default on dashboard load', async ({ page }) => {
  test.skip(!COACH_EMAIL || !COACH_PASSWORD, 'TEST_COACH_EMAIL / TEST_COACH_PASSWORD not set');

  await gotoApp(page);
  await signIn(page, COACH_EMAIL, COACH_PASSWORD);
  await gotoCoachDashboard(page);

  const studentsTab = page.locator('[data-testid="tab-students"]');
  await expect(studentsTab).toBeVisible();

  // Active tab uses borderBottom: '2px solid #8B3A3A' — rgb(139, 58, 58)
  const borderBottom = await studentsTab.evaluate(el => getComputedStyle(el).borderBottomColor);
  expect(borderBottom).toMatch(/rgb\(139,\s*58,\s*58\)/);

  // Calendar and Reports tabs should NOT be active
  const calendarBorder = await page.locator('[data-testid="tab-calendar"]').evaluate(el => getComputedStyle(el).borderBottomColor);
  expect(calendarBorder).not.toMatch(/rgb\(139,\s*58,\s*58\)/);

  const reportsBorder = await page.locator('[data-testid="tab-reports"]').evaluate(el => getComputedStyle(el).borderBottomColor);
  expect(reportsBorder).not.toMatch(/rgb\(139,\s*58,\s*58\)/);
});

// ── TC-ITEM5-013 ─────────────────────────────────────────────────────────────────

test('TC-ITEM5-013: Clicking Calendar tab activates it and deactivates Students', async ({ page }) => {
  test.skip(!COACH_EMAIL || !COACH_PASSWORD, 'TEST_COACH_EMAIL / TEST_COACH_PASSWORD not set');

  await gotoApp(page);
  await signIn(page, COACH_EMAIL, COACH_PASSWORD);
  await gotoCoachDashboard(page);

  const studentsTab = page.locator('[data-testid="tab-students"]');
  const calendarTab = page.locator('[data-testid="tab-calendar"]');

  await calendarTab.click();
  await page.waitForTimeout(300);

  const calendarBorder = await calendarTab.evaluate(el => getComputedStyle(el).borderBottomColor);
  expect(calendarBorder).toMatch(/rgb\(139,\s*58,\s*58\)/);

  const studentsBorder = await studentsTab.evaluate(el => getComputedStyle(el).borderBottomColor);
  expect(studentsBorder).not.toMatch(/rgb\(139,\s*58,\s*58\)/);
});

// ── TC-ITEM5-014 ─────────────────────────────────────────────────────────────────

test('TC-ITEM5-014: Clicking Reports tab activates it', async ({ page }) => {
  test.skip(!COACH_EMAIL || !COACH_PASSWORD, 'TEST_COACH_EMAIL / TEST_COACH_PASSWORD not set');

  await gotoApp(page);
  await signIn(page, COACH_EMAIL, COACH_PASSWORD);
  await gotoCoachDashboard(page);

  const reportsTab = page.locator('[data-testid="tab-reports"]');

  await reportsTab.click();
  await page.waitForTimeout(300);

  const reportsBorder = await reportsTab.evaluate(el => getComputedStyle(el).borderBottomColor);
  expect(reportsBorder).toMatch(/rgb\(139,\s*58,\s*58\)/);

  const studentsBorder = await page.locator('[data-testid="tab-students"]').evaluate(el => getComputedStyle(el).borderBottomColor);
  expect(studentsBorder).not.toMatch(/rgb\(139,\s*58,\s*58\)/);

  const calendarBorder = await page.locator('[data-testid="tab-calendar"]').evaluate(el => getComputedStyle(el).borderBottomColor);
  expect(calendarBorder).not.toMatch(/rgb\(139,\s*58,\s*58\)/);
});

// ── TC-ITEM5-015 ─────────────────────────────────────────────────────────────────

test('TC-ITEM5-015: Access-denied state renders when non-coach role navigates to coach route', async ({ page }) => {
  test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');

  await gotoApp(page);
  await signIn(page, STUDENT_EMAIL, STUDENT_PASSWORD);

  await page.goto('/coach');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('[data-testid="coach-dashboard-denied"]')).toBeVisible();

  await expect(page.locator('[data-testid="tab-students"]')).not.toBeVisible();
  await expect(page.locator('[data-testid="tab-calendar"]')).not.toBeVisible();
  await expect(page.locator('[data-testid="tab-reports"]')).not.toBeVisible();
});
