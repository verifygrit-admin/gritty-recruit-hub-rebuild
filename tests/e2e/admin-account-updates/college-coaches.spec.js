/**
 * Sprint 027 Phase 3 — College Coaches entity positive smoke (6 + CREATE + DELETE).
 *
 * Pattern (mirrored from students.spec.js):
 *   3.S.<entity>.1 — Load view; columns render; toggle highlights.
 *   3.S.<entity>.2 — Select rows (≤5); selection counter updates.
 *   3.S.<entity>.3 — Edit one non-protected field on 1 row.
 *   3.S.<entity>.4 — Edit one non-protected field across 3 rows.
 *   3.S.<entity>.5 — Click Update → ReviewDiffPanel renders correct diffs.
 *   3.S.<entity>.6 — Click Confirm → DB row + audit row verified.
 *   3.S.<entity>.CREATE — "+ Create new" → fill required → Submit → row appears + DB verify.
 *   3.S.<entity>.DELETE — Click row Delete → modal Confirm → row gone + deleted_at IS NOT NULL.
 *
 * Live row count is 0 — beforeAll seeds 5 rows directly via service client.
 * afterAll hard-deletes seeded + any 'Phase3 Created' rows to keep DB clean.
 *
 * Q5 entity config: cfg.create_enabled = true, cfg.delete_enabled = true.
 * Flat schema (no nested-diff, no PDS hint test, no link section).
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
  dbHardDelete,
  snap,
} from './_helpers/nav.js';

const ENTITY = 'college_coaches';
const TABLE = 'college_coaches';
const PK = 'id';
const TARGET_COL = 'title'; // non-required, editable text col
const TARGET_VALUE = '@sprint027-cc-smoke';
const SEED_UNITID = 100654; // valid existing schools.unitid (Alabama-area)
const SEED_NAME_PREFIX = 'Phase3 Smoke Coach';
const CREATED_NAME = 'Phase3 Created Coach';

const seededIds = []; // module-level capture

test.describe('@sprint-027 College Coaches positive smoke', () => {
  let originalValues = {}; // { id: { title: <prev> } } for cleanup

  test.beforeAll(async () => {
    // Bulk-INSERT 5 seed rows directly (faster than EF for setup).
    const rowsToInsert = [];
    for (let i = 1; i <= 5; i++) {
      rowsToInsert.push({
        unitid: SEED_UNITID,
        name: `${SEED_NAME_PREFIX} ${i}`,
      });
    }
    const { data, error } = await serviceClient()
      .from(TABLE)
      .insert(rowsToInsert)
      .select(PK);
    if (error) throw new Error(`seed insert failed: ${error.message}`);
    for (const row of data) seededIds.push(row[PK]);
  });

  test.afterAll(async () => {
    // Restore any modified columns first (best-effort; rows may already be hard-deleted).
    for (const [id, cols] of Object.entries(originalValues)) {
      for (const [col, val] of Object.entries(cols)) {
        try {
          await dbRestoreCol(TABLE, PK, id, col, val);
        } catch (_) {
          /* row may have been hard-deleted already; ignore */
        }
      }
    }
    // Hard-delete the 5 seeded rows.
    for (const id of seededIds) {
      try {
        await dbHardDelete(TABLE, PK, id);
      } catch (_) {
        /* ignore — may already be gone */
      }
    }
    // Hard-delete any 'Phase3 Created' rows produced by CREATE test.
    const { data: createdRows } = await serviceClient()
      .from(TABLE)
      .select(PK)
      .like('name', 'Phase3 Created%');
    if (createdRows) {
      for (const row of createdRows) {
        try {
          await dbHardDelete(TABLE, PK, row[PK]);
        } catch (_) {
          /* ignore */
        }
      }
    }
  });

  test('3.S.college_coaches.1 load view and render columns', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const activeBtn = page.locator(`[data-testid="account-updates-toggle-${ENTITY}"]`);
    await expect(activeBtn).toBeVisible();
    await expect(page.locator('[data-testid="row-count"]')).toContainText(/total rows/);
    await snap(page, 'college-coaches-1-loaded');
  });

  test('3.S.college_coaches.2 select up to 5 rows', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 5);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(5);
    const counter = page.locator('[data-testid="selection-count"]');
    await expect(counter).toContainText(`${ids.length} of 10 selected`);
    await snap(page, 'college-coaches-2-selected');
  });

  test('3.S.college_coaches.3 edit one field on 1 row, drawer opens', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 1);
    expect(ids.length).toBe(1);
    await openBulkEdit(page);
    await setFieldOnRow(page, ids[0], TARGET_COL, TARGET_VALUE);
    await expect(page.locator('[data-testid="bulk-edit-drawer"]')).toContainText('1 row changed');
    await snap(page, 'college-coaches-3-one-row-edited');
  });

  test('3.S.college_coaches.4 edit one field across 3 rows', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 3);
    expect(ids.length).toBe(3);
    await openBulkEdit(page);
    for (const id of ids) {
      await setFieldOnRow(page, id, TARGET_COL, `${TARGET_VALUE}-${id.slice(0, 4)}`);
    }
    await expect(page.locator('[data-testid="bulk-edit-drawer"]')).toContainText('3 rows changed');
    await snap(page, 'college-coaches-4-multi-row-edited');
  });

  test('3.S.college_coaches.5 review diff panel renders correctly', async ({ page }) => {
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
    await snap(page, 'college-coaches-5-review-diff');
  });

  test('3.S.college_coaches.6 confirm + submit + DB verify + audit verify', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 1);
    const targetId = ids[0];

    // Capture original value for cleanup.
    const { data: pre } = await serviceClient()
      .from(TABLE)
      .select(`${PK}, ${TARGET_COL}`)
      .eq(PK, targetId)
      .maybeSingle();
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
    await snap(page, 'college-coaches-6-submitted');
  });

  test('3.S.college_coaches.CREATE create new row via UI', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);

    // Open create form.
    await page.click('[data-testid="open-create-row"]');
    await page.waitForSelector('[data-testid="create-row-modal"]', { timeout: 10_000 });

    // Fill required fields.
    const form = page.locator('[data-testid="create-row-modal"]');
    await form.locator('[data-testid="create-field-unitid"]').fill(String(SEED_UNITID));
    await form.locator('[data-testid="create-field-name"]').fill(CREATED_NAME);

    // Submit.
    await page.click('[data-testid="create-row-submit"]');

    // Form auto-closes on success.
    await page.waitForSelector('[data-testid="create-row-modal"]', {
      state: 'detached',
      timeout: 15_000,
    });

    // Verify DB has the new row.
    const { data, error } = await serviceClient()
      .from(TABLE)
      .select(`${PK}, name, unitid`)
      .eq('name', CREATED_NAME)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw new Error(`create verify read failed: ${error.message}`);
    expect(data?.length, `no row found with name=${CREATED_NAME}`).toBeGreaterThan(0);
    expect(data[0].unitid).toBe(SEED_UNITID);

    // Row should appear in the list (refresh / re-render).
    await switchEntity(page, ENTITY);
    await expect(page.locator(`[data-testid="account-updates-shell"]`)).toContainText(CREATED_NAME);

    await snap(page, 'college-coaches-CREATE-success');
  });

  test('3.S.college_coaches.DELETE soft-delete row via UI', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);

    // Capture first row's id from the first delete button.
    const firstDeleteBtn = page.locator('[data-testid^="row-delete-"]').first();
    await expect(firstDeleteBtn).toBeVisible();
    const testid = await firstDeleteBtn.getAttribute('data-testid');
    const targetId = testid.replace('row-delete-', '');

    // Click delete → modal opens.
    await firstDeleteBtn.click();
    await page.waitForSelector('[data-testid="delete-confirm-modal"]', { timeout: 10_000 });

    // Confirm deletion.
    await page.click('[data-testid="delete-confirm-submit"]');

    // Modal closes on success.
    await page.waitForSelector('[data-testid="delete-confirm-modal"]', {
      state: 'detached',
      timeout: 15_000,
    });

    // Row no longer visible in the table (soft-deleted rows are filtered out).
    await expect(page.locator(`[data-testid="row-select-${targetId}"]`)).toHaveCount(0);

    // DB verify: deleted_at IS NOT NULL.
    const { data, error } = await serviceClient()
      .from(TABLE)
      .select(`${PK}, deleted_at`)
      .eq(PK, targetId)
      .maybeSingle();
    if (error) throw new Error(`delete verify read failed: ${error.message}`);
    expect(data, `row not found: ${TABLE}.${PK}=${targetId}`).toBeTruthy();
    expect(data.deleted_at, `deleted_at should be set on ${targetId}`).not.toBeNull();

    await snap(page, 'college-coaches-DELETE-success');
  });
});
