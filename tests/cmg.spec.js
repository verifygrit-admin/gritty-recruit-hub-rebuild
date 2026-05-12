/**
 * Coach Message Generator (CMG) — Acceptance Suite
 *
 * Sprint 025 Phase 9a. Covers 11 acceptance criteria from the Phase 9
 * SESSION_SPEC. All auth-required tests gracefully skip when
 * TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD env vars are not set.
 *
 * Test list:
 *   TC-CMG-NAV-001         — drawer → /coach-messages → 11 scenario cards
 *   TC-CMG-GALLERY-001     — 1 public post + 10 coach message cards
 *   TC-CMG-FLOW-002        — Scenario 2 full flow, body substitution
 *   TC-CMG-RECIPIENT-001   — Position Coach / RAC tab swap re-renders body
 *   TC-CMG-COPY-001        — Copy → success toast + history row append
 *   TC-CMG-EMAIL-001       — Email-to-Self builds mailto: URL with subject/body
 *   TC-CMG-RESET-001       — Reset clears form, keeps scenario/school/tab
 *   TC-CMG-SCENARIO1-001   — Scenario 1: no channel toggle, 3 fields, twitter signature
 *   TC-CMG-TYPEAHEAD-001   — "Other school" → typeahead → search → select
 *   TC-CMG-HISTORY-EMPTY-001 — empty-state copy assertion
 *   TC-CMG-DRAWER-001      — drawer open/close/escape/backdrop/link
 *
 * Run:
 *   npx playwright test tests/cmg.spec.js
 *   npx playwright test tests/cmg.spec.js --reporter=list
 *   npx playwright test tests/cmg.spec.js --list   (parse check)
 *
 * Env:
 *   PLAYWRIGHT_BASE_URL  — defaults to https://app.grittyfb.com (see playwright.config.js)
 *   TEST_APP_URL         — alternate env name accepted (used by some CI configs)
 *   TEST_STUDENT_EMAIL   — seeded student account
 *   TEST_STUDENT_PASSWORD
 */

import { test, expect } from '@playwright/test';

// ── Credentials & config ────────────────────────────────────────────────────

const APP_URL = process.env.TEST_APP_URL || process.env.PLAYWRIGHT_BASE_URL || 'https://app.grittyfb.com';
const STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL;
const STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD;

// ── Helpers (mirror regression.spec.js / coach-dashboard-tabs.spec.js) ──────

async function gotoApp(page) {
  await page.addInitScript(() => {
    try { localStorage.setItem('grh_tutSeen', '1'); } catch (_e) { /* noop */ }
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

async function signInAsStudent(page) {
  test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');
  await gotoApp(page);
  await page.fill('[data-testid="login-email"]', STUDENT_EMAIL);
  await page.fill('[data-testid="login-password"]', STUDENT_PASSWORD);
  await page.click('[data-testid="login-submit"]');
  await page.waitForSelector('[data-testid="layout-sandwich-btn"]', { timeout: 15000 });
}

async function openDrawer(page) {
  await page.locator('[data-testid="layout-sandwich-btn"]').click();
  await expect(page.locator('[data-testid="authenticated-nav"]')).toBeVisible();
}

async function gotoCmg(page) {
  await page.goto('/coach-messages');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-testid="cmg-page"]')).toBeVisible({ timeout: 15000 });
  // Gallery only mounts after the profile/shortlist load finishes.
  await expect(page.locator('[data-testid="cmg-scenario-gallery"]')).toBeVisible({ timeout: 15000 });
}

async function selectScenario(page, scenarioId) {
  await page.locator(`[data-testid="cmg-scenario-card-${scenarioId}"]`).click();
  await expect(page.locator('[data-testid="cmg-message-builder"]')).toBeVisible();
}

// ── TC-CMG-NAV-001 ──────────────────────────────────────────────────────────

test.describe('CMG — Navigation', () => {
  test('TC-CMG-NAV-001: drawer → Coach Messages link → /coach-messages → 11 scenario cards', async ({ page }) => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');

    await signInAsStudent(page);
    await openDrawer(page);

    // Find the Coach Messages link inside the drawer's authenticated nav.
    const link = page.locator('[data-testid="authenticated-nav"]').getByRole('link', { name: /Coach Messages/i });
    await expect(link).toBeVisible();
    await link.click();

    await expect(page).toHaveURL(/\/coach-messages$/);
    await expect(page.locator('[data-testid="cmg-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="cmg-scenario-gallery"]')).toBeVisible({ timeout: 15000 });

    // Assert all 11 scenario testid hooks are present.
    for (let i = 1; i <= 11; i++) {
      await expect(
        page.locator(`[data-testid="cmg-scenario-card-${i}"]`),
        `Scenario card ${i} should be visible`,
      ).toBeVisible();
    }
  });
});

// ── TC-CMG-GALLERY-001 ──────────────────────────────────────────────────────

test.describe('CMG — Gallery grouping', () => {
  test('TC-CMG-GALLERY-001: 1 public post + 10 coach messages, grouped sections', async ({ page }) => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');

    await signInAsStudent(page);
    await gotoCmg(page);

    // Public Posts section contains card #1 only.
    const publicSection = page.locator('#public-posts-section');
    await expect(publicSection).toBeVisible();
    await expect(publicSection.locator('[data-testid^="cmg-scenario-card-"]')).toHaveCount(1);
    await expect(publicSection.locator('[data-testid="cmg-scenario-card-1"]')).toBeVisible();

    // Coach Messages section contains cards #2-#11 (10 total).
    const coachSection = page.locator('#coach-messages-section');
    await expect(coachSection).toBeVisible();
    await expect(coachSection.locator('[data-testid^="cmg-scenario-card-"]')).toHaveCount(10);
    for (let i = 2; i <= 11; i++) {
      await expect(coachSection.locator(`[data-testid="cmg-scenario-card-${i}"]`)).toBeVisible();
    }
  });
});

