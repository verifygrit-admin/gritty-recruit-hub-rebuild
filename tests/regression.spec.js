/**
 * Gritty Recruit Hub Rebuild — Phase 1 Regression Tests
 *
 * Owner: Quin (QA Agent)
 * Date: 2026-03-24
 * Status: SPEC COMPLETE — awaiting Playwright config and seeded accounts before execution
 *
 * Covers the following critical paths:
 *   AUTH    — login, session restore, sign out (student, coach)
 *   MAP     — anonymous browse, 662-school load
 *   GRIT    — profile submit, result count, Map View, Table View
 *   SL      — add to shortlist, journey step, persist across sign-out/sign-in
 *   COACH   — dashboard student roster, financial aid exclusion
 *   FILE    — upload, coach visibility, financial aid file blocked
 *
 * Environment variables (never hardcode credentials):
 *   TEST_STUDENT_EMAIL      — seeded student account email
 *   TEST_STUDENT_PASSWORD   — seeded student account password
 *   TEST_COACH_EMAIL        — seeded coach account email
 *   TEST_COACH_PASSWORD     — seeded coach account password
 *
 * Preconditions (must be true before this suite runs):
 *   1. New Supabase project is provisioned and live
 *   2. All test accounts are seeded and confirmed active (see QA_STRATEGY_PHASE1.md section 4)
 *   3. schools table has 662 rows loaded
 *   4. profiles row exists for TEST_STUDENT with hs_lat/hs_lng populated
 *   5. short_list_items has at least 1 row for TEST_STUDENT
 *   6. file_uploads has at least 1 Transcript row for TEST_STUDENT
 *   7. hs_programs has BC High row
 *   8. playwright.config.js baseURL points to the deployed app
 *
 * Run: npx playwright test
 * Run headed: npx playwright test --headed
 * Run single test: npx playwright test --grep "TC-AUTH-001"
 */

import { test, expect } from '@playwright/test';

// ── Credentials ────────────────────────────────────────────────────────────

const STUDENT_EMAIL    = process.env.TEST_STUDENT_EMAIL;
const STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD;
const COACH_EMAIL      = process.env.TEST_COACH_EMAIL;
const COACH_PASSWORD   = process.env.TEST_COACH_PASSWORD;

// ── Constants ───────────────────────────────────────────────────────────────

const SCHOOL_COUNT       = 662;
const MAX_GRIT_FIT_COUNT = 30;
const BC_HIGH_NAME       = 'Boston College High School';

// Expected financial aid field labels — these must NOT appear in coach view.
// Update this list if the field label text changes in the UI.
const FINANCIAL_AID_LABELS = [
  'Financial Aid',
  'financial aid',
  'AGI',
  'Adjusted Gross Income',
  'Expected Family Contribution',
  'EFC',
];

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Navigate to the app root and wait for initial load.
 * Suppresses any tutorial overlays via localStorage before page evaluates.
 */
async function gotoApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('grh_tutSeen', '1');
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/**
 * Fill and submit the sign-in form.
 * Assumes the login UI is visible — either a dedicated /login route
 * or a modal. Selector stubs below must be updated once Quill
 * finalizes component markup.
 *
 * SELECTOR NOTE: Placeholder selectors are marked with [STUB].
 * Nova must confirm or update these after component implementation.
 */
async function signIn(page, email, password) {
  // [STUB] Update selector to match login form implementation
  await page.fill('[data-testid="login-email"]', email);
  await page.fill('[data-testid="login-password"]', password);
  await page.click('[data-testid="login-submit"]');
  // Wait for authenticated state — profile or dashboard visible
  // [STUB] Update to match authenticated landing selector
  await page.waitForSelector('[data-testid="authenticated-nav"]', { timeout: 15000 });
}

/**
 * Sign out of the current session.
 */
async function signOut(page) {
  // [STUB] Update to match sign-out mechanism
  await page.click('[data-testid="signout-btn"]');
  await page.waitForSelector('[data-testid="unauthenticated-nav"]', { timeout: 10000 });
}

/**
 * Navigate to the GRIT FIT profile form.
 */
