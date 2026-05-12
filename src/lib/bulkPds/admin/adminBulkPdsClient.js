/**
 * adminBulkPdsClient.js — Sprint 026 Phase 1b (Admin UI).
 *
 * Fixture-mode wrapper for the Bulk PDS admin Edge Functions. Phase 2
 * (post-handoff, after Agent 1c lands the EFs) will replace every internal
 * body with a `fetch()` call to the matching `/functions/v1/...` endpoint
 * using the session bearer token and the existing admin EF auth pattern
 * (see supabase/functions/admin-read-schools/index.ts).
 *
 * Until then, all four functions return fixture data and emit a
 * `[STUB] adminBulkPdsClient.<fn> — fixture mode, Phase 2 wiring pending`
 * console.warn so it is unambiguous which calls remain to be wired.
 *
 * Function contracts (locked per SPRINT_026_PLAN §3 + §7 Q1/Q2):
 *   listPendingBatches()                       → Promise<batches[]>
 *   approveBatch(batch_id)                     → Promise<{ ok, batch_id }>
 *   approveSubmission(submission_id)           → Promise<{ ok, submission_id }>
 *   rejectBatch(batch_id, reason)              → Promise<{ ok, batch_id, reason }>
 *   rejectSubmission(submission_id, reason)    → Promise<{ ok, submission_id, reason }>
 */

import { PENDING_BATCHES_FIXTURE } from './fixtures/bulkPdsFixtures.js';

// In-memory copy so per-row / per-batch mutations remove items from the
// "pending" list during a single session. Resets on full reload. Phase 2
// drops this in favour of round-tripping to the EF.
let pendingBatches = PENDING_BATCHES_FIXTURE.map((b) => ({
  ...b,
  submissions: b.submissions.map((s) => ({ ...s })),
}));

function warnStub(fn) {
  // eslint-disable-next-line no-console
  console.warn(`[STUB] adminBulkPdsClient.${fn} — fixture mode, Phase 2 wiring pending`);
}

export async function listPendingBatches() {
  warnStub('listPendingBatches');
  // Sorted submitted_at desc per §3.
  return pendingBatches
    .slice()
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
}

export async function approveBatch(batch_id) {
  warnStub('approveBatch');
  pendingBatches = pendingBatches.filter((b) => b.batch_id !== batch_id);
  return { ok: true, batch_id };
}

export async function approveSubmission(submission_id) {
  warnStub('approveSubmission');
  pendingBatches = pendingBatches
    .map((b) => ({
      ...b,
      submissions: b.submissions.filter((s) => s.staging.id !== submission_id),
    }))
    .filter((b) => b.submissions.length > 0);
  return { ok: true, submission_id };
}

export async function rejectBatch(batch_id, reason) {
  warnStub('rejectBatch');
  if (!reason || !String(reason).trim()) {
    throw new Error('rejection_reason is required');
  }
  pendingBatches = pendingBatches.filter((b) => b.batch_id !== batch_id);
  return { ok: true, batch_id, reason };
}

export async function rejectSubmission(submission_id, reason) {
  warnStub('rejectSubmission');
  if (!reason || !String(reason).trim()) {
    throw new Error('rejection_reason is required');
  }
  pendingBatches = pendingBatches
    .map((b) => ({
      ...b,
      submissions: b.submissions.filter((s) => s.staging.id !== submission_id),
    }))
    .filter((b) => b.submissions.length > 0);
  return { ok: true, submission_id, reason };
}

// Test/debug-only: reset to original fixture state.
export function __resetFixtureForTests() {
  pendingBatches = PENDING_BATCHES_FIXTURE.map((b) => ({
    ...b,
    submissions: b.submissions.map((s) => ({ ...s })),
  }));
}
