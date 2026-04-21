/**
 * admin-pagination.spec.js — Sprint 001 D4 (Global Pagination) — RED phase
 *
 * Owner: Sprint 001
 * Suite: TC-S001-D4-E2E-001 through TC-S001-D4-E2E-007
 *
 * Covers the DOM-level acceptance criteria for Deliverable 4 across every
 * remaining admin tab (Users > Accounts toggle, Institutions, Recruiting
 * Events, Audit Log). Sticky sortable headers are already implemented in
 * AdminTableEditor.jsx — the sort/sticky cases here are regression guards.
 *
 *   TC-S001-D4-E2E-001: Page-size dropdown renders with values 25 / 50 / 100 on each tab
 *   TC-S001-D4-E2E-002: Default selected page size is 25 on tab load
 *   TC-S001-D4-E2E-003: Rendered row count matches the selected page size
 *   TC-S001-D4-E2E-004: Previous button is disabled on page 1
 *   TC-S001-D4-E2E-005: Clicking Next advances to page 2 (when total > page size)
 *   TC-S001-D4-E2E-006: Page indicator reads "Page X of Y"
 *   TC-S001-D4-E2E-007: Column headers remain visible at the top of the scroll container after scrolling
 *
 * Run: npx playwright test tests/admin-pagination.spec.js
 */

import { test, expect } from '@playwright/test';

const ADMIN_EMAIL    = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

// Tabs covered by D4. Audit Log is included because the spec says "all remaining
// tabs" — if AuditLogViewer continues to use its own table, pagination must be
// added there too. If it migrates to AdminTableEditor that assertion still holds.
const PAGINATED_TABS = [
  { key: 'users',             tableTestId: 'accounts-table',         rowKey: 'id' },
  { key: 'institutions',      tableTestId: 'institutions-table',     rowKey: 'unitid' },
  { key: 'recruiting-events', tableTestId: 'recruiting events-table', rowKey: 'id' },
  { key: 'audit',             tableTestId: 'audit-log-table',        rowKey: 'id' },
];

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

async function openTab(page, tabKey) {
  await page.click(`[data-testid="admin-tab-${tabKey}"]`);
  await page.waitForLoadState('networkidle');
}

// ── TC-S001-D4-E2E-001 ────────────────────────────────────────────────────────

test('TC-S001-D4-E2E-001: Page-size dropdown offers 25 / 50 / 100 on every tab', async ({ page }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'admin creds not set');

  await gotoApp(page);
  await signInAsAdmin(page);

  for (const tab of PAGINATED_TABS) {
    await openTab(page, tab.key);
    const dropdown = page.locator('[data-testid="admin-page-size-select"]').first();
    await expect(dropdown).toBeVisible();

    const options = await dropdown.locator('option').evaluateAll((els) =>
      els.map((el) => el.getAttribute('value'))
    );
    expect(options).toEqual(['25', '50', '100']);
  }
});

// ── TC-S001-D4-E2E-002 ────────────────────────────────────────────────────────

test('TC-S001-D4-E2E-002: Default selected page size is 25 on tab load', async ({ page }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'admin creds not set');

  await gotoApp(page);
  await signInAsAdmin(page);

  for (const tab of PAGINATED_TABS) {
    await openTab(page, tab.key);
    const dropdown = page.locator('[data-testid="admin-page-size-select"]').first();
    await expect(dropdown).toHaveValue('25');
  }
});

// ── TC-S001-D4-E2E-003 ────────────────────────────────────────────────────────

test('TC-S001-D4-E2E-003: Rendered row count matches selected page size', async ({ page }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'admin creds not set');

  await gotoApp(page);
  await signInAsAdmin(page);

  // Institutions is the reliable case: 662 rows, always exceeds every page size.
  await openTab(page, 'institutions');

  for (const size of [25, 50, 100]) {
    await page.selectOption('[data-testid="admin-page-size-select"]', String(size));
    const rows = page.locator('[data-testid="institutions-table"] tbody tr');
    await expect(rows).toHaveCount(size);
  }
});

// ── TC-S001-D4-E2E-004 ────────────────────────────────────────────────────────

test('TC-S001-D4-E2E-004: Previous button is disabled on page 1', async ({ page }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'admin creds not set');

  await gotoApp(page);
  await signInAsAdmin(page);
  await openTab(page, 'institutions');

  const prev = page.locator('[data-testid="admin-page-prev"]');
  await expect(prev).toBeDisabled();
});

// ── TC-S001-D4-E2E-005 ────────────────────────────────────────────────────────

test('TC-S001-D4-E2E-005: Clicking Next advances to page 2', async ({ page }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'admin creds not set');

  await gotoApp(page);
  await signInAsAdmin(page);
  await openTab(page, 'institutions');

  const next = page.locator('[data-testid="admin-page-next"]');
  await next.click();

  const indicator = page.locator('[data-testid="admin-page-indicator"]');
  await expect(indicator).toContainText(/Page 2 of \d+/);
});

// ── TC-S001-D4-E2E-006 ────────────────────────────────────────────────────────

test('TC-S001-D4-E2E-006: Page indicator reads "Page X of Y"', async ({ page }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'admin creds not set');

  await gotoApp(page);
  await signInAsAdmin(page);
  await openTab(page, 'institutions');

  const indicator = page.locator('[data-testid="admin-page-indicator"]');
  // 662 rows / 25 per page = 27 pages.
  await expect(indicator).toHaveText(/^Page 1 of 27$/);
});

// ── TC-S001-D4-E2E-007 ────────────────────────────────────────────────────────

test('TC-S001-D4-E2E-007: Headers remain pinned at the top of the scroll container after scrolling', async ({ page }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'admin creds not set');

  await gotoApp(page);
  await signInAsAdmin(page);
  await openTab(page, 'institutions');
  await page.selectOption('[data-testid="admin-page-size-select"]', '100');

  const table = page.locator('[data-testid="institutions-table"]');
  const header = table.locator('thead');

  const beforeBox = await header.boundingBox();
  expect(beforeBox).not.toBeNull();

  // Scroll the shared admin-scroll-wrap container.
  await page.evaluate(() => {
    const wrap = document.querySelector('.admin-scroll-wrap');
    if (wrap) wrap.scrollTop = 500;
    else window.scrollTo(0, 500);
  });
  await page.waitForTimeout(150);

  const afterBox = await header.boundingBox();
  expect(afterBox).not.toBeNull();
  // Header should remain at roughly the same Y position (sticky).
  expect(Math.abs(afterBox.y - beforeBox.y)).toBeLessThan(5);
});