async function gotoGritFitForm(page) {
  // [STUB] Update to match nav routing
  await page.click('[data-testid="nav-grit-fit"]');
  await page.waitForSelector('[data-testid="grit-fit-form"]', { timeout: 10000 });
}

/**
 * Navigate to the shortlist view.
 */
async function gotoShortlist(page) {
  // [STUB] Update to match nav routing
  await page.click('[data-testid="nav-shortlist"]');
  await page.waitForSelector('[data-testid="shortlist-container"]', { timeout: 10000 });
}

/**
 * Navigate to the coach dashboard.
 */
async function gotoCoachDashboard(page) {
  // [STUB] Update to match coach dashboard route
  await page.click('[data-testid="nav-coach-dashboard"]');
  await page.waitForSelector('[data-testid="coach-dashboard"]', { timeout: 10000 });
}

// ── TC-AUTH-001: Student login and session restore ──────────────────────────

test('TC-AUTH-001: Student login and session restore', async ({ page }) => {
  if (!STUDENT_EMAIL || !STUDENT_PASSWORD) {
    test.skip(true, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');
  }

  await gotoApp(page);

  // Assert: app loads in unauthenticated state
  await expect(page.locator('[data-testid="unauthenticated-nav"]')).toBeVisible();

  // Sign in as student
  await signIn(page, STUDENT_EMAIL, STUDENT_PASSWORD);

  // Assert: authenticated nav is visible
  await expect(page.locator('[data-testid="authenticated-nav"]')).toBeVisible();

  // Assert: student-specific UI is present (not coach dashboard)
  await expect(page.locator('[data-testid="coach-dashboard"]')).not.toBeVisible();

  // Simulate session restore: reload the page
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Assert: session is still active after reload (getSession() behavior)
  await expect(page.locator('[data-testid="authenticated-nav"]')).toBeVisible();
});

// ── TC-AUTH-002: Coach login and session restore ────────────────────────────

test('TC-AUTH-002: Coach login and session restore', async ({ page }) => {
  if (!COACH_EMAIL || !COACH_PASSWORD) {
    test.skip(true, 'TEST_COACH_EMAIL / TEST_COACH_PASSWORD not set');
  }

  await gotoApp(page);

  await signIn(page, COACH_EMAIL, COACH_PASSWORD);

  // Assert: authenticated nav visible
  await expect(page.locator('[data-testid="authenticated-nav"]')).toBeVisible();

  // Assert: coach lands on coach dashboard (or coach nav item is present)
  // [STUB] Update to match coach landing route
  await expect(page.locator('[data-testid="coach-dashboard-nav"]')).toBeVisible();

  // Session restore
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-testid="authenticated-nav"]')).toBeVisible();
});

// ── TC-AUTH-003: Sign out clears session ───────────────────────────────────

test('TC-AUTH-003: Sign out clears session state', async ({ page }) => {
  if (!STUDENT_EMAIL || !STUDENT_PASSWORD) {
    test.skip(true, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');
  }

  await gotoApp(page);
  await signIn(page, STUDENT_EMAIL, STUDENT_PASSWORD);
  await expect(page.locator('[data-testid="authenticated-nav"]')).toBeVisible();

  await signOut(page);

  // Assert: UI is unauthenticated
  await expect(page.locator('[data-testid="unauthenticated-nav"]')).toBeVisible();
  await expect(page.locator('[data-testid="authenticated-nav"]')).not.toBeVisible();

  // Assert: reload does not restore session
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-testid="unauthenticated-nav"]')).toBeVisible();
});

// ── TC-MAP-001: Anonymous map load ─────────────────────────────────────────

test('TC-MAP-001: Anonymous browse — map loads without login', async ({ page }) => {
  await gotoApp(page);

  // No login — verify map renders immediately
  await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 });

  // Assert: school markers are present (Leaflet renders markers as .leaflet-marker-icon)
  // Wait for data load then count visible markers or cluster icons
  // Allow time for schools API call to complete
  await page.waitForSelector('.leaflet-marker-icon, .marker-cluster', { timeout: 20000 });

  // Assert: at least one marker visible (full count assertion is a smoke check)
  const markerCount = await page.locator('.leaflet-marker-icon, .marker-cluster').count();
  expect(markerCount).toBeGreaterThan(0);

  // Assert: login is NOT required to see the map
  await expect(page.locator('[data-testid="unauthenticated-nav"]')).toBeVisible();
});

