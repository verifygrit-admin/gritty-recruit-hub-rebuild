/**
 * admin-tab-remediation.spec.js — Sprint 001 D1 (Tab Remediation) — RED phase
 *
 * Owner: Sprint 001
 * Suite: TC-S001-D1-E2E-001 through TC-S001-D1-E2E-005
 *
 * Covers the DOM-level acceptance criteria for Deliverable 1:
 *   TC-S001-D1-E2E-001: Admin page renders exactly four tabs, in spec order
 *   TC-S001-D1-E2E-002: Schools tab is not present in the DOM
 *   TC-S001-D1-E2E-003: Bare /admin redirects to /admin/users (first remaining tab)
 *   TC-S001-D1-E2E-004: Legacy /admin/schools redirects (or falls back) to /admin/users
 *   TC-S001-D1-E2E-005: Each remaining tab renders its content without console errors
 *
 * Uses the existing admin-tab-<key> data-testid convention from AdminPage.jsx.
 * Credentials come from env — tests skip when absent, matching the coach
 * dashboard pattern in coach-dashboard-tabs.spec.js.
 *
 * Run: npx playwright test tests/admin-tab-remediation.spec.js
 */

import { test, expect } from '@playwright/test';

const ADMIN_EMAIL    = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

async function gotoApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('grh_tutSeen', '1');
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

async function signInAsAdmin(page) {
  await page.goto('/admin-login');
  await page.fill('[data-testid="login-email"]', ADMIN_EMAIL);
  await page.fill('[data-testid="login-password"]', ADMIN_PASSWORD);
  await page.click('[data-testid="login-submit"]');
  await page.waitForSelector('[data-testid="admin-page"]', { timeout: 15000 });
}

// ── TC-S001-D1-E2E-001 ────────────────────────────────────────────────────────

test('TC-S001-D1-E2E-001: Admin page renders exactly four tabs in spec order', async ({ page }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD not set');

  await gotoApp(page);
  await signInAsAdmin(page);

  const tabs = page.locator('[data-testid^="admin-tab-"]');
  await expect(tabs).toHaveCount(4);

  const keys = await tabs.evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-testid').replace('admin-tab-', ''))
  );
  expect(keys).toEqual(['users', 'institutions', 'recruiting-events', 'audit']);

  await expect(page.locator('[data-testid="admin-tab-users"]')).toHaveText('Users');
  await expect(page.locator('[data-testid="admin-tab-institutions"]')).toHaveText('Institutions');
  await expect(page.locator('[data-testid="admin-tab-recruiting-events"]')).toHaveText('Recruiting Events');
  await expect(page.locator('[data-testid="admin-tab-audit"]')).toHaveText('Audit Log');
});

// ── TC-S001-D1-E2E-002 ────────────────────────────────────────────────────────

test('TC-S001-D1-E2E-002: Schools tab is not present in the DOM', async ({ page }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD not set');

  await gotoApp(page);
  await signInAsAdmin(page);

  await expect(page.locator('[data-testid="admin-tab-schools"]')).toHaveCount(0);
});

// ── TC-S001-D1-E2E-003 ────────────────────────────────────────────────────────

test('TC-S001-D1-E2E-003: Bare /admin redirects to /admin/users', async ({ page }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD not set');

  await gotoApp(page);
  await signInAsAdmin(page);

  await page.goto('/admin');
  await page.waitForURL('**/admin/users', { timeout: 5000 });
  expect(page.url()).toMatch(/\/admin\/users$/);
});

// ── TC-S001-D1-E2E-004 ────────────────────────────────────────────────────────

test('TC-S001-D1-E2E-004: Legacy /admin/schools falls back to /admin/users', async ({ page }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD not set');

  await gotoApp(page);
  await signInAsAdmin(page);

  await page.goto('/admin/schools');
  // Either a redirect happens or the Users tab is rendered as the active tab.
  await page.waitForSelector('[data-testid="admin-tab-users"]');
  const usersBorder = await page
    .locator('[data-testid="admin-tab-users"]')
    .evaluate((el) => getComputedStyle(el).borderBottomColor);
  expect(usersBorder).toMatch(/rgb\(139,\s*58,\s*58\)/);
});

// ── TC-S001-D1-E2E-005 ────────────────────────────────────────────────────────

test('TC-S001-D1-E2E-005: Each remaining tab renders its content without console errors', async ({ page }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD not set');

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await gotoApp(page);
  await signInAsAdmin(page);

  const tabs = [
    { key: 'users',             contentTestId: 'admin-users-tab' },
    { key: 'institutions',      contentTestId: 'institutions-table-editor' },
    { key: 'recruiting-events', contentTestId: 'recruiting events-table-editor' },
    { key: 'audit',             contentTestId: 'audit-log-viewer' },
  ];

  for (const tab of tabs) {
    await page.click(`[data-testid="admin-tab-${tab.key}"]`);
    await page.waitForSelector(
      `[data-testid="${tab.contentTestId}"], [data-testid$="-loading"], [data-testid$="-error"], [data-testid$="-empty"]`,
      { timeout: 10000 }
    );
  }

  expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toEqual([]);
});
