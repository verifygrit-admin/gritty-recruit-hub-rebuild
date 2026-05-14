/**
 * Sprint 027 Phase 3 — Colleges entity positive smoke (6 checks + Q5 guard).
 *
 * Pattern (mirrored by other entity specs):
 *   3.S.<entity>.1 — Load view; columns render; toggle highlights.
 *   3.S.<entity>.2 — Select rows (≤10); selection counter updates.
 *   3.S.<entity>.3 — Edit one non-protected field on 1 row.
 *   3.S.<entity>.4 — Edit one non-protected field across multiple rows.
 *   3.S.<entity>.5 — Click Update → ReviewDiffPanel renders correct diffs.
 *   3.S.<entity>.6 — Click Confirm → DB row + audit row verified.
 *   3.S.<entity>.NO-CREATE-DELETE — Q5 hides Create + per-row Delete UI.
 *
 * Side effects: writes to public.schools via admin-update-account EF, then
 * restores the original column values to keep the DB clean for subsequent
 * test runs.
 *
 * Entity differences vs Students:
 *  - PK is `unitid` (INTEGER). The selectRows helper returns string ids; we
 *    parseInt(id, 10) before passing to dbAssertCol / dbRestoreCol.
 *  - No PDS hint test (colleges is not a PDS-bearing entity).
 *  - Standard flat diff (not nested).
 *  - cfg.create_enabled = false, cfg.delete_enabled = false → Q5 must hide
 *    the Create button and per-row Delete column.
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

const ENTITY = 'colleges';
const TABLE = 'schools';
const PK = 'unitid'; // INTEGER PK — parseInt incoming string ids before DB calls
const TARGET_COL = 'athletics_email'; // text, in editable whitelist, benign
const TARGET_VALUE = 'sprint027-smoke@example.test';

test.describe('@sprint-027 Colleges positive smoke', () => {
  let originalValues = {}; // { unitid: { athletics_email: <prev> } } for cleanup

  test.afterAll(async () => {
    for (const [id, cols] of Object.entries(originalValues)) {
      for (const [col, val] of Object.entries(cols)) {
        await dbRestoreCol(TABLE, PK, parseInt(id, 10), col, val);
      }
    }
  });

  test('3.S.colleges.1 load view and render columns', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    // Toggle button styled active
    const activeBtn = page.locator(`[data-testid="account-updates-toggle-${ENTITY}"]`);
    await expect(activeBtn).toBeVisible();
    // Row count display
    await expect(page.locator('[data-testid="row-count"]')).toContainText(/total rows/);
    await snap(page, 'colleges-1-loaded');
  });

  test('3.S.colleges.2 select up to 10 rows', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 10);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(10);
    const counter = page.locator('[data-testid="selection-count"]');
    await expect(counter).toContainText(`${ids.length} of 10 selected`);
    await snap(page, 'colleges-2-selected');
  });

  test('3.S.colleges.3 edit one field on 1 row, drawer opens', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 1);
    expect(ids.length).toBe(1);
    await openBulkEdit(page);
    await setFieldOnRow(page, ids[0], TARGET_COL, TARGET_VALUE);
    // diff counter should update to 1
    await expect(page.locator('[data-testid="bulk-edit-drawer"]')).toContainText('1 row changed');
    await snap(page, 'colleges-3-one-row-edited');
  });

  test('3.S.colleges.4 edit one field across 3 rows', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 3);
    expect(ids.length).toBe(3);
    await openBulkEdit(page);
    for (const id of ids) {
      await setFieldOnRow(page, id, TARGET_COL, `sprint027-${id}@example.test`);
    }
    await expect(page.locator('[data-testid="bulk-edit-drawer"]')).toContainText('3 rows changed');
    await snap(page, 'colleges-4-multi-row-edited');
  });

  test('3.S.colleges.5 review diff panel renders correctly', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 2);
    await openBulkEdit(page);
    await setFieldOnRow(page, ids[0], TARGET_COL, `sprint027-rv-A-${ids[0]}@example.test`);
    await setFieldOnRow(page, ids[1], TARGET_COL, `sprint027-rv-B-${ids[1]}@example.test`);
    await clickUpdateAndReview(page);
    const panel = page.locator('[data-testid="review-diff-panel"]');
    await expect(panel).toContainText('Review changes (2 rows)');
    await expect(panel).toContainText(TARGET_COL);
    await expect(panel).toContainText(`sprint027-rv-A-${ids[0]}@example.test`);
    await expect(panel).toContainText(`sprint027-rv-B-${ids[1]}@example.test`);
    await snap(page, 'colleges-5-review-diff');
  });

  test('3.S.colleges.6 confirm + submit + DB verify + audit verify', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 1);
    const targetId = ids[0]; // string from data-testid
    const targetIdInt = parseInt(targetId, 10); // integer for DB calls

    // Capture original value for cleanup
    const { data: pre } = await serviceClient()
      .from(TABLE)
      .select(`${PK}, ${TARGET_COL}`)
      .eq(PK, targetIdInt)
      .maybeSingle();
    originalValues[targetId] = { [TARGET_COL]: pre?.[TARGET_COL] ?? null };

    const since = new Date().toISOString();
    const newValue = `sprint027-${Date.now()}@example.test`;

    await openBulkEdit(page);
    await setFieldOnRow(page, targetId, TARGET_COL, newValue);
    await clickUpdateAndReview(page);
    await confirmAndSubmit(page);

    // DB verify (integer PK)
    await dbAssertCol(TABLE, PK, targetIdInt, TARGET_COL, newValue);
    // Audit verify
    await dbAssertAuditRow({
      table_name: TABLE,
      row_id: targetId, // audit row_id is text; pass string form
      field: TARGET_COL,
      expectedNew: newValue,
      since,
    });
    await snap(page, 'colleges-6-submitted');
  });

  // Q5 guard: cfg.create_enabled = false, cfg.delete_enabled = false.
  test('3.S.colleges.NO-CREATE-DELETE Q5 hides Create + Delete UI', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    // Create button is NOT in the action bar
    expect(await page.locator('[data-testid="open-create-row"]').count()).toBe(0);
    // Delete buttons are NOT rendered per-row
    expect(await page.locator('[data-testid^="row-delete-"]').count()).toBe(0);
  });
});