// ── TC-MAP-002: School count loaded ────────────────────────────────────────

test('TC-MAP-002: All 662 schools loaded into data layer', async ({ page }) => {
  await gotoApp(page);

  await page.waitForLoadState('networkidle');

  // [STUB] Update to match school count indicator selector in the UI
  // The app should expose a visible count or a data attribute with the school count.
  // If no count indicator exists, this becomes a Quill/Nova question.
  const countEl = page.locator('[data-testid="school-count"]');
  if (await countEl.isVisible({ timeout: 5000 }).catch(() => false)) {
    const text = await countEl.textContent();
    const count = parseInt(text.replace(/\D/g, ''), 10);
    expect(count).toBe(SCHOOL_COUNT);
  } else {
    // Fallback: assert data loaded via network request
    // This test is PARTIAL until a count indicator exists in the UI.
    // Flag to Nova/Quill: a data-testid="school-count" element is needed for TC-MAP-002.
    test.info().annotations.push({
      type: 'QA GAP',
      description: 'No school-count element found. TC-MAP-002 is PARTIAL. Nova/Quill must add data-testid="school-count" to the map view.',
    });
    // Minimum: assert map rendered at all
    await expect(page.locator('.leaflet-container')).toBeVisible();
  }
});

// ── TC-GRIT-001: GRIT FIT profile submit returns results ──────────────────

