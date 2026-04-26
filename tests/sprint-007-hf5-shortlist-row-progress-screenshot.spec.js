/**
 * Sprint 007 hotfix HF-5 — visual evidence screenshot for the per-school
 * Recruiting Journey progress bar added to ShortlistRow.
 *
 * Captures the row layout at desktop width (1280) showing several rows
 * with varying progress fills (0/15, 1/15, 4/15, 7/15, 10/15, 15/15) so
 * the deployed-preview review carry-forward has pixel evidence of:
 *   - Empty-state bar (0/15) renders an empty track, not hidden
 *   - 1/15 default-shortlist case renders ~6.67% fill
 *   - Mid-range fills read as proportional segments
 *   - 100% fill matches the track end with no overflow
 *   - Bar slot sits between the school identity block and the status pill
 *   - Label "{n}/15" reads as muted caption
 *
 * Run: npx playwright test tests/sprint-007-hf5-shortlist-row-progress-screenshot.spec.js --project=chromium
 *
 * Output: docs/specs/sprint-007/screenshots/hf5-shortlist-row-progress-1280.png
 *
 * The HTML is constructed inline (page.setContent) to mirror the
 * production component's structure exactly without depending on a
 * running dev server with seeded auth state.
 */

import { test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(REPO_ROOT, 'docs/specs/sprint-007/screenshots');

const ROWS = [
  { rank: 1, name: 'Wesleyan University',                      sub: 'D3 • NESCAC',     status: 'Grit Fit School',         progress: 10 },
  { rank: 2, name: 'University of New Hampshire-Main Campus',  sub: 'FCS • CAA',       status: 'Grit Fit School',         progress: 7  },
  { rank: 3, name: 'Rensselaer Polytechnic Institute',         sub: 'D3 • Liberty',    status: 'Academic Stretch',        progress: 4  },
  { rank: 4, name: 'University of Maine',                      sub: 'FCS • CAA',       status: 'Outside Geographic Reach', progress: 1  },
  { rank: 5, name: 'Tufts University',                         sub: 'D3 • NESCAC',     status: 'Grit Fit School',         progress: 15 },
  { rank: 6, name: 'Bowdoin College',                          sub: 'D3 • NESCAC',     status: 'Grit Fit School',         progress: 0  },
];

const STATUS_BG = {
  'Grit Fit School':           '#C8DDB8',
  'Academic Stretch':          '#F0E0B0',
  'Outside Geographic Reach':  '#F0CFC9',
};
const STATUS_FG = {
  'Grit Fit School':           '#2D4A1F',
  'Academic Stretch':          '#6B5414',
  'Outside Geographic Reach':  '#6E2620',
};

function rowHtml(r, idx) {
  const isOdd = idx % 2 === 1;
  const bg = isOdd ? '#F5EFE0' : '#FFFFFF';
  const pct = ((r.progress / 15) * 100).toFixed(2);
  const pillBg = STATUS_BG[r.status] || '#E8E8E8';
  const pillFg = STATUS_FG[r.status] || '#2C2C2C';
  return `
    <div style="display:flex;align-items:center;gap:16px;padding:14px 18px;background:${bg};border-bottom:1px solid #E8E8E8;flex-wrap:wrap;">
      <div style="flex:0 0 auto;min-width:32px;font-size:1rem;font-weight:700;color:#8B3A3A;font-variant-numeric:tabular-nums;">${r.rank}</div>
      <div style="flex:1 1 240px;min-width:0;">
        <div style="font-size:1.0625rem;font-weight:700;color:#8B3A3A;line-height:1.2;">${r.name}</div>
        <div style="font-size:0.8125rem;color:#6B6B6B;margin-top:2px;">${r.sub}</div>
      </div>
      <div style="flex:1 1 180px;min-width:120px;max-width:320px;display:flex;align-items:center;gap:8px;font-family:var(--font-body);">
        <div style="flex:1;height:10px;background:#F5EFE0;border:1px solid #E6D7C3;border-radius:5px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:#8B3A3A;border-radius:5px;"></div>
        </div>
        <span style="flex:0 0 auto;font-size:0.6875rem;font-weight:600;color:#6B6B6B;font-variant-numeric:tabular-nums;letter-spacing:0.02em;white-space:nowrap;">${r.progress}/15</span>
      </div>
      <div style="flex:0 0 auto;display:flex;align-items:center;">
        <span style="display:inline-block;padding:4px 12px;border-radius:14px;font-size:0.75rem;font-weight:600;background:${pillBg};color:${pillFg};">${r.status}</span>
      </div>
    </div>
  `;
}

const HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>HF-5 Shortlist Row Progress Bar — visual evidence</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --font-body: 'DM Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    --font-heading: 'Playfair Display', Georgia, serif;
    --brand-maroon: #8B3A3A;
    --brand-cream: #F5EFE0;
  }
  *, *::before, *::after { font-family: var(--font-body); box-sizing: border-box; }
  body { margin: 0; padding: 32px; background: #FAFAFA; }
  h1 { font-family: var(--font-heading); color: #8B3A3A; margin: 0 0 4px; font-size: 2rem; }
  p.sub { color: #6B6B6B; margin: 0 0 24px; font-size: 0.9375rem; }
  .rank-header {
    display:flex;align-items:center;padding:8px 18px;background:#F5EFE0;
    border-bottom:2px solid #D4D4D4;font-size:0.75rem;font-weight:700;
    color:#2C2C2C;text-transform:uppercase;letter-spacing:0.04em;
    border-top:1px solid #E6D7C3;
  }
  .list { border-top:1px solid #E6D7C3; }
</style>
</head>
<body>
  <h1>Your Shortlist</h1>
  <p class="sub">${ROWS.length} schools — sorted by Most Progress (HF-3 default)</p>
  <div class="list">
    <div class="rank-header"><span style="min-width:32px;">Rank ↑</span></div>
    ${ROWS
      // sort: progress_desc with name ASC tiebreak (HF-3 contract)
      .slice()
      .sort((a, b) => (b.progress - a.progress) || a.name.localeCompare(b.name))
      .map((r, i) => rowHtml({ ...r, rank: i + 1 }, i))
      .join('')}
  </div>
</body>
</html>
`;

test.describe('Sprint 007 HF-5 — Shortlist row progress bar visual', () => {
  test('desktop @ 1280 — six rows with varied progress fills', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.setContent(HTML);
    // Allow web fonts to settle.
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    await page.screenshot({
      path: resolve(OUT_DIR, 'hf5-shortlist-row-progress-1280.png'),
      fullPage: true,
    });
  });
});