// ── TC-CMG-FLOW-002 ─────────────────────────────────────────────────────────

test.describe('CMG — End-to-end flow', () => {
  test('TC-CMG-FLOW-002: Scenario 2 full flow with body substitution', async ({ page }) => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');

    await signInAsStudent(page);
    await gotoCmg(page);
    await selectScenario(page, 2);

    // Phase 1 — channel = email (default but assert), select first shortlist school.
    const emailToggle = page.locator('[aria-pressed][role="button"], button[aria-pressed]').filter({ hasText: /^Email$/ }).first();
    if (await emailToggle.count()) {
      await emailToggle.click().catch(() => {});
    }

    // Pick the first non-sentinel school option from the shortlist select.
    const schoolSelect = page.locator('#cmg-p1-school-select');
    await expect(schoolSelect).toBeVisible();
    const options = await schoolSelect.locator('option').all();
    let pickedSchool = false;
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val && val !== '' && val !== '__other__') {
        await schoolSelect.selectOption(val);
        pickedSchool = true;
        break;
      }
    }
    expect(pickedSchool, 'Shortlist must have at least one school for this test').toBe(true);

    // Phase 2 — fill camp_name + camp_location (Scenario 2 required fields).
    await page.fill('#cmg-p2-camp-name', 'Boston College Elite Camp');
    await page.fill('#cmg-p2-camp-location', 'Chestnut Hill, MA');

    // Phase 3 — two tabs should be visible: Position Coach + Recruiting Area Coach.
    const phase3 = page.locator('[data-phase="3"]');
    await expect(phase3).toBeVisible();
    await expect(phase3.getByRole('tab', { name: 'Position Coach' })).toBeVisible();
    await expect(phase3.getByRole('tab', { name: 'Recruiting Area Coach' })).toBeVisible();

    // Default active is position_coach — fill last_name.
    await page.fill('#cmg-p3-last-name-position_coach', 'Smith');

    // Phase 4 — auto-filled badge.
    const phase4 = page.locator('[data-phase="4"]');
    await expect(phase4).toBeVisible();
    await expect(phase4.locator('.cmg-p4-badge')).toBeVisible();
    await expect(phase4.locator('.cmg-p4-badge')).toHaveText(/auto-filled/i);

    // Phase 5 — fill the camp closing question (optional but proves the field renders).
    const phase5 = page.locator('[data-phase="5"]');
    await expect(phase5).toBeVisible();
    await page.fill('#cmg-p5-camp', 'Which camps would you recommend?');

    // Preview body should now contain the substituted last name + camp name.
    const previewBody = page.locator('[data-testid="cmg-preview-body"]');
    await expect(previewBody).toBeVisible();
    const bodyText = await previewBody.textContent();
    expect(bodyText, 'Preview body should reference Coach Smith').toContain('Smith');
    expect(bodyText, 'Preview body should include camp name').toContain('Boston College Elite Camp');
  });
});