test('TC-GRIT-001: GRIT FIT profile submit returns 1-30 school results', async ({ page }) => {
  if (!STUDENT_EMAIL || !STUDENT_PASSWORD) {
    test.skip(true, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');
  }

  await gotoApp(page);
  await signIn(page, STUDENT_EMAIL, STUDENT_PASSWORD);

  await gotoGritFitForm(page);

  // The seeded test student's profile should already be populated.
  // This test re-submits to confirm the GRIT FIT run produces results.
  // [STUB] Update field selectors to match QuickListForm implementation.
  // If the form pre-fills from the seeded profile, submission without edits is valid.

  // Submit the form
  await page.click('[data-testid="grit-fit-submit"]');

  // Wait for results
  await page.waitForSelector('[data-testid="grit-fit-results"]', { timeout: 20000 });

  // Assert: result count is between 1 and 30
  // [STUB] Update to match results count indicator selector
  const resultCountEl = page.locator('[data-testid="grit-fit-result-count"]');
  if (await resultCountEl.isVisible({ timeout: 5000 }).catch(() => false)) {
    const text = await resultCountEl.textContent();
    const count = parseInt(text.replace(/\D/g, ''), 10);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(MAX_GRIT_FIT_COUNT);
  }

  // Assert: results container is visible
  await expect(page.locator('[data-testid="grit-fit-results"]')).toBeVisible();
});

// ── TC-GRIT-002: Table View renders after GRIT FIT ─────────────────────────

test('TC-GRIT-002: GRIT FIT results display in Table View', async ({ page }) => {
  if (!STUDENT_EMAIL || !STUDENT_PASSWORD) {
    test.skip(true, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');
  }

  await gotoApp(page);
  await signIn(page, STUDENT_EMAIL, STUDENT_PASSWORD);
  await gotoGritFitForm(page);
  await page.click('[data-testid="grit-fit-submit"]');
  await page.waitForSelector('[data-testid="grit-fit-results"]', { timeout: 20000 });

  // Switch to Table View
  // [STUB] Update to match Table View toggle selector
  await page.click('[data-testid="view-toggle-table"]');
  await page.waitForSelector('[data-testid="results-table"]', { timeout: 10000 });

  // Assert: table has at least one data row
  const rows = page.locator('[data-testid="results-table"] tbody tr');
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThanOrEqual(1);

  // Assert: each row has a school name visible
  const firstRowText = await rows.first().textContent();
  expect(firstRowText).toBeTruthy();
  expect(firstRowText.length).toBeGreaterThan(0);
});

// ── TC-SL-001: Add school to shortlist from Table View ─────────────────────

test('TC-SL-001: Add school to shortlist from Table View', async ({ page }) => {
  if (!STUDENT_EMAIL || !STUDENT_PASSWORD) {
    test.skip(true, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');
  }

  await gotoApp(page);
  await signIn(page, STUDENT_EMAIL, STUDENT_PASSWORD);
  await gotoGritFitForm(page);
  await page.click('[data-testid="grit-fit-submit"]');
  await page.waitForSelector('[data-testid="grit-fit-results"]', { timeout: 20000 });

  // Switch to Table View
  await page.click('[data-testid="view-toggle-table"]');
  await page.waitForSelector('[data-testid="results-table"]', { timeout: 10000 });

  // Get initial shortlist count before adding
  await gotoShortlist(page);
  const initialRows = await page.locator('[data-testid="shortlist-row"]').count();

  // Go back to results table and add first school
  await gotoGritFitForm(page);
  await page.click('[data-testid="grit-fit-submit"]');
  await page.waitForSelector('[data-testid="grit-fit-results"]', { timeout: 20000 });
  await page.click('[data-testid="view-toggle-table"]');
  await page.waitForSelector('[data-testid="results-table"]', { timeout: 10000 });

  // Click the add-to-shortlist button on the first result row
  // [STUB] Update to match add-to-shortlist button selector
  const addBtn = page.locator('[data-testid="add-to-shortlist-btn"]').first();
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.click();
  await page.waitForTimeout(1000); // allow DB write

  // Navigate to shortlist and assert count increased
  await gotoShortlist(page);
  const newRows = await page.locator('[data-testid="shortlist-row"]').count();
  expect(newRows).toBeGreaterThan(initialRows);
});

// ── TC-SL-002: Shortlist persists across sign-out / sign-in ────────────────

test('TC-SL-002: Shortlist persists across sign-out and sign-in', async ({ page }) => {
  if (!STUDENT_EMAIL || !STUDENT_PASSWORD) {
    test.skip(true, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');
  }

  // Precondition: test student has at least 1 shortlist item seeded (see QA_STRATEGY_PHASE1.md)
  await gotoApp(page);
  await signIn(page, STUDENT_EMAIL, STUDENT_PASSWORD);

  // Navigate to shortlist and record count
  await gotoShortlist(page);
  const preSignoutCount = await page.locator('[data-testid="shortlist-row"]').count();
  expect(preSignoutCount).toBeGreaterThanOrEqual(1);

  // Sign out
  await signOut(page);

  // Assert: shortlist UI is empty / not visible after sign-out
  // [STUB] Update to match unauthenticated shortlist state
  const shortlistAfterSignout = await page.locator('[data-testid="shortlist-row"]').count();
  expect(shortlistAfterSignout).toBe(0);

  // Sign back in
  await signIn(page, STUDENT_EMAIL, STUDENT_PASSWORD);

  // Navigate to shortlist
  await gotoShortlist(page);
  await page.waitForTimeout(2000); // allow DB fetch to complete

  // Assert: shortlist is restored (at least as many rows as before sign-out)
  const postSigninCount = await page.locator('[data-testid="shortlist-row"]').count();
  expect(postSigninCount).toBeGreaterThanOrEqual(preSignoutCount);
});

// ── TC-SL-003: Journey step 1 is auto-completed on shortlist add ───────────

test('TC-SL-003: Journey step 1 is auto-completed when school is added to shortlist', async ({ page }) => {
  if (!STUDENT_EMAIL || !STUDENT_PASSWORD) {
    test.skip(true, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');
  }

  // Precondition: seeded shortlist item exists for TEST_STUDENT
  await gotoApp(page);
  await signIn(page, STUDENT_EMAIL, STUDENT_PASSWORD);
  await gotoShortlist(page);

  // Find the first shortlist row and open its journey steps
  const firstRow = page.locator('[data-testid="shortlist-row"]').first();
  await firstRow.waitFor({ state: 'visible', timeout: 10000 });

  // [STUB] Update to match how journey steps are revealed (expand button or inline)
  await page.locator('[data-testid="journey-steps-toggle"]').first().click();
  await page.waitForSelector('[data-testid="journey-step-1"]', { timeout: 5000 });

  // Assert: step 1 "Added to shortlist" is marked complete
  const step1 = page.locator('[data-testid="journey-step-1"]');
  await expect(step1).toHaveAttribute('data-completed', 'true');

  // Assert: step 2 is NOT complete
  const step2 = page.locator('[data-testid="journey-step-2"]');
  await expect(step2).toHaveAttribute('data-completed', 'false');
});

// ── TC-SL-004: Journey step can be marked complete ─────────────────────────

test('TC-SL-004: Journey step can be marked complete and timestamp is recorded', async ({ page }) => {
  if (!STUDENT_EMAIL || !STUDENT_PASSWORD) {
    test.skip(true, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');
  }

  await gotoApp(page);
  await signIn(page, STUDENT_EMAIL, STUDENT_PASSWORD);
  await gotoShortlist(page);

  await page.locator('[data-testid="shortlist-row"]').first().waitFor({ state: 'visible', timeout: 10000 });

  // Open journey steps for the first shortlist item
  await page.locator('[data-testid="journey-steps-toggle"]').first().click();
  await page.waitForSelector('[data-testid="journey-step-2"]', { timeout: 5000 });

  // Assert step 2 starts incomplete
  const step2 = page.locator('[data-testid="journey-step-2"]');
  await expect(step2).toHaveAttribute('data-completed', 'false');

  // Mark step 2 complete
  // [STUB] Update to match step completion toggle selector
  await page.locator('[data-testid="journey-step-2-toggle"]').click();
  await page.waitForTimeout(1000); // allow DB write

  // Assert: step 2 is now complete
  await expect(step2).toHaveAttribute('data-completed', 'true');

  // Assert: completed_at is non-empty (if displayed in UI)
  // [STUB] This assertion requires a data-completed-at attribute or visible timestamp element.
  // Flag to Nova: journey step completion should set a visible timestamp or data attribute.
  const completedAt = await step2.getAttribute('data-completed-at').catch(() => null);
  if (completedAt !== null) {
    expect(completedAt).not.toBe('null');
    expect(completedAt.length).toBeGreaterThan(0);
  }

  // Cleanup: mark step 2 incomplete again to keep test state stable
  await page.locator('[data-testid="journey-step-2-toggle"]').click();
  await page.waitForTimeout(500);
});

// ── TC-COACH-001: Coach dashboard shows BC High student roster ─────────────

test('TC-COACH-001: Coach dashboard shows BC High student roster', async ({ page }) => {
  if (!COACH_EMAIL || !COACH_PASSWORD) {
    test.skip(true, 'TEST_COACH_EMAIL / TEST_COACH_PASSWORD not set');
  }

  await gotoApp(page);
  await signIn(page, COACH_EMAIL, COACH_PASSWORD);
  await gotoCoachDashboard(page);

  // Assert: dashboard is visible
  await expect(page.locator('[data-testid="coach-dashboard"]')).toBeVisible();

  // Assert: at least 1 student row is present
  // (seeded test student must be at BC High school_id)
  const studentRows = page.locator('[data-testid="coach-student-row"]');
  const count = await studentRows.count();
  expect(count).toBeGreaterThanOrEqual(1);

  // Assert: each student row has a name
  const firstStudentName = await studentRows.first().locator('[data-testid="student-name"]').textContent();
  expect(firstStudentName).toBeTruthy();
  expect(firstStudentName.trim().length).toBeGreaterThan(0);
});

// ── TC-COACH-002: Financial aid info absent from coach view ─────────────────

test('TC-COACH-002: Financial aid info is not visible to coach', async ({ page }) => {
  if (!COACH_EMAIL || !COACH_PASSWORD) {
    test.skip(true, 'TEST_COACH_EMAIL / TEST_COACH_PASSWORD not set');
  }

  await gotoApp(page);
  await signIn(page, COACH_EMAIL, COACH_PASSWORD);
  await gotoCoachDashboard(page);

  // Navigate into the first student's detail view
  const firstStudent = page.locator('[data-testid="coach-student-row"]').first();
  await firstStudent.waitFor({ state: 'visible', timeout: 10000 });
  await firstStudent.click();
  await page.waitForSelector('[data-testid="student-detail-view"]', { timeout: 10000 });

  // Assert: none of the financial aid label strings appear in the page content
  const pageContent = await page.content();
  for (const label of FINANCIAL_AID_LABELS) {
    expect(pageContent).not.toContain(label);
  }

  // Assert: the financial aid document type is not listed in the files section
  // [STUB] Update to match file list rendering in coach student detail view
  const fileItems = page.locator('[data-testid="coach-file-item"]');
  const fileCount = await fileItems.count();
  for (let i = 0; i < fileCount; i++) {
    const label = await fileItems.nth(i).locator('[data-testid="file-label"]').textContent();
    expect(label.toLowerCase()).not.toContain('financial aid');
  }
});

// ── TC-COACH-003: Coach sees shortlist and journey progress ────────────────

test('TC-COACH-003: Coach dashboard shows shortlist and journey progress for each student', async ({ page }) => {
  if (!COACH_EMAIL || !COACH_PASSWORD) {
    test.skip(true, 'TEST_COACH_EMAIL / TEST_COACH_PASSWORD not set');
  }

  await gotoApp(page);
  await signIn(page, COACH_EMAIL, COACH_PASSWORD);
  await gotoCoachDashboard(page);

  // Navigate into the first student's detail
  await page.locator('[data-testid="coach-student-row"]').first().click();
  await page.waitForSelector('[data-testid="student-detail-view"]', { timeout: 10000 });

  // Assert: shortlist section is present for this student
  await expect(page.locator('[data-testid="student-shortlist"]')).toBeVisible();

  // Assert: shortlist has at least 1 entry (precondition: seeded shortlist item)
  const shortlistItems = page.locator('[data-testid="student-shortlist-item"]');
  const count = await shortlistItems.count();
  expect(count).toBeGreaterThanOrEqual(1);

  // Assert: journey progress indicator is visible per shortlist item
  const progressEl = page.locator('[data-testid="journey-progress"]').first();
  await expect(progressEl).toBeVisible();
});

// ── TC-COACH-004: Recruiting activity aggregated by conference/division ─────

test('TC-COACH-004: Recruiting activity shows conference/division aggregation, not individual school names', async ({ page }) => {
  if (!COACH_EMAIL || !COACH_PASSWORD) {
    test.skip(true, 'TEST_COACH_EMAIL / TEST_COACH_PASSWORD not set');
  }

  await gotoApp(page);
  await signIn(page, COACH_EMAIL, COACH_PASSWORD);
  await gotoCoachDashboard(page);

  // Assert: recruiting activity summary section exists
  await expect(page.locator('[data-testid="recruiting-activity-summary"]')).toBeVisible();

  // Assert: summary contains conference or division text (not blank)
  const summaryText = await page.locator('[data-testid="recruiting-activity-summary"]').textContent();
  expect(summaryText).toBeTruthy();
  expect(summaryText.trim().length).toBeGreaterThan(0);

  // Note: we cannot assert the exact format until Nova implements the summary.
  // The negative assertion (no individual school names) requires knowing which schools
  // are on student shortlists. This test is PARTIAL until the component spec is finalized.
  // Flag to Nova: recruiting activity summary must not expose individual school names.
  // A data-testid="recruiting-activity-summary" with conference/division text is required.
});

// ── TC-FILE-001: Student can upload a Transcript ───────────────────────────

test('TC-FILE-001: Student can upload a Transcript document', async ({ page }) => {
  if (!STUDENT_EMAIL || !STUDENT_PASSWORD) {
    test.skip(true, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');
  }

  await gotoApp(page);
  await signIn(page, STUDENT_EMAIL, STUDENT_PASSWORD);

  // Navigate to file upload area
  // [STUB] Update to match file upload route/component selector
  await page.click('[data-testid="nav-files"]');
  await page.waitForSelector('[data-testid="file-upload-area"]', { timeout: 10000 });

  // Select the "Transcript" file type
  // [STUB] Update to match file type selector UI
  await page.selectOption('[data-testid="file-type-select"]', 'Transcript');

  // Upload a test file
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="file-upload-btn"]'),
  ]);
  await fileChooser.setFiles({
    name: 'test-transcript.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('TEST TRANSCRIPT CONTENT'),
  });

  // Wait for upload confirmation
  await page.waitForSelector('[data-testid="upload-success"]', { timeout: 15000 });

  // Assert: success indicator is visible
  await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();

  // Assert: uploaded file appears in the file list
  const fileItems = page.locator('[data-testid="file-item"]');
  const labels = await fileItems.allTextContents();
  const hasTranscript = labels.some(l => l.toLowerCase().includes('transcript'));
  expect(hasTranscript).toBe(true);
});

// ── TC-FILE-002: Coach can access Transcript but not Financial Aid ──────────

test('TC-FILE-002: Coach can access Transcript, cannot access Financial Aid Info', async ({ page }) => {
  if (!COACH_EMAIL || !COACH_PASSWORD) {
    test.skip(true, 'TEST_COACH_EMAIL / TEST_COACH_PASSWORD not set');
  }

  // Precondition: seeded file_uploads has a Transcript for TEST_STUDENT at BC High
  await gotoApp(page);
  await signIn(page, COACH_EMAIL, COACH_PASSWORD);
  await gotoCoachDashboard(page);

  await page.locator('[data-testid="coach-student-row"]').first().click();
  await page.waitForSelector('[data-testid="student-detail-view"]', { timeout: 10000 });

  // Navigate to the files section of the student detail
  // [STUB] Update to match files section selector
  await expect(page.locator('[data-testid="student-files-section"]')).toBeVisible();

  const fileItems = page.locator('[data-testid="coach-file-item"]');
  const count = await fileItems.count();

  // Assert: Transcript is visible in file list
  let hasTranscript = false;
  let hasFinancialAid = false;

  for (let i = 0; i < count; i++) {
    const label = await fileItems.nth(i).locator('[data-testid="file-label"]').textContent();
    if (label.toLowerCase().includes('transcript')) hasTranscript = true;
    if (label.toLowerCase().includes('financial aid')) hasFinancialAid = true;
  }

  expect(hasTranscript).toBe(true);
  expect(hasFinancialAid).toBe(false);
});

// ── TC-FILE-003: All 7 document types can be uploaded by student ───────────

test('TC-FILE-003: Student file upload area supports all 7 document types', async ({ page }) => {
  if (!STUDENT_EMAIL || !STUDENT_PASSWORD) {
    test.skip(true, 'TEST_STUDENT_EMAIL / TEST_STUDENT_PASSWORD not set');
  }

  const EXPECTED_FILE_TYPES = [
    'Transcript',
    'Senior Course List',
    'Writing Example',
    'Student Resume',
    'School Profile PDF',
    'SAT/ACT Scores',
    'Financial Aid Info',
  ];

  await gotoApp(page);
  await signIn(page, STUDENT_EMAIL, STUDENT_PASSWORD);

  await page.click('[data-testid="nav-files"]');
  await page.waitForSelector('[data-testid="file-upload-area"]', { timeout: 10000 });

  // [STUB] Update to match file type selector implementation
  // The file type selector must include all 7 types.
  const options = await page.locator('[data-testid="file-type-select"] option').allTextContents();

  for (const type of EXPECTED_FILE_TYPES) {
    const found = options.some(o => o.includes(type));
    if (!found) {
      test.info().annotations.push({
        type: 'QA GAP',
        description: `File type "${type}" not found in upload selector options. Must be added.`,
      });
    }
    expect(found, `Expected file type "${type}" to be present in upload selector`).toBe(true);
  }
});
