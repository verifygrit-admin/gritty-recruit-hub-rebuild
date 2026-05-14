/**
 * Navigation + selection + DB-verify helpers for Sprint 027 admin-account-updates
 * Playwright suite. Shared across the 7 entity specs and the negative spec.
 *
 * All helpers assume the admin storageState is loaded (Playwright config
 * `use.storageState`).
 */

import { expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '..', '..', '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _serviceClient = null;
export function serviceClient() {
  if (!_serviceClient) {
    _serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _serviceClient;
}

/**
 * Navigate to the Account Updates tab and wait for the shell to render.
 */
export async function gotoAccountUpdates(page) {
  await page.goto('/admin/account-updates', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="account-updates-shell"]', { timeout: 30_000 });
}

/**
 * Switch the active entity toggle and wait for table data to load.
 */
export async function switchEntity(page, entityKey) {
  await page.click(`[data-testid="account-updates-toggle-${entityKey}"]`);
  // Wait for either rows or the empty state. Use a short race.
  await Promise.race([
    page.waitForSelector(`[data-testid$="-table"]`, { timeout: 15_000 }),
    page.waitForSelector(`[data-testid="account-updates-empty-state"]`, { timeout: 15_000 }),
  ]);
}

/**
 * Select up to N rows by clicking checkboxes. Returns the row PK values selected.
 */
export async function selectRows(page, n) {
  const checkboxes = page.locator('[data-testid^="row-select-"]');
  const total = await checkboxes.count();
  const target = Math.min(n, total);
  const ids = [];
  for (let i = 0; i < target; i++) {
    const cb = checkboxes.nth(i);
    const testid = await cb.getAttribute('data-testid');
    const id = testid.replace('row-select-', '');
    await cb.check();
    ids.push(id);
  }
  return ids;
}

/**
 * Open the bulk edit drawer and wait for it to render.
 */
export async function openBulkEdit(page) {
  await page.click('[data-testid="open-bulk-edit"]');
  await page.waitForSelector('[data-testid="bulk-edit-drawer"]', { timeout: 10_000 });
}

/**
 * Set a field value on a specific row inside the drawer.
 * The first row's input has data-testid="field-<name>" — but multiple rows
 * means selectors are ambiguous. We scope to the row container.
 */
export async function setFieldOnRow(page, rowId, fieldName, value) {
  const rowContainer = page.locator(`[data-testid="bulk-edit-row-${rowId}"]`);
  const input = rowContainer.locator(`[data-testid="field-${fieldName}"]`).first();
  await input.fill(value);
}

/**
 * Click Update and wait for the review-diff panel to render.
 */
export async function clickUpdateAndReview(page) {
  await page.click('[data-testid="bulk-edit-update"]');
  await page.waitForSelector('[data-testid="review-diff-panel"]', { timeout: 5_000 });
}

/**
 * Click Confirm and wait for the success toast (drawer closes on success).
 */
export async function confirmAndSubmit(page) {
  await page.click('[data-testid="review-confirm"]');
  // Drawer auto-closes on success
  await page.waitForSelector('[data-testid="bulk-edit-drawer"]', {
    state: 'detached',
    timeout: 15_000,
  });
}

/**
 * Verify a DB row's column matches expected. Uses service-role client.
 */
export async function dbAssertCol(table, pkCol, pkValue, col, expected) {
  const { data, error } = await serviceClient()
    .from(table)
    .select(`${pkCol}, ${col}`)
    .eq(pkCol, pkValue)
    .maybeSingle();
  if (error) throw new Error(`dbAssertCol read failed: ${error.message}`);
  expect(data, `row not found: ${table}.${pkCol}=${pkValue}`).toBeTruthy();
  expect(data[col], `${table}.${col} for ${pkValue} mismatch`).toEqual(expected);
}

/**
 * Verify an audit row exists for a recent admin write of (table_name, row_id, field).
 * `since` is an ISO timestamp; rows older than this are ignored.
 */
export async function dbAssertAuditRow({ table_name, row_id, field, expectedNew, since }) {
  const { data, error } = await serviceClient()
    .from('admin_audit_log')
    .select('*')
    .eq('table_name', table_name)
    .eq('row_id', String(row_id))
    .eq('field', field)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(`audit read failed: ${error.message}`);
  expect(data?.length, `no audit row for ${table_name}.${row_id}.${field}`).toBeGreaterThan(0);
  const row = data[0];
  expect(row.action).toBe('UPDATE');
  expect(row.new_value).toEqual({ [field]: expectedNew });
  return row;
}

/**
 * Restore a column on a DB row to a prior value. Used to keep the live DB
 * clean between Phase 3 smoke runs.
 */
export async function dbRestoreCol(table, pkCol, pkValue, col, original) {
  const { error } = await serviceClient()
    .from(table)
    .update({ [col]: original })
    .eq(pkCol, pkValue);
  if (error) throw new Error(`restore failed: ${error.message}`);
}

/**
 * Soft-delete cleanup: set deleted_at on a row created during a smoke test.
 */
export async function dbHardDelete(table, pkCol, pkValue) {
  const { error } = await serviceClient().from(table).delete().eq(pkCol, pkValue);
  if (error) throw new Error(`hard delete failed: ${error.message}`);
}

/**
 * Capture a screenshot to the evidence folder.
 */
export async function snap(page, name) {
  await page.screenshot({
    path: `tests/e2e/admin-account-updates/screenshots/${name}.png`,
    fullPage: true,
  });
}