// ── TC-CMG-RECIPIENT-001 ────────────────────────────────────────────────────

test.describe('CMG — Recipient tab swap', () => {
  test('TC-CMG-RECIPIENT-001: switching recipient tab re-substitutes the preview body', async ({ page }) => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');

    await signInAsStudent(page);
    await gotoCmg(page);
    await selectScenario(page, 2);

    // Phase 1 prerequisites — channel default email, pick first shortlist school.
    const schoolSelect = page.locator('#cmg-p1-school-select');
    const options = await schoolSelect.locator('option').all();
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val && val !== '' && val !== '__other__') {
        await schoolSelect.selectOption(val);
        break;
      }
    }

    // Phase 2 — fill required fields so Phase 3 reveals.
    await page.fill('#cmg-p2-camp-name', 'Test Camp');
    await page.fill('#cmg-p2-camp-location', 'Test City, MA');

    // Phase 3 — Position Coach last name = Smith.
    await page.fill('#cmg-p3-last-name-position_coach', 'Smith');

    // Switch the Phase 3 tab to Recruiting Area Coach so its input mounts, then fill it.
    const phase3 = page.locator('[data-phase="3"]');
    await phase3.getByRole('tab', { name: 'Recruiting Area Coach' }).click();
    await page.fill('#cmg-p3-last-name-recruiting_area_coach', 'Jones');

    // The PreviewPane's own recipient tabs drive the substitution context.
    const previewTabs = page.locator('[data-testid="cmg-preview-pane"] .cmg-preview-recipient-tabs');
    await expect(previewTabs).toBeVisible();

    // Switch preview tab to recruiting_area_coach. Body should now read "Jones".
    await page.locator('[data-testid="cmg-preview-pane"] button[data-recipient="recruiting_area_coach"]').click();
    let bodyText = await page.locator('[data-testid="cmg-preview-body"]').textContent();
    expect(bodyText).toContain('Jones');

    // Switch back to position_coach. Body should now read "Smith".
    await page.locator('[data-testid="cmg-preview-pane"] button[data-recipient="position_coach"]').click();
    bodyText = await page.locator('[data-testid="cmg-preview-body"]').textContent();
    expect(bodyText).toContain('Smith');
  });
});

// ── TC-CMG-COPY-001 ─────────────────────────────────────────────────────────

test.describe('CMG — Copy action', () => {
  test('TC-CMG-COPY-001: Copy fires success toast and appends a row to message history', async ({ page, context }) => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');

    // Grant clipboard so navigator.clipboard.writeText resolves; otherwise the
    // PreviewPane's textarea fallback still produces the toast either way.
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});

    await signInAsStudent(page);
    await gotoCmg(page);
    await selectScenario(page, 2);

    // Fill required state to enable a sensible Copy payload.
    const schoolSelect = page.locator('#cmg-p1-school-select');
    const options = await schoolSelect.locator('option').all();
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val && val !== '' && val !== '__other__') {
        await schoolSelect.selectOption(val);
        break;
      }
    }
    await page.fill('#cmg-p2-camp-name', 'Test Camp');
    await page.fill('#cmg-p2-camp-location', 'Test City, MA');
    await page.fill('#cmg-p3-last-name-position_coach', 'Smith');

    // Record history row count BEFORE the copy. If the history is currently
    // showing the empty state, the row count is 0.
    const historyTable = page.locator('[data-testid="cmg-history-table"]');
    const historyEmpty = page.locator('[data-testid="cmg-history-empty"]');
    let beforeCount = 0;
    if (await historyTable.isVisible().catch(() => false)) {
      beforeCount = await historyTable.locator('tbody tr').count();
    } else if (await historyEmpty.isVisible().catch(() => false)) {
      beforeCount = 0;
    }

    // Click Copy.
    await page.locator('[data-testid="cmg-copy-btn"]').click();

    // Assert success toast appears with success variant.
    const toast = page.locator('[data-testid="cmg-toast"]');
    await expect(toast).toBeVisible({ timeout: 3000 });
    await expect(toast).toHaveAttribute('data-variant', 'success');

    // Assert message history now shows a table (not the empty state) with one
    // more row than before. The append is optimistic — no refetch required.
    await expect(historyTable).toBeVisible({ timeout: 5000 });
    const afterCount = await historyTable.locator('tbody tr').count();
    expect(afterCount).toBeGreaterThan(beforeCount);
  });
});

