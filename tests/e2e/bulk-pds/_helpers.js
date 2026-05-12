/**
 * Sprint 026 — Bulk PDS Playwright helpers
 *
 * Shared sign-in + nav helpers for the four bulk-pds specs. Mirrors the
 * pattern used in tests/regression.spec.js (Quin's selector contract).
 * No new testids introduced beyond what regression.spec.js already relies on
 * (login-email, login-password, login-submit, layout-sandwich-btn).
 */

export const STUDENT_EMAIL    = process.env.TEST_STUDENT_EMAIL;
export const STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD;
export const COACH_EMAIL      = process.env.TEST_COACH_EMAIL;
export const COACH_PASSWORD   = process.env.TEST_COACH_PASSWORD;
export const ADMIN_EMAIL      = process.env.TEST_ADMIN_EMAIL;
export const ADMIN_PASSWORD   = process.env.TEST_ADMIN_PASSWORD;

export async function gotoApp(page) {
  await page.addInitScript(() => {
    try { localStorage.setItem('grh_tutSeen', '1'); } catch (_) { /* noop */ }
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/**
 * Sign in using the regression-suite selector contract.
 * Depends on Phase 2 / pre-existing login form testids — does NOT add new ones.
 */
export async function signIn(page, email, password) {
  await page.fill('[data-testid="login-email"]', email);
  await page.fill('[data-testid="login-password"]', password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForSelector('[data-testid="layout-sandwich-btn"]', { timeout: 15000 });
}
