/**
 * seed_bulk_pds_fixture.js — Sprint 026 P2-4
 *
 * Seeds ONE pending Bulk PDS batch into public.bulk_pds_submissions to feed
 * the admin approval Playwright spec (tests/e2e/bulk-pds/admin-bulk-pds-approval.spec.js).
 *
 * Coach: Belmont Hill head coach (Frank Roche, 4c1e43c4-3bf7-49ef-b5c9-17b7be94bfeb)
 *        — has exactly 3 confirmed-linked students in public.hs_coach_students.
 * Students: the 3 linked Belmont Hill players (Ajani Kromah, Ky-Mani Monteiro,
 *           Ricky Copeland) — verified 2026-05-12 via mcp__supabase__list_tables.
 *
 * Idempotency: deletes any prior rows with the fixed batch_id constant before
 * inserting the new ones. Safe to re-run.
 *
 * The seeded values create deltas vs current profiles values (height/weight/
 * speed_40 modified, all 5 new measurables populated where profiles have NULL)
 * so the admin compare panel highlights changes.
 *
 * Usage:
 *   node scripts/seed_bulk_pds_fixture.js
 *
 * Prereqs (loaded from .env):
 *   SUPABASE_URL                — https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   — service-role key (bypasses RLS)
 *
 * Output:
 *   Prints batch_id + the 3 student_user_ids on success.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

// Fixed batch_id so the seed is idempotent. Sprint 026 marker.
const BATCH_ID = '00000026-0000-0000-0000-000000000001';
const COACH_USER_ID = '4c1e43c4-3bf7-49ef-b5c9-17b7be94bfeb';
const COACH_HIGH_SCHOOL = 'Belmont Hill School';

const STUDENTS = [
  {
    student_user_id: '99942a06-44ff-4f78-ba6c-2f31edfa9c6a',
    student_name_snapshot: 'Ajani Kromah',
    student_email_snapshot: 'kromahaj@belmonthill.org',
    student_grad_year_snapshot: 2027,
    // Deltas vs current profile (height "74"→"6-3", weight 183→195, speed_40 4.65→4.58)
    height: '6-3',
    weight: 195,
    speed_40: 4.58,
    // New measurables (profile has NULL for all 5)
    time_5_10_5: 4.42,
    time_l_drill: 7.05,
    bench_press: 245,
    squat: 365,
    clean: 245,
  },
  {
    student_user_id: 'd892c717-214a-4117-9c54-2ba8aebca533',
    student_name_snapshot: 'Ky-Mani Monteiro',
    student_email_snapshot: 'monteiroky@belmonthill.org',
    student_grad_year_snapshot: 2027,
    // Deltas (height "71"→"5-11", weight 175→182, speed_40 4.8→4.71)
    height: '5-11',
    weight: 182,
    speed_40: 4.71,
    time_5_10_5: 4.55,
    time_l_drill: 7.18,
    bench_press: 215,
    squat: 315,
    clean: 215,
  },
  {
    student_user_id: '799b483a-97ed-49e2-8f4d-aac8c803c8ad',
    student_name_snapshot: 'Ricky Copeland',
    student_email_snapshot: 'copelandul@belmonthill.org',
    student_grad_year_snapshot: 2027,
    // Deltas (height "70"→"5-10", weight 165→172, speed_40 4.72→4.66)
    height: '5-10',
    weight: 172,
    speed_40: 4.66,
    time_5_10_5: 4.48,
    time_l_drill: 7.10,
    bench_press: 195,
    squat: 285,
    clean: 195,
  },
];

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log(`[seed] target batch_id: ${BATCH_ID}`);
  console.log(`[seed] coach_user_id:   ${COACH_USER_ID}`);
  console.log(`[seed] high_school:     ${COACH_HIGH_SCHOOL}`);
  console.log(`[seed] students:        ${STUDENTS.length}`);

  // 1. Idempotent delete by fixed batch_id.
  const { error: delError } = await client
    .from('bulk_pds_submissions')
    .delete()
    .eq('batch_id', BATCH_ID);
  if (delError) {
    console.error('[seed] delete failed:', delError);
    process.exit(1);
  }
  console.log('[seed] prior rows for fixed batch_id removed (if any)');

  // 2. Insert 3 new pending rows.
  const rows = STUDENTS.map((s) => ({
    batch_id: BATCH_ID,
    coach_user_id: COACH_USER_ID,
    student_user_id: s.student_user_id,
    student_name_snapshot: s.student_name_snapshot,
    student_email_snapshot: s.student_email_snapshot,
    student_grad_year_snapshot: s.student_grad_year_snapshot,
    student_high_school_snapshot: COACH_HIGH_SCHOOL,
    student_avatar_storage_path_snap: null,
    height: s.height,
    weight: s.weight,
    speed_40: s.speed_40,
    time_5_10_5: s.time_5_10_5,
    time_l_drill: s.time_l_drill,
    bench_press: s.bench_press,
    squat: s.squat,
    clean: s.clean,
    approval_status: 'pending',
  }));

  const { data: inserted, error: insError } = await client
    .from('bulk_pds_submissions')
    .insert(rows)
    .select('id, student_user_id');

  if (insError) {
    console.error('[seed] insert failed:', insError);
    process.exit(1);
  }

  console.log('');
  console.log('[seed] SUCCESS');
  console.log(`[seed] batch_id:            ${BATCH_ID}`);
  console.log(`[seed] inserted rows:       ${inserted?.length ?? 0}`);
  console.log('[seed] submission_ids and student_user_ids:');
  for (const row of inserted ?? []) {
    console.log(`         submission_id=${row.id}  student_user_id=${row.student_user_id}`);
  }
  console.log('');
  console.log('[seed] Re-run anytime — script deletes by batch_id then inserts.');
}

main().catch((e) => {
  console.error('[seed] unexpected error:', e);
  process.exit(1);
});
