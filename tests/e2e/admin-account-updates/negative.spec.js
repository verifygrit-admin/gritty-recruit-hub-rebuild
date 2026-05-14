/**
 * Sprint 027 Phase 3 — Negative spec.
 * 6 base + 3 carry-forward from PHASE_3_CARRY_FORWARD.md = 9 total.
 *
 * 3.N.1  Protected fields render read-only (id, uuid, user_id, email)
 * 3.N.2  Non-admin → /admin/account-updates redirects to /admin-login
 * 3.N.3  Create/Delete UI absent in DOM on auth-linked entities (Q5 compile-time gate)
 * 3.N.4  409 conflict on stale updated_at (demonstrated via single-row update + manual TS bump)
 * 3.N.5  11th selection blocked with toast (Students has 36 rows)
 * 3.N.6  Audit row count = (rows × changed-fields) on multi-row submit
 * 3.N.8  Bulk PDS hint visible on 5 PDS measurables (Students drawer) — duplicates students.PDS for completeness
 * 3.N.9  Partial-batch / invalid-column rejection (defense-in-depth on EF whitelist)
 * 3.N.10 pkCol type round-trip — Colleges integer PK selection state survives toggle change
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
  dbRestoreCol,
} from './_helpers/nav.js';

test.describe('@sprint-027 negative', () => {
  // ----------------------------------------------------------------------
  // 3.N.1 Protected fields render read-only
  // ----------------------------------------------------------------------
  test('3.N.1 protected fields are NOT rendered as editable inputs in the drawer', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, 'students');
    await selectRows(page, 1);
    await openBulkEdit(page);
    const drawer = page.locator('[data-testid="bulk-edit-drawer"]');
    // PK + auth-linked fields should NOT have field inputs in the drawer.
    for (const protectedField of ['id', 'user_id', 'email']) {
      expect(
        await drawer.locator(`[data-testid="field-${protectedField}"]`).count(),
        `field-${protectedField} should not render an editable input`,
      ).toBe(0);
    }
    // Sanity: a known editable field IS rendered.
    expect(await drawer.locator('[data-testid="field-name"]').count()).toBeGreaterThan(0);
  });

  // ----------------------------------------------------------------------
  // 3.N.2 Non-admin redirect — load page without admin storage
  // ----------------------------------------------------------------------
  test('3.N.2 unauthenticated direct URL → /admin-login redirect', async ({ browser }) => {
    // Fresh context with empty storage = anonymous session
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto('/admin/account-updates', { waitUntil: 'networkidle' });
    expect(page.url()).toContain('/admin-login');
    // Shell should NOT have mounted.
    expect(await page.locator('[data-testid="account-updates-shell"]').count()).toBe(0);
    await ctx.close();
  });

  // ----------------------------------------------------------------------
  // 3.N.3 Create/Delete UI absent on the 4 auth-linked entities
  // ----------------------------------------------------------------------
  for (const entity of ['students', 'hs_coaches', 'counselors', 'high_schools']) {
    test(`3.N.3 [${entity}] Create button + per-row Delete column absent (Q5 compile-time gate)`, async ({ page }) => {
      await gotoAccountUpdates(page);
      await switchEntity(page, entity);
      expect(await page.locator('[data-testid="open-create-row"]').count()).toBe(0);
      expect(await page.locator('[data-testid^="row-delete-"]').count()).toBe(0);
    });
  }

  // ----------------------------------------------------------------------
  // 3.N.4 409 conflict on stale updated_at
  // ----------------------------------------------------------------------
  test('3.N.4 409 conflict surfaces when DB updated_at has advanced since read', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, 'students');
    const ids = await selectRows(page, 1);
    const targetId = ids[0];

    // Capture original twitter value for cleanup
    const { data: pre } = await serviceClient().from('profiles').select('id, twitter, updated_at').eq('id', targetId).maybeSingle();
    const originalTwitter = pre?.twitter ?? null;

    await openBulkEdit(page);
    await setFieldOnRow(page, targetId, 'twitter', '@stale-edit');

    // BEFORE we click Update, advance the DB updated_at out-of-band by writing
    // a different column. Trigger fires (or, for profiles, the row's updated_at
    // is column-DEFAULT now() but UPDATEs don't auto-bump unless triggered).
    // Profiles has updated_at column but no auto-update trigger — manually bump.
    await serviceClient()
      .from('profiles')
      .update({ updated_at: new Date(Date.now() + 1000).toISOString() })
      .eq('id', targetId);

    await page.click('[data-testid="bulk-edit-update"]');
    await page.waitForSelector('[data-testid="review-diff-panel"]', { timeout: 5_000 });
    await page.click('[data-testid="review-confirm"]');

    // Expect either: a) error banner with "Conflict" message, OR b) the drawer
    // stays open with conflict info. Wait for the error indicator.
    await expect(page.locator('[data-testid="bulk-edit-error"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="bulk-edit-error"]')).toContainText(/modified|conflict|stale/i);

    // DB should still have the original twitter value
    await dbAssertCol('profiles', 'id', targetId, 'twitter', originalTwitter);

    // Restore updated_at to roughly original (cleanup)
    if (pre?.updated_at) {
      await serviceClient().from('profiles').update({ updated_at: pre.updated_at }).eq('id', targetId);
    }
  });

  // ----------------------------------------------------------------------
  // 3.N.5 11th selection blocked with toast
  // ----------------------------------------------------------------------
  test('3.N.5 11th row selection blocked + toast appears', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, 'students'); // 36 rows
    await selectRows(page, 10);
    await expect(page.locator('[data-testid="selection-count"]')).toContainText('10 of 10 selected');

    // Attempt to click an 11th checkbox
    const checkboxes = page.locator('[data-testid^="row-select-"]');
    const total = await checkboxes.count();
    expect(total).toBeGreaterThanOrEqual(11);
    // Find a checkbox that isn't currently checked
    let elevenths;
    for (let i = 0; i < total; i++) {
      const cb = checkboxes.nth(i);
      const checked = await cb.isChecked();
      if (!checked) { elevenths = cb; break; }
    }
    expect(elevenths).toBeDefined();

    // Click + verify still unchecked (cap holds)
    await elevenths.click({ force: true });
    expect(await elevenths.isChecked()).toBe(false);
    // Selection counter still says 10
    await expect(page.locator('[data-testid="selection-count"]')).toContainText('10 of 10 selected');
    // Toast appears (selection-cap toast comes from useToast — global slot)
    await expect(page.getByText(/Selection capped at 10 rows/)).toBeVisible({ timeout: 5_000 });
  });

  // ----------------------------------------------------------------------
  // 3.N.6 Audit row count = (rows × fields changed)
  // ----------------------------------------------------------------------
  test('3.N.6 audit log writes one row per field changed across multi-row submit', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, 'students');
    const ids = await selectRows(page, 2);
    const since = new Date().toISOString();

    // Capture originals
    const originals = {};
    for (const id of ids) {
      const { data } = await serviceClient().from('profiles').select('id, twitter, phone').eq('id', id).maybeSingle();
      originals[id] = data;
    }

    await openBulkEdit(page);
    for (const id of ids) {
      await setFieldOnRow(page, id, 'twitter', `@nbr6-${id.slice(0, 4)}`);
      await setFieldOnRow(page, id, 'phone', `555-0${id.slice(0, 3)}`);
    }
    await clickUpdateAndReview(page);
    await confirmAndSubmit(page);

    // Expect 2 rows × 2 fields = 4 audit rows
    const { data: auditRows } = await serviceClient()
      .from('admin_audit_log')
      .select('*')
      .eq('table_name', 'profiles')
      .in('row_id', ids)
      .in('field', ['twitter', 'phone'])
      .gte('created_at', since);
    expect(auditRows?.length).toBe(4);

    // Cleanup: restore originals
    for (const id of ids) {
      await dbRestoreCol('profiles', 'id', id, 'twitter', originals[id]?.twitter ?? null);
      await dbRestoreCol('profiles', 'id', id, 'phone', originals[id]?.phone ?? null);
    }
  });

  // ----------------------------------------------------------------------
  // 3.N.8 PDS hint visible (carry-forward from PHASE_3_CARRY_FORWARD §3.N.8)
  // ----------------------------------------------------------------------
  test('3.N.8 Bulk PDS hint string renders on all 5 PDS fields (Students drawer)', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, 'students');
    await selectRows(page, 1);
    await openBulkEdit(page);
    const drawer = page.locator('[data-testid="bulk-edit-drawer"]');
    const hintCount = await drawer.locator('text=Direct edit bypasses bulk PDS audit chain.').count();
    expect(hintCount).toBe(5);
  });

  // ----------------------------------------------------------------------
  // 3.N.9 Defense-in-depth: invalid column in batch payload → 400 + no writes
  //   (Phase 3 carry-forward §3.N.9 — partial-batch failure semantics via the
  //    closest controllable injection point: the EF whitelist rejection.)
  // ----------------------------------------------------------------------
  test('3.N.9 EF rejects 400 when batch diff contains a non-whitelisted column; no DB writes occur', async ({ page }) => {
    await gotoAccountUpdates(page);
    // We bypass the UI here and call the EF directly with a hand-crafted bad
    // payload. The session JWT is in storageState — pull it out via page.evaluate.
    const jwt = await page.evaluate(() => {
      const projectRef = 'xyudnajzhuwdauwkwsbh';
      const raw = window.localStorage.getItem(`sb-${projectRef}-auth-token`);
      try { return JSON.parse(raw)?.access_token; } catch { return null; }
    });
    expect(jwt).toBeTruthy();

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const ANON = process.env.VITE_SUPABASE_ANON_KEY;
    const since = new Date().toISOString();

    // Pick a real students row to target
    const { data: rows } = await serviceClient().from('profiles').select('id, twitter').limit(1);
    const target = rows[0];

    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-update-account`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
        apikey: ANON,
      },
      body: JSON.stringify({
        entity: 'students',
        admin_email: 'chris@grittyfb.com',
        batch: [{
          row_id: target.id,
          diff: { not_a_real_column_XYZ: 'malicious' },
        }],
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Invalid column/);

    // Confirm no audit row was written under the bogus field name
    const { data: audit } = await serviceClient()
      .from('admin_audit_log')
      .select('*')
      .eq('field', 'not_a_real_column_XYZ')
      .gte('created_at', since);
    expect(audit?.length || 0).toBe(0);
  });

  // ----------------------------------------------------------------------
  // 3.N.10 pkCol integer round-trip (Colleges) — selection state persists
  //        across drawer open/close (proxy for the broader "selection survives
  //        re-render" property called out in PHASE_3_CARRY_FORWARD §3.N.10).
  // ----------------------------------------------------------------------
  test('3.N.10 Colleges integer PK selection survives drawer open/close cycle', async ({ page }) => {
    await gotoAccountUpdates(page);
    await switchEntity(page, 'colleges');
    const ids = await selectRows(page, 3);
    expect(ids.length).toBe(3);
    // Open the drawer
    await openBulkEdit(page);
    await expect(page.locator('[data-testid="bulk-edit-drawer"]')).toBeVisible();
    // Close without changes
    await page.click('[data-testid="bulk-edit-close"]');
    await page.waitForSelector('[data-testid="bulk-edit-drawer"]', { state: 'detached', timeout: 5_000 });
    // Selection should still be 3
    await expect(page.locator('[data-testid="selection-count"]')).toContainText('3 of 10 selected');
    // Each selected checkbox should still be checked — proves integer-PK keys survived
    for (const id of ids) {
      const cb = page.locator(`[data-testid="row-select-${id}"]`);
      expect(await cb.isChecked()).toBe(true);
    }
  });
});
