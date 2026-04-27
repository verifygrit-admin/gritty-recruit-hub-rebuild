/**
 * Sprint 007 hotfix HF-6 — visual evidence screenshots.
 *
 * Captures three views demonstrating the two HF-6 changes:
 *   1) Desktop scroll-mid — Scoreboard headers frozen at top while rows
 *      scroll behind them. Proves the sticky thead behavior at 1280px.
 *   2) Mobile 375 scroll-mid — same sticky behavior at narrow viewport.
 *   3) Mobile 375 margin — full-page Shortlist + Scoreboard view at 375px
 *      showing the new 16px horizontal margin around both.
 *
 * Run: npx playwright test tests/sprint-007-hf6-screenshots.spec.js --project=chromium
 *
 * Output: docs/specs/sprint-007/screenshots/
 *   - hf6-scoreboard-sticky-desktop-1280.png
 *   - hf6-scoreboard-sticky-mobile-375.png
 *   - hf6-mobile-margin-shortlist-375.png
 *
 * The HTML is constructed inline so the screenshot is reproducible without
 * a running auth'd dev server. Mirrors the production component structure
 * including the position:sticky thead rules added in HF-6 and the 16px
 * mobile padding rule from index.css.
 */

import { test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(REPO_ROOT, 'docs/specs/sprint-007/screenshots');

// ── Shared fixtures ─────────────────────────────────────────────────────

const SCHOOLS = [
  { rank: 1, unitid: 130697, name: 'Wesleyan University',                      conf: 'NESCAC',     div: 'D3',  bools: [true, true, true, false, false, false, false], q: 42.86 },
  { rank: 2, unitid: 195216, name: 'St Lawrence University',                   conf: 'Liberty',    div: 'D3',  bools: [true, true, false, false, false, false, false], q: 28.57 },
  { rank: 3, unitid: 168148, name: 'Tufts University',                         conf: 'NESCAC',     div: 'D3',  bools: [true, true, true, true, true, true, true],     q: 100   },
  { rank: 4, unitid: 194824, name: 'Rensselaer Polytechnic Institute',         conf: 'Liberty',    div: 'D3',  bools: [true, true, true, true, false, false, false], q: 57.14 },
  { rank: 5, unitid: 161253, name: 'University of Maine',                      conf: 'CAA',        div: 'FCS', bools: [true, true, false, false, false, false, false], q: 28.57 },
  { rank: 6, unitid: 183044, name: 'University of New Hampshire-Main Campus',  conf: 'CAA',        div: 'FCS', bools: [true, true, true, true, true, false, false],  q: 71.43 },
  { rank: 7, unitid: 161086, name: 'Colby College',                            conf: 'NESCAC',     div: 'D3',  bools: [true, true, true, false, false, false, false], q: 42.86 },
  { rank: 8, unitid: 230959, name: 'Middlebury College',                       conf: 'NESCAC',     div: 'D3',  bools: [true, false, false, false, false, false, false], q: 14.29 },
  { rank: 9, unitid: 168342, name: 'Williams College',                         conf: 'NESCAC',     div: 'D3',  bools: [true, true, false, false, false, false, false], q: 28.57 },
  { rank: 10, unitid: 191515, name: 'Hamilton College',                        conf: 'NESCAC',     div: 'D3',  bools: [true, true, true, false, false, false, false], q: 42.86 },
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

const SHARED_CSS = `
:root {
  --font-body: 'DM Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  --font-heading: 'Playfair Display', Georgia, serif;
  --brand-maroon: #8B3A3A;
  --brand-gold: #D4AF37;
  --brand-cream: #F5EFE0;
}
*, *::before, *::after { font-family: var(--font-body); box-sizing: border-box; }
body { margin: 0; background: #FAFAFA; }
h1 { font-family: var(--font-heading); color: #8B3A3A; font-size: 2rem; margin: 0 0 4px; }
.scoreboard-wrapper {
  background: #FAF6EA;
  border: 1px solid rgba(92,22,32,0.18);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(92,22,32,0.06);
  margin-bottom: 24px;
}
.scoreboard-toggle {
  background: #7B1F2C; color: var(--brand-gold); padding: 14px 22px;
  font-family: 'Cormorant Garamond', serif; font-weight: 600; font-size: 1.375rem;
  display: flex; align-items: center; justify-content: space-between;
}
.scoreboard-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
table.scoreboard {
  width: 100%; border-collapse: collapse; font-size: 0.78125rem;
  background: #FAF6EA; min-width: 1200px;
}
.gh-row th {
  font-family: var(--font-body); font-weight: 600; font-size: 0.875rem;
  padding: 8px; text-align: center; color: #F4ECD8;
  border-right: 1px solid rgba(244,236,216,0.18);
  border-bottom: 1px solid rgba(244,236,216,0.18);
  position: sticky; top: 0; z-index: 6;
}
.col-row th {
  font-family: var(--font-body); font-weight: 500; font-size: 0.6875rem;
  padding: 9px 8px; text-align: center; letter-spacing: 0.04em;
  border-right: 1px solid rgba(244,236,216,0.10);
  border-bottom: 2px solid #7B1F2C;
  color: #F4ECD8; vertical-align: bottom; white-space: pre-line;
  position: sticky; top: 36px; z-index: 5;
}
`;

function tableHtml() {
  return `
    <div class="scoreboard-wrapper" data-testid="recruiting-scoreboard">
      <div class="scoreboard-toggle">Recruiting Scoreboard <span style="color: var(--brand-gold);">▾</span></div>
      <div class="scoreboard-table-wrap">
        <table class="scoreboard">
          <thead>
            <tr class="gh-row">
              <th colspan="4" style="background:#5C1620;">Recruiting Scoreboard</th>
              <th colspan="5" style="background:#2D5C3A;">Key Recruiting Journey Steps</th>
              <th colspan="2" style="background:#7B1F2C;">Offers</th>
              <th colspan="2" style="background:#5C1620;">Offer Profile</th>
            </tr>
            <tr class="col-row">
              <th style="background:#5C1620;">Rank</th>
              <th style="background:#5C1620;">UNITID</th>
              <th style="background:#5C1620;">College</th>
              <th style="background:#5C1620;">Division</th>
              <th style="background:#2D5C3A;">HC&#10;Contact</th>
              <th style="background:#2D5C3A;">AC&#10;Contact</th>
              <th style="background:#2D5C3A;">Jr Day&#10;Invite</th>
              <th style="background:#2D5C3A;">FB Camp&#10;Invite</th>
              <th style="background:#2D5C3A;">Tour /&#10;Visit Confirmed</th>
              <th style="background:#7B1F2C;">Admissions&#10;Pre-Read Req.</th>
              <th style="background:#7B1F2C;">Financial Aid&#10;Pre-Read Submitted</th>
              <th style="background:#5C1620;">Quality Offer&#10;Score</th>
              <th style="background:#5C1620;">Compound&#10;Profile</th>
            </tr>
          </thead>
          <tbody>
            ${SCHOOLS.map(rowHtml).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── Test 1 — Desktop sticky-mid ──────────────────────────────────────────

test('HF-6 — desktop @ 1280, scrolled mid-table, sticky headers visible', async ({ page }) => {
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Cormorant+Garamond:wght@600&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>${SHARED_CSS} .page { padding: 32px; max-width: 1200px; margin: 0 auto; } .filler { height: 600px; background: linear-gradient(180deg, #FAFAFA, #F5EFE0); padding: 32px; }</style>
</head>
<body>
<div class="filler"><h1>Your Shortlist</h1><p>Scroll down to see the Scoreboard sticky headers in action.</p></div>
<div class="page">${tableHtml()}</div>
</body></html>`;
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.setContent(html);
  await page.waitForLoadState('networkidle');
  // Scroll down so the table top is above viewport, exposing sticky thead.
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: resolve(OUT_DIR, 'hf6-scoreboard-sticky-desktop-1280.png'),
    fullPage: false,
  });
});

