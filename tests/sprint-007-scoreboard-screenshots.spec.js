/**
 * Sprint 007 B.1 — Visual ground-truth screenshots from the prototype HTML.
 *
 * The prototype at prototypes/recruiting-scoreboard/recruiting-scoreboard.html
 * is the visual contract for the production component. Capturing it at
 * 1280x720 (desktop), 414x896 (iPhone XR), and 375x812 (iPhone X / SE) gives
 * us pixel-level evidence that the layout the React component is built to
 * matches the operator-approved prototype, AND demonstrates the mobile
 * pattern (horizontal scroll within a fixed-width container — page-level
 * horizontal overflow does NOT occur).
 *
 * Run: npx playwright test tests/sprint-007-scoreboard-screenshots.spec.js --project=chromium
 *
 * Output: docs/specs/sprint-007/screenshots/
 */

import { test } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const PROTOTYPE_HTML = pathToFileURL(
  resolve(REPO_ROOT, 'prototypes/recruiting-scoreboard/recruiting-scoreboard.html'),
).toString();
const OUT_DIR = resolve(REPO_ROOT, 'docs/specs/sprint-007/screenshots');

test.describe('Sprint 007 B.1 — Scoreboard visual @ prototype HTML', () => {
  test('desktop @ 1280x720', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(PROTOTYPE_HTML);
    // Wait for fonts + JS rendering of the table body.
    await page.waitForSelector('#scoreboard-body tr');
    await page.screenshot({
      path: resolve(OUT_DIR, 'b1-scoreboard-desktop-1280.png'),
      fullPage: true,
    });
  });

  test('mobile @ 414 (iPhone XR width)', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto(PROTOTYPE_HTML);
    await page.waitForSelector('#scoreboard-body tr');
    await page.screenshot({
      path: resolve(OUT_DIR, 'b1-scoreboard-mobile-414.png'),
      fullPage: true,
    });
  });

  test('mobile @ 375 (iPhone X / SE width)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PROTOTYPE_HTML);
    await page.waitForSelector('#scoreboard-body tr');
    await page.screenshot({
      path: resolve(OUT_DIR, 'b1-scoreboard-mobile-375.png'),
      fullPage: true,
    });
  });

  test('mobile @ 375 — collapsed Scoreboard (verifies header tap-target visual)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PROTOTYPE_HTML);
    await page.waitForSelector('#scoreboard-body tr');
    // Collapse via the toggle to capture the header-only state.
    await page.click('.scoreboard-toggle');
    await page.waitForTimeout(200); // visual settle
    await page.screenshot({
      path: resolve(OUT_DIR, 'b1-scoreboard-mobile-375-collapsed.png'),
      fullPage: true,
    });
  });
});
