/**
 * Sprint 007 hotfix HF-6 follow-up — sticky-header regression lock.
 *
 * ════════════════════════════════════════════════════════════════════════
 * REQUIRED PATTERN FOR ALL FUTURE SCROLL / STICKY / RESPONSIVE PLAYWRIGHT
 * SPECS IN THIS CODEBASE
 * ════════════════════════════════════════════════════════════════════════
 *
 * The original HF-6 screenshot spec produced a FALSE POSITIVE: it captured
 * sticky headers apparently working in test, while the deployed preview
 * had them broken. Root cause was a stripped-DOM test fixture that did
 * NOT inherit production CSS — specifically the
 * `html, body, #root { overflow-x: hidden }` rule from src/index.css
 * (Sprint 005 D8 mobile horizontal-parallax-lock). That rule established
 * a scroll-context boundary at #root, trapping sticky descendants and
 * preventing them from resolving to the viewport scroll. The Playwright
 * fixture, having no #root and no D8 rule, allowed sticky to attach to
 * the viewport and pass.
 *
 * The fix landed in HF-6 follow-up: `overflow-x: clip` replaces `hidden`
 * across three layers (index.css + two RecruitingScoreboard styles).
 * `clip` clips overflow without establishing a scroll container, so the
 * sticky chain remains intact up to the viewport.
 *
 * To prevent this class of false positive recurring, EVERY Playwright
 * spec for this codebase that exercises scroll, sticky, or responsive
 * behavior MUST inject src/index.css into the test page so the ancestor
 * scroll-context chain matches production. Use the `loadProductionCss()`
 * helper below (or replicate its pattern in your spec).
 *
 * If you are testing layout that depends on a #root mount point (most
 * scroll/sticky cases do), wrap your fixture HTML inside
 * `<div id="root">...</div>` so the chain matches production:
 *
 *   <html><body><div id="root"><test-fixture/></div></body></html>
 *
 * Skipping either the index.css inject or the #root wrapper means your
 * fixture is rendering against a different ancestor chain than production
 * and any scroll/sticky/responsive assertion you make is suspect.
 * ════════════════════════════════════════════════════════════════════════
 *
 * Captures four screenshots demonstrating the fix:
 *   - hf6-followup-sticky-desktop-1280.png       — Playwright with index.css injected, desktop scroll-mid
 *   - hf6-followup-sticky-mobile-375.png         — Playwright with index.css injected, mobile 375 scroll-mid
 *   - hf6-followup-horizontal-scroll-mobile-375.png — confirms HF-2 horizontal scroll still works on mobile
 *
 * Run: npx playwright test tests/sprint-007-hf6-followup-screenshots.spec.js --project=chromium
 *
 * Output: docs/specs/sprint-007/screenshots/
 */

import { test, expect } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(REPO_ROOT, 'docs/specs/sprint-007/screenshots');
const INDEX_CSS_PATH = resolve(REPO_ROOT, 'src/index.css');

/**
 * Read src/index.css and return its contents as a string for inline
 * injection. This is the regression-lock mechanism — the test fixture
 * gets the same shell-level overflow rules production has, so sticky
 * resolves against the same ancestor chain.
 */
function loadProductionCss() {
  return readFileSync(INDEX_CSS_PATH, 'utf8');
}

const SCHOOLS = [
  { rank: 1, unitid: 130697, name: 'Wesleyan University',                      conf: 'NESCAC',  div: 'D3',  bools: [true, true, true, false, false, false, false], q: 42.86 },
  { rank: 2, unitid: 195216, name: 'St Lawrence University',                   conf: 'Liberty', div: 'D3',  bools: [true, true, false, false, false, false, false], q: 28.57 },
  { rank: 3, unitid: 168148, name: 'Tufts University',                         conf: 'NESCAC',  div: 'D3',  bools: [true, true, true, true, true, true, true],     q: 100   },
  { rank: 4, unitid: 194824, name: 'Rensselaer Polytechnic Institute',         conf: 'Liberty', div: 'D3',  bools: [true, true, true, true, false, false, false], q: 57.14 },
  { rank: 5, unitid: 161253, name: 'University of Maine',                      conf: 'CAA',     div: 'FCS', bools: [true, true, false, false, false, false, false], q: 28.57 },
  { rank: 6, unitid: 183044, name: 'University of New Hampshire-Main Campus',  conf: 'CAA',     div: 'FCS', bools: [true, true, true, true, true, false, false],  q: 71.43 },
  { rank: 7, unitid: 161086, name: 'Colby College',                            conf: 'NESCAC',  div: 'D3',  bools: [true, true, true, false, false, false, false], q: 42.86 },
  { rank: 8, unitid: 230959, name: 'Middlebury College',                       conf: 'NESCAC',  div: 'D3',  bools: [true, false, false, false, false, false, false], q: 14.29 },
  { rank: 9, unitid: 168342, name: 'Williams College',                         conf: 'NESCAC',  div: 'D3',  bools: [true, true, false, false, false, false, false], q: 28.57 },
  { rank: 10, unitid: 191515, name: 'Hamilton College',                        conf: 'NESCAC',  div: 'D3',  bools: [true, true, true, false, false, false, false], q: 42.86 },
];