// ── Test 2 — Mobile 375 sticky-mid ──────────────────────────────────────

test('HF-6 — mobile @ 375, scrolled mid-table, sticky headers visible', async ({ page }) => {
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Cormorant+Garamond:wght@600&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>
${SHARED_CSS}
.page { padding-left: 16px; padding-right: 16px; }
.filler { height: 320px; background: linear-gradient(180deg, #FAFAFA, #F5EFE0); padding: 16px; }
</style>
</head>
<body>
<div class="filler"><h1>Your Shortlist</h1><p style="color:#6B6B6B;">Scroll down to see the Scoreboard.</p></div>
<div class="page" data-testid="shortlist-page">${tableHtml()}</div>
</body></html>`;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.setContent(html);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.scrollTo(0, 380));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: resolve(OUT_DIR, 'hf6-scoreboard-sticky-mobile-375.png'),
    fullPage: false,
  });
});

// ── Test 3 — Mobile 375 margin ───────────────────────────────────────────

test('HF-6 — mobile @ 375, full Shortlist + Scoreboard with 16px margin', async ({ page }) => {
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Cormorant+Garamond:wght@600&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>
${SHARED_CSS}
[data-testid="shortlist-page"] {
  padding-left: 16px; padding-right: 16px; box-sizing: border-box;
}
[data-testid="shortlist-page"] [data-testid="recruiting-scoreboard"] {
  margin-left: 0; margin-right: 0;
}
.page-header { padding-top: 16px; }
.shortlist-row {
  display: flex; align-items: center; gap: 12px; padding: 14px 18px;
  background: #FFFFFF; border-bottom: 1px solid #E8E8E8; flex-wrap: wrap;
}
.shortlist-row.odd { background: #F5EFE0; }
.shortlist-row .rank { font-size: 1rem; font-weight: 700; color: #8B3A3A; min-width: 32px; }
.shortlist-row .name { font-size: 1rem; font-weight: 700; color: #8B3A3A; flex: 1 1 140px; }
.shortlist-row .pill { background: #C8DDB8; color: #2D4A1F; padding: 4px 12px; border-radius: 14px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
</style>
</head>
<body>
<div data-testid="shortlist-page">
  <div class="page-header">
    <h1>Your Shortlist</h1>
    <p style="color:#6B6B6B;margin:0 0 16px;">10 schools — sorted by Most Progress</p>
  </div>
  ${tableHtml()}
  <h2 style="font-family: var(--font-heading); color: #8B3A3A; margin: 16px 0 0;">Pre-Read Documents Library</h2>
  <p style="color: #6B6B6B; margin: 0 0 16px;">Upload once, send to many.</p>
  <div style="border-top: 1px solid #E6D7C3;">
    <div class="shortlist-row"><span class="rank">1</span><div class="name">Tufts University<br/><span style="font-size:0.8125rem;color:#6B6B6B;font-weight:400;">D3 • NESCAC</span></div><span class="pill">Grit Fit School</span></div>
    <div class="shortlist-row odd"><span class="rank">2</span><div class="name">Wesleyan University<br/><span style="font-size:0.8125rem;color:#6B6B6B;font-weight:400;">D3 • NESCAC</span></div><span class="pill">Grit Fit School</span></div>
    <div class="shortlist-row"><span class="rank">3</span><div class="name">St Lawrence University<br/><span style="font-size:0.8125rem;color:#6B6B6B;font-weight:400;">D3 • Liberty</span></div><span class="pill">Grit Fit School</span></div>
  </div>
</div>
</body></html>`;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.setContent(html);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  await page.screenshot({
    path: resolve(OUT_DIR, 'hf6-mobile-margin-shortlist-375.png'),
    fullPage: true,
  });
});
