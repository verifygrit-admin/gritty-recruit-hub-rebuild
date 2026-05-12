/**
 * adminBulkPdsClient.js — Sprint 026 Phase 2 (live wiring).
 *
 * Live Edge Function client for the Bulk PDS admin panel. Replaces the Phase 1b
 * fixture stub; same exported function signatures and same return shape so
 * AdminBulkPdsTab and downstream components are untouched.
 *
 * Endpoints (deployed Sprint 026):
 *   GET  /functions/v1/admin-read-bulk-pds              → pending batches summary
 *   GET  /functions/v1/admin-read-bulk-pds?batch_id=X   → batch detail
 *   POST /functions/v1/admin-approve-bulk-pds           → { batch_id } | { submission_id }
 *   POST /functions/v1/admin-reject-bulk-pds            → { batch_id?, submission_id?, rejection_reason }
 *
 * Auth pattern (mirrors AdminInstitutionsTab.jsx:95-118):
 *   - Read session via supabase.auth.getSession()
 *   - Authorization: Bearer <access_token>
 *   - apikey: <VITE_SUPABASE_ANON_KEY>
 *
 * Shape translation:
 *   The UI components consume `batches[].submissions[]` where each submission
 *   is `{ staging, profile }`. The EF list endpoint returns only
 *   `batches[]` with `row_count` (no submissions array), and the detail
 *   endpoint returns `rows[]` with `{ submission, profile }`. This client
 *   calls list, then fans-out detail per batch in parallel, and assembles
 *   the UI-expected shape so the components do not change.
 *
 * Function contracts (locked per SPRINT_026_PLAN §3 + §7 Q1/Q2):
 *   listPendingBatches()                       → Promise<batches[]>
 *   approveBatch(batch_id)                     → Promise<{ ok, batch_id, approved, errors }>
 *   approveSubmission(submission_id)           → Promise<{ ok, submission_id, approved, errors }>
 *   rejectBatch(batch_id, reason)              → Promise<{ ok, batch_id, rejected }>
 *   rejectSubmission(submission_id, reason)    → Promise<{ ok, submission_id, rejected }>
 *
 * Phase 1b fixtures + __resetFixtureForTests remain importable from
 * `./fixtures/bulkPdsFixtures.js` for unit tests that mock this module.
 */

import { supabase } from '../../supabaseClient.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function authHeaders() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(`auth.getSession failed: ${sessionError.message}`);
  const jwt = sessionData?.session?.access_token;
  if (!jwt) throw new Error('No active admin session. Please sign in again.');
  return {
    Authorization: `Bearer ${jwt}`,
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
}

async function jsonOrThrow(res, label) {
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { _raw: text }; }
  if (!res.ok) {
    const msg = body?.error || `${label} failed (HTTP ${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  if (body?.success === false) {
    throw new Error(body.error || `${label} returned success:false`);
  }
  return body;
}

export async function listPendingBatches() {
  const headers = await authHeaders();
  const listRes = await fetch(`${SUPABASE_URL}/functions/v1/admin-read-bulk-pds`, {
    method: 'GET',
    headers,
  });
  const listBody = await jsonOrThrow(listRes, 'admin-read-bulk-pds list');
  const summaries = Array.isArray(listBody.batches) ? listBody.batches : [];

  // Fan-out: fetch detail per pending batch in parallel, then translate
  // { rows: [{ submission, profile }] } → { submissions: [{ staging, profile }] }
  const detailed = await Promise.all(
    summaries.map(async (summary) => {
      const detailRes = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-read-bulk-pds?batch_id=${encodeURIComponent(summary.batch_id)}`,
        { method: 'GET', headers },
      );
      const detailBody = await jsonOrThrow(detailRes, `admin-read-bulk-pds detail ${summary.batch_id}`);
      const rows = Array.isArray(detailBody.rows) ? detailBody.rows : [];
      return {
        batch_id: detailBody.batch_id || summary.batch_id,
        coach_user_id: detailBody.coach_user_id || summary.coach_user_id,
        submitted_at: detailBody.submitted_at || summary.submitted_at,
        submissions: rows.map((r) => ({ staging: r.submission, profile: r.profile })),
      };
    }),
  );

  // Sort submitted_at desc (matches Phase 1b stub + UI expectation).
  return detailed.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
}

export async function approveBatch(batch_id) {
  const headers = await authHeaders();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-approve-bulk-pds`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ batch_id }),
  });
  const body = await jsonOrThrow(res, 'admin-approve-bulk-pds (batch)');
  return { ok: true, batch_id, approved: body.approved, errors: body.errors || [] };
}

export async function approveSubmission(submission_id) {
  const headers = await authHeaders();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-approve-bulk-pds`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ submission_id }),
  });
  const body = await jsonOrThrow(res, 'admin-approve-bulk-pds (submission)');
  return { ok: true, submission_id, approved: body.approved, errors: body.errors || [] };
}

export async function rejectBatch(batch_id, reason) {
  if (!reason || !String(reason).trim()) {
    throw new Error('rejection_reason is required');
  }
  const headers = await authHeaders();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-reject-bulk-pds`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ batch_id, rejection_reason: String(reason).trim() }),
  });
  const body = await jsonOrThrow(res, 'admin-reject-bulk-pds (batch)');
  return { ok: true, batch_id, rejected: body.rejected };
}

export async function rejectSubmission(submission_id, reason) {
  if (!reason || !String(reason).trim()) {
    throw new Error('rejection_reason is required');
  }
  const headers = await authHeaders();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-reject-bulk-pds`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ submission_id, rejection_reason: String(reason).trim() }),
  });
  const body = await jsonOrThrow(res, 'admin-reject-bulk-pds (submission)');
  return { ok: true, submission_id, rejected: body.rejected };
}

// Test/debug-only — kept as a no-op for any unit test that still imports it.
// Phase 1b fixture state no longer lives in this module; tests that need
// fixture data should import from `./fixtures/bulkPdsFixtures.js` directly
// and mock this module.
export function __resetFixtureForTests() {
  // intentional no-op in live wiring; preserved for import compatibility
}