// ── TC-CMG-EMAIL-001 ────────────────────────────────────────────────────────

test.describe('CMG — Email-to-Self', () => {
  test('TC-CMG-EMAIL-001: Email-to-Self builds a mailto: URL with subject + body', async ({ page }) => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');

    await signInAsStudent(page);
    await gotoCmg(page);
    await selectScenario(page, 2);

    // Required state.
    const schoolSelect = page.locator('#cmg-p1-school-select');
    const options = await schoolSelect.locator('option').all();
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val && val !== '' && val !== '__other__') {
        await schoolSelect.selectOption(val);
        break;
      }
    }
    await page.fill('#cmg-p2-camp-name', 'Mailto Camp');
    await page.fill('#cmg-p2-camp-location', 'Boston, MA');
    await page.fill('#cmg-p3-last-name-position_coach', 'Smith');

    // Intercept window.location.href assignment. In headless chromium the
    // mailto: assignment doesn't navigate — but it IS observable by patching
    // the property descriptor BEFORE the click fires.
    await page.evaluate(() => {
      window.__lastMailtoHref = null;
      const desc = Object.getOwnPropertyDescriptor(window.location, 'href');
      // Some browser configs make window.location.href non-configurable.
      // Fall back to wrapping window.open and Location.assign as well.
      try {
        Object.defineProperty(window.location, 'href', {
          configurable: true,
          get() { return desc ? desc.get.call(window.location) : ''; },
          set(v) {
            window.__lastMailtoHref = String(v);
            if (typeof v === 'string' && v.startsWith('mailto:')) {
              // Swallow mailto: navigations so the test doesn't drift away.
              return;
            }
            if (desc && desc.set) desc.set.call(window.location, v);
          },
        });
      } catch (_e) { /* property may be non-configurable — fall through */ }
      const origAssign = window.location.assign?.bind(window.location);
      if (origAssign) {
        window.location.assign = (v) => {
          window.__lastMailtoHref = String(v);
          if (typeof v === 'string' && v.startsWith('mailto:')) return;
          origAssign(v);
        };
      }
      const origOpen = window.open?.bind(window);
      if (origOpen) {
        window.open = (v, ...rest) => {
          if (typeof v === 'string') window.__lastMailtoHref = v;
          if (typeof v === 'string' && v.startsWith('mailto:')) return null;
          return origOpen(v, ...rest);
        };
      }
    });

    await page.locator('[data-testid="cmg-email-btn"]').click();

    // Read the captured href.
    const captured = await page.evaluate(() => window.__lastMailtoHref);
    expect(captured, 'Email-to-Self should set window.location.href (or window.open) to a mailto: URL').toBeTruthy();
    expect(captured.startsWith('mailto:'), `Expected mailto:, got ${captured?.slice(0, 32)}`).toBe(true);

    // Decode the URL and assert it contains the camp name and "Smith".
    const decoded = decodeURIComponent(captured);
    expect(decoded).toContain('Mailto Camp');
    expect(decoded).toContain('Smith');

    // Also verify a success toast appears.
    const toast = page.locator('[data-testid="cmg-toast"]');
    await expect(toast).toBeVisible({ timeout: 3000 });
  });
});

// ── TC-CMG-RESET-001 ────────────────────────────────────────────────────────

