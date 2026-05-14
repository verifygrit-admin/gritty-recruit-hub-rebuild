/**
 * Sprint 027 Phase 3 — Recruiting Events entity positive smoke (6 + CREATE + DELETE).
 *
 * Pattern (mirrored by other entity specs):
 *   3.S.<entity>.1 — Load view; columns render; toggle highlights.
 *   3.S.<entity>.2 — Select rows (≤5); selection counter updates.
 *   3.S.<entity>.3 — Edit one non-protected field on 1 row.
 *   3.S.<entity>.4 — Edit one non-protected field across multiple rows (3).
 *   3.S.<entity>.5 — Click Update → ReviewDiffPanel renders correct diffs.
 *   3.S.<entity>.6 — Click Confirm → DB row + audit row verified.
 *   3.S.<entity>.CREATE — Q5 Create flow: open modal, fill required, submit.
 *   3.S.<entity>.DELETE — Q5 Delete flow: per-row delete, soft-delete verified.
 *
 * Entity differences vs Students:
 *  - PK is `id` (uuid). Empty live table — beforeAll SEEDS 5 rows; afterAll
 *    hard-deletes all seed rows + any rows created by the .CREATE test.
 *  - cfg.create_enabled = true, cfg.delete_enabled = true (Q5).
 *  - No PDS hint test (recruiting_events is not a PDS-bearing entity).
 *  - Standard flat diff (not nested).
 *  - selectRows cap is 5 (the seed set); multi-row test uses 3.
 *  - event_type / status have CHECK constraints — seed and CREATE leave both
 *    blank (they are nullable). Operator UI accepts any typed enum value.
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

const ENTITY = 'recruiting_events';
const TABLE = 'recruiting_events';
const PK = 'id'; // uuid
const TARGET_COL = 'location'; // text, in editable whitelist, non-required
const TARGET_VALUE = 'Sprint027 Smoke Stadium';

// Seed config: 5 rows tagged with the run timestamp so afterAll can sweep them.
const SEED_UNITID = 100654;
const SEED_TAG = `phase3-smoke-${Date.now()}`;
const SEED_DATES = ['2026-09-15', '2026-10-01', '2026-10-15', '2026-11-01', '2026-11-15'];

test.describe('@sprint-027 Recruiting Events positive smoke', () => {
  let seededIds = []; // uuid[] inserted in beforeAll
  let createdIds = []; // uuid[] inserted by the .CREATE test for afterAll sweep
  let originalValues = {}; // { id: { location: <prev> } } for cleanup

  test.beforeAll(async () => {
    const rows = SEED_DATES.map((d, i) => ({
      unitid: SEED_UNITID,
      event_date: d,
      event_name: `Phase3 Smoke Event ${i + 1}`,
      description: SEED_TAG,
    }));
    const { data, error } = await serviceClient()
      .from(TABLE)
      .insert(rows)
      .select('id');
    if (error) throw new Error(`seed insert failed: ${error.message}`);
    seededIds = (data || []).map((r) => r.id);
    if (seededIds.length !== rows.length) {
      throw new Error(`seed insert short: expected ${rows.length}, got ${seededIds.length}`);
    }
  });

  test.afterAll(async () => {
    // Restore any edited column values first (defensive; rows will be deleted next).
    for (const [id, cols] of Object.entries(originalValues)) {
      for (const [col, val] of Object.entries(cols)) {
        try {
          await dbRestoreCol(TABLE, PK, id, col, val);
        } catch (_) {
          // ignore — row may be slated for hard delete anyway
        }
      }
    }
    // Hard delete all seed rows + anything created by the .CREATE test.
    const toDelete = [...seededIds, ...createdIds];
    for (const id of toDelete) {
      try {
        await dbHardDelete(TABLE, PK, id);
      } catch (_) {
        // best-effort cleanup
      }
    }
  });

  test('3.S.recruiting_events.1 load view and render columns', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const activeBtn = page.locator(`[data-testid="account-updates-toggle-${ENTITY}"]`);
    await expect(activeBtn).toBeVisible();
    await expect(page.locator('[data-testid="row-count"]')).toContainText(/total rows/);
    await snap(page, 'recruiting_events-1-loaded');
  });

  test('3.S.recruiting_events.2 select up to 5 rows', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 5);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(5);
    const counter = page.locator('[data-testid="selection-count"]');
    await expect(counter).toContainText(`${ids.length} of 10 selected`);
    await snap(page, 'recruiting_events-2-selected');
  });

  test('3.S.recruiting_events.3 edit one field on 1 row, drawer opens', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 1);
    expect(ids.length).toBe(1);
    await openBulkEdit(page);
    await setFieldOnRow(page, ids[0], TARGET_COL, TARGET_VALUE);
    await expect(page.locator('[data-testid="bulk-edit-drawer"]')).toContainText('1 row changed');
    await snap(page, 'recruiting_events-3-one-row-edited');
  });

  test('3.S.recruiting_events.4 edit one field across 3 rows', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 3);
    expect(ids.length).toBe(3);
    await openBulkEdit(page);
    for (const id of ids) {
      await setFieldOnRow(page, id, TARGET_COL, `${TARGET_VALUE}-${id.slice(0, 4)}`);
    }
    await expect(page.locator('[data-testid="bulk-edit-drawer"]')).toContainText('3 rows changed');
    await snap(page, 'recruiting_events-4-multi-row-edited');
  });

  test('3.S.recruiting_events.5 review diff panel renders correctly', async ({ page }) => {
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
    await snap(page, 'recruiting_events-5-review-diff');
  });

  test('3.S.recruiting_events.6 confirm + submit + DB verify + audit verify', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);
    const ids = await selectRows(page, 1);
    const targetId = ids[0]; // uuid string

    // Capture original value for cleanup
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
    await snap(page, 'recruiting_events-6-submitted');
  });

  // Q5 Create flow: cfg.create_enabled = true.
  test('3.S.recruiting_events.CREATE open modal, fill required, submit', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);

    const since = new Date().toISOString();
    const createDate = '2026-12-01';

    // Open the create modal.
    await page.click('[data-testid="open-create-row"]');
    await page.waitForSelector('[data-testid="create-row-modal"]', { timeout: 5_000 });

    // Fill required fields: unitid + event_date. event_type / status left blank
    // (nullable; avoids CHECK-constraint surprises in the smoke).
    await page.locator('[data-testid="create-field-unitid"]').fill(String(SEED_UNITID));
    await page.locator('[data-testid="create-field-event_date"]').fill(createDate);

    // Submit; modal auto-closes on success.
    await page.click('[data-testid="create-row-submit"]');
    await page.waitForSelector('[data-testid="create-row-modal"]', {
      state: 'detached',
      timeout: 15_000,
    });

    // DB verify: row exists with the expected unitid + event_date.
    const { data, error } = await serviceClient()
      .from(TABLE)
      .select('id, unitid, event_date')
      .eq('unitid', SEED_UNITID)
      .eq('event_date', createDate)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw new Error(`create DB read failed: ${error.message}`);
    expect(data?.length, `no created row found for unitid=${SEED_UNITID} date=${createDate}`).toBeGreaterThan(0);
    const createdId = data[0].id;
    createdIds.push(createdId); // mark for afterAll sweep

    await snap(page, 'recruiting_events-CREATE-submitted');
  });

  // Q5 Delete flow: cfg.delete_enabled = true. Per-row Delete soft-deletes.
  test('3.S.recruiting_events.DELETE per-row delete sets deleted_at', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, ENTITY);

    // Grab the first row's PK from a row-delete-<id> testid.
    const firstDeleteBtn = page.locator('[data-testid^="row-delete-"]').first();
    await expect(firstDeleteBtn).toBeVisible();
    const testid = await firstDeleteBtn.getAttribute('data-testid');
    const targetId = testid.replace('row-delete-', '');

    // Click delete → confirm modal renders.
    await firstDeleteBtn.click();
    await page.waitForSelector('[data-testid="delete-confirm-modal"]', { timeout: 5_000 });

    // Confirm → modal closes on success.
    await page.click('[data-testid="delete-confirm-submit"]');
    await page.waitForSelector('[data-testid="delete-confirm-modal"]', {
      state: 'detached',
      timeout: 15_000,
    });

    // DB verify: deleted_at IS NOT NULL on the targeted row.
    const { data, error } = await serviceClient()
      .from(TABLE)
      .select(`${PK}, deleted_at`)
      .eq(PK, targetId)
      .maybeSingle();
    if (error) throw new Error(`delete DB read failed: ${error.message}`);
    expect(data, `row not found after delete: ${TABLE}.${PK}=${targetId}`).toBeTruthy();
    expect(data.deleted_at, `deleted_at should be set for ${targetId}`).not.toBeNull();

    await snap(page, 'recruiting_events-DELETE-confirmed');
  });
});