function rowHtml(s, idx) {
  const isOdd = idx % 2 === 1;
  const bg = isOdd ? '#F5EFE0' : '#FAF6EA';
  const cells = s.bools.map(b =>
    `<td style="padding:10px 10px;border-right:1px solid rgba(92,22,32,0.15);text-align:center;font-size:0.71875rem;font-weight:500;width:90px;">
       <span style="display:inline-block;padding:3px 12px;border-radius:3px;min-width:38px;background:${b ? '#C8DDB8' : '#F0CFC9'};color:${b ? '#2D4A1F' : '#6E2620'};">${b ? 'Yes' : 'No'}</span>
     </td>`).join('');
  return `
    <tr style="background:${bg};border-bottom:1px solid #5C162026;">
      <td style="padding:10px 10px;border-right:1px solid rgba(92,22,32,0.15);font-family:'Cormorant Garamond',serif;font-size:1rem;font-weight:600;color:#7B1F2C;text-align:center;width:44px;">${s.rank}</td>
      <td style="padding:10px 10px;border-right:1px solid rgba(92,22,32,0.15);font-size:0.6875rem;color:#7A6A60;text-align:center;width:64px;letter-spacing:0.02em;">${s.unitid}</td>
      <td style="padding:10px 10px;border-right:1px solid rgba(92,22,32,0.15);font-weight:500;color:#2A1F1A;font-size:0.8125rem;min-width:220px;">
        <span style="display:block;font-weight:500;">${s.name}</span>
        <span style="display:block;font-size:0.65625rem;color:#7A6A60;margin-top:1px;letter-spacing:0.04em;">${s.conf}</span>
      </td>
      <td style="padding:10px 10px;border-right:1px solid rgba(92,22,32,0.15);text-align:center;font-size:0.6875rem;color:#4A3A30;font-weight:500;width:70px;">${s.div}</td>
      ${cells}
      <td style="padding:10px 10px;border-right:1px solid rgba(92,22,32,0.15);text-align:center;font-family:'Cormorant Garamond',serif;font-size:1rem;font-weight:600;width:110px;color:#2D7A4A;">${s.q.toFixed(2)}%</td>
      <td style="padding:10px 10px;width:220px;border-right:none;">—</td>
    </tr>
  `;
}