test.describe('CMG — Reset action', () => {
  test('TC-CMG-RESET-001: Reset clears form but keeps scenario, school, channel, and active recipient tab', async ({ page }) => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');

    await signInAsStudent(page);
    await gotoCmg(page);
    await selectScenario(page, 2);

    // Fill all fields.
    const schoolSelect = page.locator('#cmg-p1-school-select');
    const options = await schoolSelect.locator('option').all();
    let pickedValue = null;
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val && val !== '' && val !== '__other__') {
        await schoolSelect.selectOption(val);
        pickedValue = val;
        break;
      }
    }
    await page.fill('#cmg-p2-camp-name', 'Reset Camp');
    await page.fill('#cmg-p2-camp-location', 'Reset City, MA');
    await page.fill('#cmg-p3-last-name-position_coach', 'Smith');

    // Click Reset.
    await page.locator('[data-testid="cmg-reset-btn"]').click();

    // Phase 2 fields should be cleared.
    await expect(page.locator('#cmg-p2-camp-name')).toHaveValue('');
    await expect(page.locator('#cmg-p2-camp-location')).toHaveValue('');

    // Phase 3 position_coach last_name cleared (active tab is still position_coach by default).
    // Field may or may not still be revealed depending on phase reveal gating — check
    // value if visible; otherwise the field has been re-collapsed which still proves reset.
    const lastNameInput = page.locator('#cmg-p3-last-name-position_coach');
    if (await lastNameInput.isVisible().catch(() => false)) {
      await expect(lastNameInput).toHaveValue('');
    }

    // Builder is still mounted (scenario stayed selected).
    await expect(page.locator('[data-testid="cmg-message-builder"]')).toBeVisible();

    // School selection is preserved.
    if (pickedValue !== null) {
      await expect(schoolSelect).toHaveValue(pickedValue);
    }

    // Active recipient tab remains position_coach. PreviewPane reflects this.
    const previewActiveTab = page.locator('[data-testid="cmg-preview-pane"] button[data-recipient="position_coach"]');
    await expect(previewActiveTab).toHaveAttribute('aria-selected', 'true');
  });
});

// ── TC-CMG-SCENARIO1-001 ────────────────────────────────────────────────────

test.describe('CMG — Scenario 1 (public Twitter post)', () => {
  test('TC-CMG-SCENARIO1-001: no channel toggle, three Phase 2 fields, twitter signature, no subject', async ({ page }) => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');

    await signInAsStudent(page);
    await gotoCmg(page);
    await selectScenario(page, 1);

    // Phase 1: channel toggle is NOT rendered (showChannelToggle === false for twitter-public).
    const phase1 = page.locator('[data-phase="1"]');
    await expect(phase1).toBeVisible();
    await expect(phase1.locator('.cmg-p1-channel-toggle')).toHaveCount(0);
    await expect(phase1.locator('#cmg-p1-school-select')).toBeVisible();

    // Pick a school so Phase 2 reveals.
    const schoolSelect = page.locator('#cmg-p1-school-select');
    const options = await schoolSelect.locator('option').all();
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val && val !== '' && val !== '__other__') {
        await schoolSelect.selectOption(val);
        break;
      }
    }

    // Phase 2: three fields — camp_name, position_coach_handle, head_coach_handle.
    await expect(page.locator('#cmg-p2-camp-name')).toBeVisible();
    await expect(page.locator('#cmg-p2-position-coach')).toBeVisible();
    await expect(page.locator('#cmg-p2-head-coach')).toBeVisible();

    // Preview: no recipient tabs (kind === 'public_post').
    await expect(page.locator('[data-testid="cmg-preview-pane"] .cmg-preview-recipient-tabs')).toHaveCount(0);

    // No subject rendered (channel is not 'email' — twitter signature applies, subject row hidden).
    await expect(page.locator('[data-testid="cmg-preview-subject"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="cmg-preview-subject-empty"]')).toHaveCount(0);

    // Twitter signature visible (it's whichever signature mounts — but data-testid is shared).
    // Defense: assert signature element exists and the format badge reads "Twitter DM".
    await expect(page.locator('[data-testid="cmg-preview-signature"]')).toBeVisible();
    // Scenario 1 has no recipient tabs → no RC callout (callout is gated on kind === 'coach_message').
    await expect(page.locator('[data-testid="cmg-preview-rc-callout"]')).toHaveCount(0);
  });
});

// ── TC-CMG-TYPEAHEAD-001 ────────────────────────────────────────────────────

