/**
 * sprint-020-athletes-acceptance.spec.js
 *
 * End-to-end acceptance verification for Sprint 020 against the live URL.
 * Covers the three anonymous-visit scenarios (acceptance tests 1, 2, 5).
 * Tests 3 and 4 (authenticated-as-Ricky behavior) are verified at the
 * RLS / SQL layer in the Sprint 020 retro — they require browser-side
 * credentials that are not part of this suite.
 *
 * Counts athletes by counting the cards rendered inside the
 * data-testid="athletes-grid" container after switching tabs via
 * SchoolToggle.
 */

import { test, expect } from '@playwright/test';

const PAGE = '/athletes';
const SCHOOL_TOGGLE = '[data-testid="recruits-school-toggle"]';
const GRID = '[data-testid="athletes-grid"]';
const COUNTER = '[data-testid="athletes-count"]';

async function gotoAthletes(page) {
  await page.goto(PAGE);
  await page.waitForSelector(SCHOOL_TOGGLE);
}

async function pickSchool(page, label) {
  const button = page
    .locator(SCHOOL_TOGGLE)
    .getByRole('button', { name: new RegExp(label, 'i') });
  await button.click();
  // Active-tab transition: the clicked button is now aria-pressed. This guards
  // against a race where the previous tab's grid is still in the DOM when the
  // wait condition below evaluates.
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  // Roster fetch completed: loading skeleton gone, grid or empty-roster present.
  await page.waitForFunction(
    () =>
      !document.querySelector('[data-testid="athletes-loading"]') &&
      (document.querySelector('[data-testid="athletes-grid"]') ||
        document.querySelector('[data-testid="athletes-empty-roster"]')),
    null,
    { timeout: 15000 }
  );
}

async function countCards(page) {
  const grid = page.locator(GRID);
  if ((await grid.count()) === 0) return 0;
  // RecruitCard root element — react keys ensure each card is one of grid's
  // direct children. Count them via grid's child element count.
  return await grid.evaluate((el) => el.children.length);
}

test('Sprint 020 / Test 1 — anon BC High roster renders all active athletes', async ({
  page,
}) => {
  await gotoAthletes(page);
  await pickSchool(page, 'BC High');
  const count = await countCards(page);
  test.info().annotations.push({ type: 'observed', description: `BC High count = ${count}` });
  expect(count).toBeGreaterThanOrEqual(20);
});

test('Sprint 020 / Test 2 — anon Belmont Hill roster renders all active athletes', async ({
  page,
}) => {
  await gotoAthletes(page);
  await pickSchool(page, 'Belmont Hill');
  const count = await countCards(page);
  test.info().annotations.push({ type: 'observed', description: `Belmont Hill count = ${count}` });
  expect(count).toBeGreaterThanOrEqual(2);
});

test('Sprint 020 / Test 5 — no athlete with grad_year <= 2025 appears on either tab', async ({
  page,
}) => {
  // RecruitCard renders the class year visibly. For each tab, batch all card
  // text reads into a single page.evaluate() — avoids per-locator auto-wait
  // round-trips that flake on slow CI runners (29 separate .innerText() awaits
  // can exceed the per-test timeout even when the DOM is fully settled).
  await gotoAthletes(page);
  for (const school of ['BC High', 'Belmont Hill']) {
    await pickSchool(page, school);
    const cardTexts = await page.locator(GRID).evaluate((el) =>
      Array.from(el.children).map((c) => c.innerText)
    );
    for (let i = 0; i < cardTexts.length; i++) {
      const years = (cardTexts[i].match(/\b(20\d{2})\b/g) || []).map(Number);
      for (const y of years) {
        expect(
          y >= 2026,
          `${school} card ${i} contains year ${y} (expected >= 2026)`
        ).toBe(true);
      }
    }
  }
});

test('Sprint 020 / Header counter matches BC High roster size', async ({ page }) => {
  await gotoAthletes(page);
  await pickSchool(page, 'BC High');
  const counter = await page.locator(COUNTER).innerText();
  const grid = await countCards(page);
  test.info().annotations.push({ type: 'observed', description: `counter="${counter}" grid=${grid}` });
  // counter prefix is the rendered count followed by "athletes"
  expect(counter).toMatch(new RegExp(`^${grid}\\s+athletes`));
});