function tableHtml() {
  return `
    <div data-testid="recruiting-scoreboard" style="margin-bottom:24px;border-radius:4px;overflow:clip;background:#FAF6EA;border:1px solid rgba(92,22,32,0.18);box-shadow:0 2px 8px rgba(92,22,32,0.06);">
      <div style="background:#7B1F2C;color:var(--brand-gold,#D4AF37);padding:14px 22px;font-family:'Cormorant Garamond',serif;font-weight:600;font-size:1.375rem;display:flex;align-items:center;justify-content:space-between;">
        Recruiting Scoreboard <span style="color:var(--brand-gold,#D4AF37);">▾</span>
      </div>
      <div class="scoreboard-table-scroll">
        <table style="width:100%;border-collapse:collapse;font-size:0.78125rem;background:#FAF6EA;min-width:1200px;">
          <thead>
            <tr>
              <th colspan="4"  style="font-family:var(--font-body);font-weight:600;font-size:0.875rem;padding:8px;text-align:center;color:#F4ECD8;background:#5C1620;border-right:1px solid rgba(244,236,216,0.18);border-bottom:1px solid rgba(244,236,216,0.18);position:sticky;top:0;z-index:6;">Recruiting Scoreboard</th>
              <th colspan="5"  style="font-family:var(--font-body);font-weight:600;font-size:0.875rem;padding:8px;text-align:center;color:#F4ECD8;background:#2D5C3A;border-right:1px solid rgba(244,236,216,0.18);border-bottom:1px solid rgba(244,236,216,0.18);position:sticky;top:0;z-index:6;">Key Recruiting Journey Steps</th>
              <th colspan="2"  style="font-family:var(--font-body);font-weight:600;font-size:0.875rem;padding:8px;text-align:center;color:#F4ECD8;background:#7B1F2C;border-right:1px solid rgba(244,236,216,0.18);border-bottom:1px solid rgba(244,236,216,0.18);position:sticky;top:0;z-index:6;">Offers</th>
              <th colspan="2"  style="font-family:var(--font-body);font-weight:600;font-size:0.875rem;padding:8px;text-align:center;color:#F4ECD8;background:#5C1620;border-right:1px solid rgba(244,236,216,0.18);border-bottom:1px solid rgba(244,236,216,0.18);position:sticky;top:0;z-index:6;">Offer Profile</th>
            </tr>
            <tr>
              ${[
                ['Rank', '#5C1620'], ['UNITID', '#5C1620'], ['College', '#5C1620'], ['Division', '#5C1620'],
                ['HC<br>Contact', '#2D5C3A'], ['AC<br>Contact', '#2D5C3A'], ['Jr Day<br>Invite', '#2D5C3A'], ['FB Camp<br>Invite', '#2D5C3A'], ['Tour /<br>Visit Confirmed', '#2D5C3A'],
                ['Admissions<br>Pre-Read Req.', '#7B1F2C'], ['Financial Aid<br>Pre-Read Submitted', '#7B1F2C'],
                ['Quality Offer<br>Score', '#5C1620'], ['Compound<br>Profile', '#5C1620'],
              ].map(([label, bg]) =>
                `<th style="font-family:var(--font-body);font-weight:500;font-size:0.6875rem;padding:9px 8px;text-align:center;letter-spacing:0.04em;border-right:1px solid rgba(244,236,216,0.10);border-bottom:2px solid #7B1F2C;color:#F4ECD8;vertical-align:bottom;background:${bg};position:sticky;top:36px;z-index:5;">${label}</th>`,
              ).join('')}
            </tr>
          </thead>
          <tbody>${SCHOOLS.map(rowHtml).join('')}</tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Build a full HTML document that mirrors production:
 *   <html>
 *     <head>...inline production index.css...</head>
 *     <body>
 *       <div id="root">             ← Vite/React mount point
 *         <div data-testid="shortlist-page">
 *           <RecruitingScoreboard>
 *
 * The #root wrapper is critical — production's overflow-x: clip rule
 * targets #root specifically, so without it the test fixture would
 * still bypass the production scroll-context chain.
 */
function fixtureHtml({ paddingTopFiller, mobileMargin, trailingFiller }) {
  const productionCss = loadProductionCss();
  const fillerHeight = paddingTopFiller || 0;
  const trailHeight = trailingFiller || 0;
  const fillerHtml = fillerHeight > 0
    ? `<div style="height:${fillerHeight}px;background:linear-gradient(180deg,#FAFAFA,#F5EFE0);padding:32px;box-sizing:border-box;"><h1 style="font-family:'Playfair Display',serif;color:#8B3A3A;margin:0 0 4px;font-size:2rem;">Your Shortlist</h1><p style="color:#6B6B6B;">Scroll down to see the Scoreboard sticky headers.</p></div>`
    : '';
  const trailHtml = trailHeight > 0
    ? `<div style="height:${trailHeight}px;"></div>`
    : '';
  const pagePadding = mobileMargin ? 'padding-left:16px;padding-right:16px;' : '';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>HF-6 follow-up sticky-header regression lock</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Cormorant+Garamond:wght@600&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>
/* === BEGIN INJECTED PRODUCTION src/index.css === */
${productionCss}
/* === END INJECTED PRODUCTION src/index.css === */
</style>
</head>
<body>
<div id="root">
  ${fillerHtml}
  <div data-testid="shortlist-page" style="padding:32px;${pagePadding}max-width:1200px;margin:0 auto;box-sizing:border-box;">
    ${tableHtml()}
  </div>
  ${trailHtml}
</div>
</body>
</html>
  `;
}

// ── Sticky regression — desktop ──────────────────────────────────────────

test('HF-6 follow-up — desktop @ 1280, sticky headers pinned with production CSS injected', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  // Tall filler (1600px) and additional trailing space ensure the page is
  // long enough to scroll the wrapper top well above the viewport, leaving
  // sticky as the only mechanism that could keep headers visible.
  await page.setContent(fixtureHtml({ paddingTopFiller: 1600, mobileMargin: false, trailingFiller: 1600 }));
  await page.waitForLoadState('networkidle');

  // Compute the wrapper's natural document-y, then scroll deep past it.
  const wrapperDocY = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="recruiting-scoreboard"]');
    return el.getBoundingClientRect().top + window.scrollY;
  });
  // Scroll past the wrapper by 400px — the wrapper top is well above viewport.
  await page.evaluate((targetY) => window.scrollTo(0, targetY), wrapperDocY + 400);
  await page.waitForTimeout(400);

  await page.screenshot({
    path: resolve(OUT_DIR, 'hf6-followup-sticky-desktop-1280.png'),
    fullPage: false,
  });

  // Regression lock: with the wrapper top scrolled 400px above viewport,
  // the only way the group-header can be in the visible viewport is via
  // sticky activation. The HF-6 production failure had sticky off entirely;
  // boundingBox.y would have been ~-400 (above viewport) in that mode.
  const groupHeader = page.locator('thead tr:first-child th:first-child');
  const box = await groupHeader.boundingBox();
  expect(box, 'group-header bounding box exists').toBeTruthy();
  expect(box.y, 'group-header still in viewport — sticky activated despite wrapper scrolled past').toBeGreaterThanOrEqual(0);
  expect(box.y, 'group-header pinned near viewport top').toBeLessThan(80);

  // The column-header row should pin directly below the group row at top:36.
  const colHeader = page.locator('thead tr:nth-child(2) th:first-child');
  const colBox = await colHeader.boundingBox();
  expect(colBox, 'col-header bounding box exists').toBeTruthy();
  expect(colBox.y, 'col-header pinned just below group row at ~36px').toBeGreaterThanOrEqual(30);
  expect(colBox.y, 'col-header pinned in upper portion of viewport').toBeLessThan(120);
});

