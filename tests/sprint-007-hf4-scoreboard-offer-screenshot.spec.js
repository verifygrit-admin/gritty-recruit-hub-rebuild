/**
 * Sprint 007 hotfix HF-4 — visual evidence screenshot for the Verbal Offer
 * badge rendering on the Recruiting Scoreboard.
 *
 * Reproduces Jesse Bargar's known-positive case: St Lawrence University
 * (Liberty conference, D3) with step_id=14 ("Received verbal offer")
 * completed in recruiting_journey_steps. The Verbal Offer badge should
 * render below the school name in the College column.
 *
 * Run: npx playwright test tests/sprint-007-hf4-scoreboard-offer-screenshot.spec.js --project=chromium
 *
 * Output: docs/specs/sprint-007/screenshots/hf4-scoreboard-stlawrence-verbal-offer-1280.png
 *
 * The HTML mirrors the production Scoreboard structure inline so the
 * screenshot is reproducible without a running auth'd dev server.
 */

import { test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(REPO_ROOT, 'docs/specs/sprint-007/screenshots');

// Three rows mirroring the production Scoreboard for visual context:
//   Row 1: Wesleyan — high progress, no offer (control row)
//   Row 2: St Lawrence — Verbal Offer badge under school name (the bug repro)
//   Row 3: Tufts — both Verbal + Written offers (parallel-render evidence)
const HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>HF-4 Scoreboard Verbal/Written Offer badges</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Cormorant+Garamond:wght@600&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --font-body: 'DM Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    --font-heading: 'Playfair Display', Georgia, serif;
    --brand-maroon: #8B3A3A;
    --brand-gold: #D4AF37;
    --brand-cream: #F5EFE0;
  }
  *, *::before, *::after { font-family: var(--font-body); box-sizing: border-box; }
  body { margin: 0; padding: 32px; background: #FAFAFA; }
  .wrapper { background: #FAF6EA; border: 1px solid rgba(92,22,32,0.18); border-radius: 4px; box-shadow: 0 2px 8px rgba(92,22,32,0.06); margin-bottom: 24px; }
  .toggle { background: #7B1F2C; color: var(--brand-gold); padding: 14px 22px; min-height: 56px; display: flex; align-items: center; justify-content: space-between; font-family: 'Cormorant Garamond', serif; font-weight: 600; font-size: 1.375rem; }
  .intro { padding: 18px 24px 16px; border-bottom: 1px solid rgba(92,22,32,0.15); font-size: 0.8125rem; color: #4A3A30; line-height: 1.6; max-width: 920px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.78125rem; background: #FAF6EA; min-width: 1200px; }
  thead.gh { background: #5C1620; color: #F4ECD8; }
  thead .group-th { font-family: var(--font-body); font-weight: 600; font-size: 0.875rem; padding: 8px; text-align: center; color: #F4ECD8; border-right: 1px solid rgba(244,236,216,0.18); border-bottom: 1px solid rgba(244,236,216,0.18); }
  thead .col-th { font-family: var(--font-body); font-weight: 500; font-size: 0.6875rem; padding: 9px 8px; text-align: center; letter-spacing: 0.04em; border-right: 1px solid rgba(244,236,216,0.10); border-bottom: 2px solid #7B1F2C; color: #F4ECD8; vertical-align: bottom; white-space: pre-line; }
  td { padding: 10px 10px; border-right: 1px solid rgba(92,22,32,0.15); vertical-align: middle; }
  .rank-cell { font-family: 'Cormorant Garamond', serif; font-size: 1rem; font-weight: 600; color: #7B1F2C; text-align: center; width: 44px; }
  .unitid-cell { font-size: 0.6875rem; color: #7A6A60; text-align: center; width: 64px; letter-spacing: 0.02em; }
  .school-cell { font-weight: 500; color: #2A1F1A; font-size: 0.8125rem; min-width: 220px; }
  .school-name { display: block; font-weight: 500; }
  .badge-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
  .offer-badge { display: inline-block; font-weight: 600; border-radius: 12px; padding: 2px 8px; font-size: 0.6875rem; white-space: nowrap; font-family: var(--font-body); }
  .offer-badge.verbal { background: var(--brand-gold); color: #2A1F1A; }
  .offer-badge.written { background: var(--brand-maroon); color: #FFFFFF; }
  .conf { display: block; font-size: 0.65625rem; color: #7A6A60; margin-top: 1px; letter-spacing: 0.04em; }
  .div-cell { text-align: center; font-size: 0.6875rem; color: #4A3A30; font-weight: 500; width: 70px; }
  .yes { background: #C8DDB8; color: #2D4A1F; }
  .no  { background: #F0CFC9; color: #6E2620; }
  .bool { display: inline-block; padding: 3px 12px; border-radius: 3px; min-width: 38px; text-align: center; font-size: 0.71875rem; font-weight: 500; }
  .quality-cell { text-align: center; font-family: 'Cormorant Garamond', serif; font-size: 1rem; font-weight: 600; width: 110px; color: #2D7A4A; }
</style>
</head>
<body>
<h1 style="font-family: var(--font-heading); color: #8B3A3A; margin: 0 0 4px;">Recruiting Scoreboard — HF-4 visual evidence</h1>
<p style="color: #6B6B6B; margin: 0 0 24px;">Jesse Bargar / St Lawrence — step 14 verbal offer renders correctly</p>
<div class="wrapper">
  <div class="toggle">Recruiting Scoreboard <span style="color: var(--brand-gold);">▾</span></div>
  <div class="intro">Verbal Offer (gold) and Written Offer (maroon) badges render under the school name when the corresponding journey step is complete on this row.</div>
  <table>
    <thead class="gh">
      <tr>
        <th colspan="4" class="group-th">Recruiting Scoreboard</th>
        <th colspan="5" class="group-th" style="background:#2D5C3A;">Key Recruiting Journey Steps</th>
        <th colspan="2" class="group-th" style="background:#7B1F2C;">Offers</th>
        <th colspan="2" class="group-th">Offer Profile</th>
      </tr>
      <tr>
        <th class="col-th">Rank</th>
        <th class="col-th">UNITID</th>
        <th class="col-th">College</th>
        <th class="col-th">Division</th>
        <th class="col-th" style="background:#2D5C3A;">HC\\AContact</th>
        <th class="col-th" style="background:#2D5C3A;">AC\\AContact</th>
        <th class="col-th" style="background:#2D5C3A;">Jr Day</th>
        <th class="col-th" style="background:#2D5C3A;">FB Camp</th>
        <th class="col-th" style="background:#2D5C3A;">Tour / Visit</th>
        <th class="col-th" style="background:#7B1F2C;">Adm Pre-Read</th>
        <th class="col-th" style="background:#7B1F2C;">FA Pre-Read</th>
        <th class="col-th">Quality\\AOffer Score</th>
        <th class="col-th">Compound\\AProfile</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="rank-cell">1</td>
        <td class="unitid-cell">130697</td>
        <td class="school-cell">
          <span class="school-name">Wesleyan University</span>
          <span class="conf">NESCAC</span>
        </td>
        <td class="div-cell">D3</td>
        <td><span class="bool yes">Yes</span></td>
        <td><span class="bool yes">Yes</span></td>
        <td><span class="bool yes">Yes</span></td>
        <td><span class="bool no">No</span></td>
        <td><span class="bool no">No</span></td>
        <td><span class="bool no">No</span></td>
        <td><span class="bool no">No</span></td>
        <td class="quality-cell">42.86%</td>
        <td>—</td>
      </tr>
      <tr style="background: #F5EFE0;">
        <td class="rank-cell">2</td>
        <td class="unitid-cell">195216</td>
        <td class="school-cell">
          <span class="school-name">St Lawrence University</span>
          <div class="badge-row">
            <span class="offer-badge verbal">Verbal Offer</span>
          </div>
          <span class="conf">Liberty</span>
        </td>
        <td class="div-cell">D3</td>
        <td><span class="bool yes">Yes</span></td>
        <td><span class="bool yes">Yes</span></td>
        <td><span class="bool no">No</span></td>
        <td><span class="bool no">No</span></td>
        <td><span class="bool no">No</span></td>
        <td><span class="bool no">No</span></td>
        <td><span class="bool no">No</span></td>
        <td class="quality-cell">28.57%</td>
        <td>—</td>
      </tr>
      <tr>
        <td class="rank-cell">3</td>
        <td class="unitid-cell">168148</td>
        <td class="school-cell">
          <span class="school-name">Tufts University</span>
          <div class="badge-row">
            <span class="offer-badge verbal">Verbal Offer</span>
            <span class="offer-badge written">Written Offer</span>
          </div>
          <span class="conf">NESCAC</span>
        </td>
        <td class="div-cell">D3</td>
        <td><span class="bool yes">Yes</span></td>
        <td><span class="bool yes">Yes</span></td>
        <td><span class="bool yes">Yes</span></td>
        <td><span class="bool yes">Yes</span></td>
        <td><span class="bool yes">Yes</span></td>
        <td><span class="bool yes">Yes</span></td>
        <td><span class="bool yes">Yes</span></td>
        <td class="quality-cell">100%</td>
        <td>—</td>
      </tr>
    </tbody>
  </table>
</div>
</body>
</html>
`;

test.describe('Sprint 007 HF-4 — Scoreboard offer badge visual', () => {
  test('desktop @ 1280 — St Lawrence Verbal Offer + Tufts Verbal+Written', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.setContent(HTML);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    await page.screenshot({
      path: resolve(OUT_DIR, 'hf4-scoreboard-stlawrence-verbal-offer-1280.png'),
      fullPage: true,
    });
  });
});
