/**
 * Sprint 026 — RLS behavioral contract tests for public.bulk_pds_submissions
 *
 * Covers SPRINT_026_PLAN.md §4.2 (six RLS scenarios). Each scenario asserts
 * the policies created in migration 0050_bulk_pds_submissions_rls.sql behave
 * correctly against real auth contexts.
 *
 * Strategy:
 *   - Use the service_role client to provision two coach users (A, B),
 *     two student users (X, Y), and link Coach A <-> Student X via
 *     hs_coach_students. Coach B and Student Y are unlinked controls.
 *   - For each scenario, generate a one-time magiclink-style session for
 *     the actor via admin.generateLink, hydrate an anon supabase-js client
 *     with that session, and execute the policy-bound query.
 *   - Tear down ALL provisioned rows on suite exit (service_role).
 *
 * Skipping: if SUPABASE_SERVICE_ROLE_KEY (or URL) is not present, the whole
 * suite is skipped via describe.skipIf. Tests can fail at this stage —
 * the scaffolding is the deliverable.
 *
 * Project ref: xyudnajzhuwdauwkwsbh
 * Env vars expected:
 *   VITE_SUPABASE_URL or SUPABASE_URL  — project URL
 *   SUPABASE_SERVICE_ROLE_KEY          — service role JWT
 *   SUPABASE_ANON_KEY (optional)       — falls back to publishable key if set
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

const HAVE_CREDS = Boolean(SUPABASE_URL && SERVICE_ROLE && ANON_KEY);

// Suite-scoped state
let admin;
const created = {
  coachAUserId: null,
  coachBUserId: null,
  studentXUserId: null,
  studentYUserId: null,
  hsCoachStudentLinkId: null,
  bulkPdsRowIds: [], // any rows that escape into the table get torn down
};

const TAG = `t026-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const emails = {
  coachA:    `${TAG}-coachA@bulk-pds-rls.test`,
  coachB:    `${TAG}-coachB@bulk-pds-rls.test`,
  studentX:  `${TAG}-studentX@bulk-pds-rls.test`,
  studentY:  `${TAG}-studentY@bulk-pds-rls.test`,
};
const PASSWORD = 'BulkPdsRlsTest!2026';

async function createUser(email, userType) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { test_tag: TAG },
    app_metadata: { user_type: userType },
  });
  if (error) throw error;
  return data.user.id;
}

async function signInAs(email) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw error;
  return { client, session: data.session };
}

function sampleStagingRow(coachUserId, studentUserId) {
  // Minimum-viable insert payload. Snapshot columns are nullable per §1.1
  // shape; we set the FK-bound fields plus a couple measurables.
  return {
    coach_user_id:   coachUserId,
    student_user_id: studentUserId,
    height:          '6-2',
    weight:          195,
    speed_40:        4.65,
    time_5_10_5:     4.30,
    time_l_drill:    6.95,
    bench_press:     225,
    squat:           315,
    clean:           225,
    approval_status: 'pending',
  };
}

describe.skipIf(!HAVE_CREDS)('[RLS-CONTRACT] bulk_pds_submissions — Sprint 026 §4.2', () => {
  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Provision users
    created.coachAUserId   = await createUser(emails.coachA,   'hs_coach');
    created.coachBUserId   = await createUser(emails.coachB,   'hs_coach');
    created.studentXUserId = await createUser(emails.studentX, 'student_athlete');
    created.studentYUserId = await createUser(emails.studentY, 'student_athlete');

    // Link Coach A <-> Student X (confirmed)
    const { data: linkRow, error: linkErr } = await admin
      .from('hs_coach_students')
      .insert({
        coach_user_id:   created.coachAUserId,
        student_user_id: created.studentXUserId,
        confirmed_at:    new Date().toISOString(),
      })
      .select('id')
      .single();
    if (linkErr) throw linkErr;
    created.hsCoachStudentLinkId = linkRow.id;
  }, 60_000);

  afterAll(async () => {
    if (!admin) return;

    // Wipe any bulk_pds_submissions rows produced during the suite
    if (created.coachAUserId || created.coachBUserId) {
      await admin
        .from('bulk_pds_submissions')
        .delete()
        .in('coach_user_id', [created.coachAUserId, created.coachBUserId].filter(Boolean));
    }

    if (created.hsCoachStudentLinkId) {
      await admin.from('hs_coach_students').delete().eq('id', created.hsCoachStudentLinkId);
    }

    for (const uid of [
      created.coachAUserId,
      created.coachBUserId,
      created.studentXUserId,
      created.studentYUserId,
    ]) {
      if (uid) {
        try { await admin.auth.admin.deleteUser(uid); } catch (_) { /* best effort */ }
      }
    }
  }, 60_000);

  // ── Scenario 1 ──────────────────────────────────────────────────────────
  it('1. Coach A inserts row for linked student X — PASS', async () => {
    const { client } = await signInAs(emails.coachA);
    const { data, error } = await client
      .from('bulk_pds_submissions')
      .insert(sampleStagingRow(created.coachAUserId, created.studentXUserId))
      .select('id')
      .single();

    expect(error, `expected PASS, got: ${error?.message}`).toBeNull();
    expect(data?.id).toBeTruthy();
  });

  // ── Scenario 2 ──────────────────────────────────────────────────────────
  it('2. Coach A inserts row with coach_user_id = Coach B — RLS DENY', async () => {
    const { client } = await signInAs(emails.coachA);
    const { data, error } = await client
      .from('bulk_pds_submissions')
      .insert(sampleStagingRow(created.coachBUserId, created.studentXUserId))
      .select('id');

    // PostgREST surfaces RLS denial as a 401/403-shaped error OR returns []
    // depending on the WITH CHECK violation; either way data must NOT contain
    // a successful row.
    expect(error, 'expected RLS DENY error').not.toBeNull();
    expect(data).toBeFalsy();
  });

  // ── Scenario 3 ──────────────────────────────────────────────────────────
  it('3. Coach A inserts row for student NOT in their hs_coach_students (Student Y) — RLS DENY', async () => {
    const { client } = await signInAs(emails.coachA);
    const { data, error } = await client
      .from('bulk_pds_submissions')
      .insert(sampleStagingRow(created.coachAUserId, created.studentYUserId))
      .select('id');

    expect(error, 'expected RLS DENY error').not.toBeNull();
    expect(data).toBeFalsy();
  });

  // ── Scenario 4 ──────────────────────────────────────────────────────────
  it('4. Coach A SELECTs own rows — PASS', async () => {
    // Ensure at least one row exists for Coach A (via service_role to avoid
    // depending on Scenario 1 ordering / state bleed).
    await admin
      .from('bulk_pds_submissions')
      .insert(sampleStagingRow(created.coachAUserId, created.studentXUserId));

    const { client } = await signInAs(emails.coachA);
    const { data, error } = await client
      .from('bulk_pds_submissions')
      .select('id, coach_user_id')
      .eq('coach_user_id', created.coachAUserId);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  // ── Scenario 5 ──────────────────────────────────────────────────────────
  it('5. Coach A SELECTs Coach B rows — RLS DENY (returns empty set)', async () => {
    // Seed a Coach B row via service_role so the table is non-empty for Coach B.
    // We deliberately bypass the coach-A linkage so the row exists physically.
    // To do that we temporarily link Coach B <-> Student X, insert, then unlink.
    const { data: tempLink, error: tempLinkErr } = await admin
      .from('hs_coach_students')
      .insert({
        coach_user_id:   created.coachBUserId,
        student_user_id: created.studentXUserId,
        confirmed_at:    new Date().toISOString(),
      })
      .select('id')
      .single();
    if (tempLinkErr) throw tempLinkErr;

    await admin
      .from('bulk_pds_submissions')
      .insert(sampleStagingRow(created.coachBUserId, created.studentXUserId));

    await admin.from('hs_coach_students').delete().eq('id', tempLink.id);

    const { client } = await signInAs(emails.coachA);
    const { data, error } = await client
      .from('bulk_pds_submissions')
      .select('id, coach_user_id')
      .eq('coach_user_id', created.coachBUserId);

    // RLS SELECT denial returns an empty array, not an error, per Postgres
    // RLS semantics (rows filtered out invisibly).
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  // ── Scenario 6 ──────────────────────────────────────────────────────────
  it('6. Student X tries to INSERT into bulk_pds_submissions — RLS DENY', async () => {
    const { client } = await signInAs(emails.studentX);
    const { data, error } = await client
      .from('bulk_pds_submissions')
      .insert(sampleStagingRow(created.studentXUserId, created.studentXUserId))
      .select('id');

    expect(error, 'expected RLS DENY error for student insert').not.toBeNull();
    expect(data).toBeFalsy();
  });
});

// When credentials are not available, surface a single skipped placeholder
// so the test runner output makes the gap visible.
describe.skipIf(HAVE_CREDS)('[RLS-CONTRACT] bulk_pds_submissions — SKIPPED (credentials missing)', () => {
  it.skip('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY required', () => {});
});
