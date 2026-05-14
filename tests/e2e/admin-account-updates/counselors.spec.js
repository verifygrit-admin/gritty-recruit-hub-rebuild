/**
 * Sprint 027 Phase 3 — Counselors entity positive smoke (6 checks + LINK).
 *
 * Pattern (mirrored from students.spec.js):
 *   3.S.<entity>.1 — Load view; columns render; toggle highlights.
 *   3.S.<entity>.2 — Select rows (≤4 live); selection counter updates.
 *   3.S.<entity>.3 — Edit one non-protected field on 1 row.
 *   3.S.<entity>.4 — Edit one non-protected field across multiple rows.
 *   3.S.<entity>.5 — Click Update → ReviewDiffPanel renders correct diffs.
 *   3.S.<entity>.6 — Click Confirm → DB row + audit row verified.
 *   3.S.<entity>.LINK — Link-table section header renders correctly.
 *
 * Side effects: writes to public.users via admin-update-account EF, then
 * restores the original column values to keep the DB clean for subsequent
 * test runs.
 *
 * Counselors specifics:
 *   - TABLE = public.users; PK = id; live row count = 4.
 *   - Link table is hs_counselor_schools (NOT hs_coach_schools).
 *   - Link whitelist has only hs_program_id (no is_head_coach).
 */

import { test, expect } from '@playwright/test';
import {
  gotoAccountUpdates,
  switchEntity,
  selectRows,
  openBulkEdit,
  setFieldOnRow,
  clickUpdateAndReview,
  confirmAndSubmit,
  serviceClient,
  dbAssertCol,
  dbAssertAuditRow,
  dbRestoreCol,
  snap,
} from './_helpers/nav.js';

const ENTITY = 'counselors';
const TABLE = 'users';
const PK = 'id';
const TARGET_COL = 'full_name'; // safe non-protected column for round-trip
const TARGET_VALUE = 'Sprint027 Smoke';

test.describe('@sprint-027 Counselors positive smoke', () => {
  let originalValues = {}; // { id: { full_name: <prev> } } for cleanup

  test.afterAll(async () => {
    for (const [id, cols] of Object.entries(originalValues)) {
      for (const [col, val] of Object.entries(cols)) {
        await dbRestoreCol(TABLE, PK, id, col, val);
      }
    }
  });

  test('3.S.counselors.1 load view and render columns', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    // Toggle button styled active
    const activeBtn = page.locator(`[data-testid="account-updates-toggle-${ENTITY}"]`);
    await expect(activeBtn).toBeVisible();
    // Row count display
    await expect(page.locator('[data-testid="row-count"]')).toContainText(/total rows/);
    await snap(page, 'counselors-1-loaded');
  });

  test('3.S.counselors.2 select up to 4 rows', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 4);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(4);
    const counter = page.locator('[data-testid="selection-count"]');
    await expect(counter).toContainText(`${ids.length} of 10 selected`);
    await snap(page, 'counselors-2-selected');
  });

  test('3.S.counselors.3 edit one field on 1 row, drawer opens', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 1);
    expect(ids.length).toBe(1);
    await openBulkEdit(page);
    await setFieldOnRow(page, ids[0], TARGET_COL, TARGET_VALUE);
    // diff counter should update to 1
    await expect(page.locator('[data-testid="bulk-edit-drawer"]')).toContainText('1 row changed');
    await snap(page, 'counselors-3-one-row-edited');
  });

  test('3.S.counselors.4 edit one field across 3 rows', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 3);
    expect(ids.length).toBe(3);
    await openBulkEdit(page);
    for (const id of ids) {
      await setFieldOnRow(page, id, TARGET_COL, `${TARGET_VALUE}-${id.slice(0, 4)}`);
    }
    await expect(page.locator('[data-testid="bulk-edit-drawer"]')).toContainText('3 rows changed');
    await snap(page, 'counselors-4-multi-row-edited');
  });

  test('3.S.counselors.5 review diff panel renders correctly', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 2);
    await openBulkEdit(page);
    await setFieldOnRow(page, ids[0], TARGET_COL, `${TARGET_VALUE}-rv-A`);
    await setFieldOnRow(page, ids[1], TARGET_COL, `${TARGET_VALUE}-rv-B`);
    await clickUpdateAndReview(page);
    const panel = page.locator('[data-testid="review-diff-panel"]');
    await expect(panel).toContainText('Review changes (2 rows)');
    await expect(panel).toContainText(TARGET_COL);
    await expect(panel).toContainText(`${TARGET_VALUE}-rv-A`);
    await expect(panel).toContainText(`${TARGET_VALUE}-rv-B`);
    await snap(page, 'counselors-5-review-diff');
  });

  test('3.S.counselors.6 confirm + submit + DB verify + audit verify', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 1);
    const targetId = ids[0];

    // Capture original value for cleanup
    const { data: pre } = await serviceClient().from(TABLE).select(`${PK}, ${TARGET_COL}`).eq(PK, targetId).maybeSingle();
    originalValues[targetId] = { [TARGET_COL]: pre?.[TARGET_COL] ?? null };

    const since = new Date().toISOString();
    const newValue = `${TARGET_VALUE}-${Date.now()}`;

    await openBulkEdit(page);
    await setFieldOnRow(page, targetId, TARGET_COL, newValue);
    await clickUpdateAndReview(page);
    await confirmAndSubmit(page);

    // DB verify
    await dbAssertCol(TABLE, PK, targetId, TARGET_COL, newValue);
    // Audit verify
    await dbAssertAuditRow({
      table_name: TABLE,
      row_id: targetId,
      field: TARGET_COL,
      expectedNew: newValue,
      since,
    });
    await snap(page, 'counselors-6-submitted');
  });

  // Link-table section header renders correctly (Counselors uses hs_counselor_schools).
  test('3.S.counselors.LINK link-table section header renders', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    await selectRows(page, 1);
    await openBulkEdit(page);
    await expect(page.locator('[data-testid="bulk-edit-drawer"]')).toContainText('School link (hs_counselor_schools)');
  });
});