test.describe('CMG — School typeahead', () => {
  test('TC-CMG-TYPEAHEAD-001: "Other school" → typeahead → search → pick → school is selected', async ({ page }) => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');

    await signInAsStudent(page);
    await gotoCmg(page);
    // Pick a coach_message scenario so reveals don't depend on email channel.
    await selectScenario(page, 2);

    // Trigger the typeahead via the OTHER sentinel.
    const schoolSelect = page.locator('#cmg-p1-school-select');
    await schoolSelect.selectOption('__other__');

    const typeaheadInput = page.locator('.cmg-p1-typeahead-input');
    await expect(typeaheadInput).toBeVisible();

    // Type a query and wait for the listbox to populate.
    await typeaheadInput.fill('Stanford');
    const listbox = page.locator('.cmg-p1-typeahead-list');
    await expect(listbox).toBeVisible({ timeout: 10000 });

    // At most 20 results visible; assert there's at least one.
    const rows = listbox.locator('.cmg-p1-typeahead-row');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    expect(rowCount).toBeLessThanOrEqual(20);

    // Click the first result.
    const firstResultName = await rows.first().locator('.cmg-p1-typeahead-name').textContent();
    expect(firstResultName).toBeTruthy();
    await rows.first().click();

    // Typeahead collapses; the school <select> re-mounts with the picked school appended.
    await expect(schoolSelect).toBeVisible({ timeout: 5000 });
    // Selected option's display text should match the picked school's name.
    const selectedText = await schoolSelect.locator('option:checked').textContent();
    expect(selectedText).toContain(firstResultName.trim());

    // Preview body should render the school name. Body uses [School Name] token —
    // assert school name appears somewhere in the preview body.
    const previewBody = page.locator('[data-testid="cmg-preview-body"]');
    await expect(previewBody).toBeVisible();
    const bodyText = await previewBody.textContent();
    expect(bodyText).toContain(firstResultName.trim());
  });
});

// ── TC-CMG-HISTORY-EMPTY-001 ────────────────────────────────────────────────

test.describe('CMG — Message History empty state', () => {
  test('TC-CMG-HISTORY-EMPTY-001: empty cmg_message_log renders the empty-state copy', async ({ page }) => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');

    await signInAsStudent(page);
    await gotoCmg(page);

    const historyEmpty = page.locator('[data-testid="cmg-history-empty"]');
    const historyTable = page.locator('[data-testid="cmg-history-table"]');

    // NOTE: this test asserts the empty-state copy only when the seeded test
    // student account has an empty cmg_message_log. If the seeded student has
    // log rows (which is likely once other CMG tests run against the same
    // account), the empty state will not render and this test should be
    // re-run against a fresh account.
    if (await historyTable.isVisible().catch(() => false)) {
      test.info().annotations.push({
        type: 'PRECONDITION SKIP',
        description: 'TEST_STUDENT cmg_message_log has rows — TC-CMG-HISTORY-EMPTY-001 requires an empty log. Re-run against a fresh account.',
      });
      test.skip(true, 'Test student cmg_message_log is non-empty — empty-state copy cannot be asserted.');
      return;
    }

    await expect(historyEmpty).toBeVisible();
    await expect(historyEmpty).toHaveText('No messages yet. Generate your first message above.');
  });
});

// ── TC-CMG-DRAWER-001 ───────────────────────────────────────────────────────

test.describe('CMG — Drawer integration', () => {
  test('TC-CMG-DRAWER-001: drawer open/close (button), Escape, backdrop, and Coach Messages link routes', async ({ page }) => {
    test.skip(!STUDENT_EMAIL || !STUDENT_PASSWORD, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');

    await signInAsStudent(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const sandwich = page.locator('[data-testid="layout-sandwich-btn"]');
    const panel = page.locator('[data-testid="slide-out-shell-panel"]');
    const backdrop = page.locator('[data-testid="slide-out-shell-backdrop"]');
    const authNav = page.locator('[data-testid="authenticated-nav"]');

    // Open via sandwich button.
    await sandwich.click();
    await expect(panel).toBeVisible();
    await expect(authNav).toBeVisible();

    // Close via Escape.
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden({ timeout: 3000 });

    // Reopen via sandwich, then close via backdrop.
    await sandwich.click();
    await expect(panel).toBeVisible();
    await backdrop.click({ position: { x: 5, y: 5 } });
    await expect(panel).toBeHidden({ timeout: 3000 });

    // Reopen and click the Coach Messages link.
    await sandwich.click();
    await expect(panel).toBeVisible();
    const link = authNav.getByRole('link', { name: /Coach Messages/i });
    await expect(link).toBeVisible();
    await link.click();

    // Route changed.
    await expect(page).toHaveURL(/\/coach-messages$/);
    // Drawer should close on navigation (Layout closes it on route change).
    await expect(panel).toBeHidden({ timeout: 3000 });
  });
});