// ── Sticky regression — mobile 375 ───────────────────────────────────────

test('HF-6 follow-up — mobile @ 375, table-scroll wrapper activates overflow-x, sticky deactivates (documented limitation)', async ({ page }) => {
  // At < 1240px viewport the .scoreboard-table-scroll class engages
  // overflow-x: auto so the 1200px-min-width table can horizontally
  // scroll on mobile. That overflow-x establishes a scroll container
  // that traps sticky-y descendants — sticky deactivates on mobile.
  // This is a documented limitation of the HF-6 follow-up fix:
  // mobile sticky alongside horizontal scroll requires a two-table
  // structure with JS scroll-left synchronization, which is out of
  // scope for this hotfix.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.setContent(fixtureHtml({ paddingTopFiller: 1600, mobileMargin: true, trailingFiller: 1600 }));
  await page.waitForLoadState('networkidle');

  const wrapperDocY = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="recruiting-scoreboard"]');
    return el.getBoundingClientRect().top + window.scrollY;
  });
  await page.evaluate((targetY) => window.scrollTo(0, targetY), wrapperDocY + 400);
  await page.waitForTimeout(400);

  await page.screenshot({
    path: resolve(OUT_DIR, 'hf6-followup-sticky-mobile-375.png'),
    fullPage: false,
  });

  // Lock the documented mobile-sticky limitation. If a future change makes
  // sticky work on mobile (e.g., by restructuring to a two-table approach),
  // this assertion will fail and the maintainer will know to update the
  // mobile test to assert the new behavior.
  const groupHeader = page.locator('thead tr:first-child th:first-child');
  const box = await groupHeader.boundingBox();
  // The group header is expected to scroll out of viewport (negative y)
  // because sticky cannot resolve to the page scroll context — its
  // ancestor .scoreboard-table-scroll has overflow-x: auto at this
  // viewport, trapping sticky-y inside.
  expect(box, 'group-header bounding box still exists').toBeTruthy();
  expect(box.y, 'mobile sticky deactivated — header scrolled with table (documented limitation)').toBeLessThan(0);
});

// ── HF-2 horizontal-scroll regression — mobile 375 ───────────────────────

test('HF-6 follow-up — mobile @ 375, HF-2 horizontal scroll still works after overflow-y: clip', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.setContent(fixtureHtml({ paddingTopFiller: 0, mobileMargin: true }));
  await page.waitForLoadState('networkidle');

  // Scroll the inner horizontal-scroll wrapper to the right. If overflow-y:
  // clip accidentally killed overflow-x scrollability, scrollLeft would
  // remain 0 after this attempt.
  const scrollWrap = page.locator('[data-testid="recruiting-scoreboard"] > div').nth(1);
  await scrollWrap.evaluate((el) => { el.scrollLeft = 400; });
  await page.waitForTimeout(150);
  const scrollLeft = await scrollWrap.evaluate((el) => el.scrollLeft);
  expect(scrollLeft, 'inner wrapper still scrolls horizontally').toBeGreaterThan(0);

  await page.screenshot({
    path: resolve(OUT_DIR, 'hf6-followup-horizontal-scroll-mobile-375.png'),
    fullPage: false,
  });
});

// ── D8 mobile horizontal-parallax-lock regression ────────────────────────

test('HF-6 follow-up — D8 mobile horizontal-parallax-lock still holds with overflow-x: clip', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.setContent(fixtureHtml({ paddingTopFiller: 0, mobileMargin: true }));
  await page.waitForLoadState('networkidle');

  // Attempt to scroll the page body horizontally. With D8 protection
  // (overflow-x: clip on html/body/#root), the page should not scroll
  // horizontally even if a descendant tries to make it.
  await page.evaluate(() => { window.scrollTo(400, 0); });
  await page.waitForTimeout(150);
  const scrollX = await page.evaluate(() => window.scrollX);
  expect(scrollX, 'page-level horizontal scroll blocked by D8 (overflow-x: clip)').toBe(0);
});
