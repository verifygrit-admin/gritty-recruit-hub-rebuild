/**
 * grit-fit-scorecard-redesign.spec.js — Sprint 003 D4 acceptance cases.
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

test.describe('Sprint 003 D4 — Scorecard redesign', () => {
  test.beforeEach(async () => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'student credentials not set');
  });

  test('Athletic Fit scorecard renders per-division rows', async ({ page }) => {
    await signInAsStudent(page);
    await page.goto('/gritfit');
    await expect(page.getByTestId('athletic-fit-scorecard')).toBeVisible();
    for (const tier of ['Power 4', 'G6', 'FCS', 'D2', 'D3']) {
      await expect(page.getByTestId(`athletic-fit-row-${tier}`)).toBeVisible();
    }
  });

  test('Academic Rigor scorecard renders both cells', async ({ page }) => {
    await signInAsStudent(page);
    await page.goto('/gritfit');
    await expect(page.getByTestId('academic-rigor-cell')).toBeVisible();
    await expect(page.getByTestId('test-optional-cell')).toBeVisible();
  });

  test('Explainer section is visible', async ({ page }) => {
    await signInAsStudent(page);
    await page.goto('/gritfit');
    await expect(page.getByTestId('grit-fit-explainer')).toBeVisible();
  });

  test('What-If sliders render and Reset toggles enabled/disabled', async ({ page }) => {
    await signInAsStudent(page);
    await page.goto('/gritfit');
    await expect(page.getByTestId('what-if-sliders')).toBeVisible();
    const reset = page.getByTestId('what-if-reset');
    await expect(reset).toBeDisabled();
    await page.getByTestId('slider-gpa').locator('input[type="range"]').evaluate((el) => {
      el.value = String(parseFloat(el.value) + 0.1);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(reset).toBeEnabled();
    await reset.click();
    await expect(reset).toBeDisabled();
  });

  test('Sliders cause zero network writes — no POST/PATCH to profiles', async ({ page }) => {
    await signInAsStudent(page);
    await page.goto('/gritfit');
    const writes = [];
    page.on('request', (req) => {
      const url = req.url();
      const method = req.method();
      if ((method === 'POST' || method === 'PATCH' || method === 'PUT') && /\/profiles(\?|$|\/)/.test(url)) {
        writes.push({ method, url });
      }
    });
    await page.getByTestId('slider-gpa').locator('input[type="range"]').evaluate((el) => {
      el.value = String(parseFloat(el.value) + 0.1);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(1000);
    expect(writes).toEqual([]);
  });
});
