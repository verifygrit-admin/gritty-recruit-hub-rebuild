/**
 * seed_users.js
 * Bulk-loads 31 BC High accounts into Supabase Auth (auth.users) and public.users,
 * then links coaches and counselors to the BC High hs_programs row via junction tables.
 *
 * Usage:
 *   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed_users.js
 *
 * Prerequisites:
 *   - @supabase/supabase-js already installed (confirmed in package.json)
 *   - hs_programs row for Boston College High School must already exist in the DB
 *   - Run from project root: C:\Users\chris\dev\gritty-recruit-hub-rebuild
 *
 * Source: data/users.csv (31 rows, header excluded)
 * Scout order: 2026-03-25
 */

// Assumes script is run from project root (node scripts/seed_users.js)
import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ---------------------------------------------------------------------------
// School configurations — Sprint 017 parameterization. BC High default behavior
// preserved exactly; Belmont Hill onboards as a new configuration entry.
// ---------------------------------------------------------------------------

const SCHOOL_CONFIGS = {
  'bc-high': {
    school_name: 'Boston College High School',
    state: 'MA',
    default_password: 'eagles2026',
    csv_path: '../data/users.csv',
    head_coach_assignment: 'positional', // first coach in CSV is head coach
  },
  'belmont-hill': {
    school_name: 'Belmont Hill School',
    state: 'MA',
    default_password: 'sextants2027',
    coach_csv_path: '../src/assets/Belmont Hill School Account Seeding - Coaches.csv',
    counselor_csv_path: '../src/assets/Belmont Hill School Account Seeding - Counselor.csv',
    students_csv_path: '../src/assets/Belmont Hill School Account Seeding - Students.csv',
    head_coach_assignment: 'column', // is_head_coach column on CSV
  },
};

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

const cliArgs = process.argv.slice(2);
function getArg(flag) {
  const i = cliArgs.indexOf(flag);
  return i !== -1 ? cliArgs[i + 1] : null;
}
const SCHOOL_ID = getArg('--school') || 'bc-high';
const ROLE = getArg('--role'); // 'coach' | 'counselor' — required for Belmont
// Path G: operator-supplied UUIDs for already-existing auth users that cannot
// be looked up via the broken GoTrue admin API (see F-22 carry-forward).
const COACH_UUID_OVERRIDE = getArg('--coach-uuid');
const COUNSELOR_UUID_OVERRIDE = getArg('--counselor-uuid');
const SCHOOL_CONFIG = SCHOOL_CONFIGS[SCHOOL_ID];

if (!SCHOOL_CONFIG) {
  console.error(`ERROR: Unknown --school '${SCHOOL_ID}'. Available: ${Object.keys(SCHOOL_CONFIGS).join(', ')}`);
  process.exit(1);
}

if (SCHOOL_ID === 'belmont-hill' && !['coach', 'counselor'].includes(ROLE)) {
  console.error(`ERROR: --school belmont-hill requires --role coach OR --role counselor.`);
  process.exit(1);
}

// Backward-compat aliases for BC High default code path.
const DEFAULT_PASSWORD = SCHOOL_CONFIG.default_password;
const BC_HIGH_NAME = SCHOOL_CONFIG.school_name;
const BC_HIGH_STATE = SCHOOL_CONFIG.state;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ---------------------------------------------------------------------------
// CSV parser (no external dependency — fields are simple, no embedded commas)
// ---------------------------------------------------------------------------

function parseCSV(filePath) {
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Idempotency helper — pre-flight email lookup before createUser. Sprint 017
// safety: lets the script be safely re-runnable.
// ---------------------------------------------------------------------------

// Primary resolver — works for users that have a profiles row (students).
async function resolveEmailToUUID(email) {
  const normalized = (email || '').trim().toLowerCase();
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', normalized)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0].user_id;
}

// Path D resolver removed — supabase.auth.admin.listUsers() returns HTTP 500
// unexpected_failure on this project, same as the GoTrue REST email-filter
// endpoint. Both endpoints route through the same broken admin handler. F-22.
// For coach/counselor lookup of already-existing auth users, Path G uses the
// operator-supplied --coach-uuid / --counselor-uuid CLI flags as the resolution
// path. For fresh users, the createUser response carries the UUID directly.

// ---------------------------------------------------------------------------
// Belmont Hill main — new code path. Processes a single role CSV (coach OR
// counselor), creates the auth user idempotently, links to the school program
// via junction-school, and links to all students via junction-students.
// ---------------------------------------------------------------------------

async function mainBelmontHill() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const cfg = SCHOOL_CONFIG;
  const programId = '4ce4c5e4-2efe-4927-b0d2-4c727d244b33'; // Sprint 017 D3 pinned

  const roleCsvPath = ROLE === 'coach' ? cfg.coach_csv_path : cfg.counselor_csv_path;
  const studentsCsvPath = cfg.students_csv_path;
  const csvAbs = resolve(__dirname, roleCsvPath);
  const studentsAbs = resolve(__dirname, studentsCsvPath);

  const roleRows = parseCSV(csvAbs);
  const studentRows = parseCSV(studentsAbs);

  console.log(`\nBelmont Hill seed — role=${ROLE}`);
  console.log(`  Role CSV:     ${csvAbs}`);
  console.log(`  Students CSV: ${studentsAbs}`);
  console.log(`  Program ID:   ${programId}`);
  console.log(`  Role rows:    ${roleRows.length}`);
  console.log(`  Student rows: ${studentRows.length}`);
  console.log('='.repeat(60));

  if (roleRows.length !== 1) {
    console.error(`ERROR: Expected exactly 1 ${ROLE} row, got ${roleRows.length}.`);
    process.exit(1);
  }

  // CSV header normalization (Belmont uses display headers)
  const row = roleRows[0];
  const fullName = row['Full Name'];
  const email = (row['Email'] || '').trim().toLowerCase();
  const isHeadCoach = ROLE === 'coach' && (row['is_head_coach'] || '').toString().toUpperCase() === 'TRUE';
  const userType = ROLE === 'coach' ? 'hs_coach' : 'hs_guidance_counselor';

  if (!email || !fullName) {
    console.error(`ERROR: Missing Full Name or Email for ${ROLE} row.`);
    process.exit(1);
  }

  // Step 1: auth user — three paths.
  //   (a) Operator-supplied UUID via --coach-uuid / --counselor-uuid: skip
  //       auth-create entirely, use the supplied UUID. Path G — the only
  //       reliable resolution for already-existing auth users on this project.
  //   (b) Fresh user (no UUID flag): createUser, capture UUID from response.
  //   (c) Fresh-create returns "already exists" with no UUID flag supplied:
  //       fail with a clear instruction. We have no working lookup path.
  let userId;
  let authCreated = 0, authSkipped = 0;

  const uuidOverride = ROLE === 'coach' ? COACH_UUID_OVERRIDE : COUNSELOR_UUID_OVERRIDE;

  if (uuidOverride) {
    userId = uuidOverride;
    authSkipped = 1;
    console.log(`[AUTH SKIP]  ${fullName} <${email}> => ${userId} (operator-supplied UUID)`);
  } else {
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: cfg.default_password,
      email_confirm: true,
    });

    if (authData?.user?.id) {
      userId = authData.user.id;
      authCreated = 1;
      console.log(`[AUTH OK]    ${fullName} <${email}> => ${userId}`);
    } else if (authErr) {
      const errMsg = (authErr.message || '').toLowerCase();
      const isDuplicate = errMsg.includes('already registered') ||
                          errMsg.includes('already exists') ||
                          errMsg.includes('duplicate') ||
                          authErr.status === 422;
      if (isDuplicate) {
        const flag = ROLE === 'coach' ? '--coach-uuid' : '--counselor-uuid';
        console.error(`AUTH ERROR [${email}]: user already exists. Re-run with ${flag} <uuid>.`);
        console.error(`(Looking the UUID up via the GoTrue admin API is currently broken on this project — see F-22.)`);
        process.exit(1);
      }
      console.error(`AUTH ERROR [${email}]: ${authErr.message}`);
      process.exit(1);
    } else {
      console.error(`AUTH ERROR [${email}]: createUser returned no data and no error.`);
      process.exit(1);
    }
  }

  // Step 2: public.users upsert
  const { error: publicErr } = await supabase.from('users').upsert(
    { user_id: userId, user_type: userType, account_status: 'active', email_verified: true },
    { onConflict: 'user_id' }
  );
  if (publicErr) {
    console.error(`PUBLIC.USERS ERROR [${email}]: ${publicErr.message}`);
    process.exit(1);
  }
  console.log(`[PUBLIC OK]  ${fullName} => public.users (${userType})`);

  // Step 3: junction-school link
  if (ROLE === 'coach') {
    const { error: jxnErr } = await supabase.from('hs_coach_schools').upsert(
      { coach_user_id: userId, hs_program_id: programId, is_head_coach: isHeadCoach },
      { onConflict: 'coach_user_id,hs_program_id' }
    );
    if (jxnErr) {
      console.error(`COACH JUNCTION ERROR: ${jxnErr.message}`);
      process.exit(1);
    }
    console.log(`[COACH JXN]  hs_coach_schools (is_head_coach=${isHeadCoach})`);
  } else {
    const { error: jxnErr } = await supabase.from('hs_counselor_schools').upsert(
      { counselor_user_id: userId, hs_program_id: programId },
      { onConflict: 'counselor_user_id,hs_program_id' }
    );
    if (jxnErr) {
      console.error(`COUNSELOR JUNCTION ERROR: ${jxnErr.message}`);
      process.exit(1);
    }
    console.log(`[COUNSELOR JXN] hs_counselor_schools`);
  }

  // Step 4: junction-students links (resolve each student email to UUID)
  let studentLinks = 0;
  const studentLinkErrors = [];
  for (const sRow of studentRows) {
    const sEmail = (sRow['Email'] || '').trim().toLowerCase();
    if (!sEmail) continue;
    const sUUID = await resolveEmailToUUID(sEmail);
    if (!sUUID) {
      studentLinkErrors.push(`Could not resolve student ${sEmail} to UUID — has bulk_import_students.js been run?`);
      continue;
    }
    const table = ROLE === 'coach' ? 'hs_coach_students' : 'hs_counselor_students';
    const linkRow = ROLE === 'coach'
      ? { coach_user_id: userId, student_user_id: sUUID }
      : { counselor_user_id: userId, student_user_id: sUUID };
    const onConflict = ROLE === 'coach' ? 'coach_user_id,student_user_id' : 'counselor_user_id,student_user_id';
    const { error: linkErr } = await supabase.from(table).upsert(linkRow, { onConflict });
    if (linkErr) {
      studentLinkErrors.push(`${table} ERROR [${sEmail}]: ${linkErr.message}`);
    } else {
      studentLinks++;
      console.log(`[STU LNK]    ${sEmail} => ${table}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`BELMONT HILL ${ROLE.toUpperCase()} SEED COMPLETE`);
  console.log('='.repeat(60));
  console.log(`  auth.users created/skipped:   ${authCreated}/${authSkipped}`);
  console.log(`  public.users upserted:        1`);
  console.log(`  junction-school link:         1`);
  console.log(`  junction-student links:       ${studentLinks} / ${studentRows.length}`);

  if (studentLinkErrors.length > 0) {
    console.error('\nStudent link errors:');
    studentLinkErrors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
}

async function main() {
  if (SCHOOL_ID === 'belmont-hill') {
    return mainBelmontHill();
  }

  // ---- BC High default path (preserved exactly) ----
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const csvPath = resolve(__dirname, '../data/users.csv');
  const rows = parseCSV(csvPath);

  console.log(`\nLoaded ${rows.length} rows from users.csv`);
  console.log('='.repeat(60));

  // -- Counters
  let authCreated = 0;
  let publicUsersInserted = 0;
  let coachJunctionInserted = 0;
  let counselorJunctionInserted = 0;
  const errors = [];

  // -- Step 1: Resolve the BC High hs_programs UUID
  console.log(`\nResolving BC High hs_programs UUID...`);
  const { data: programRows, error: programErr } = await supabase
    .from('hs_programs')
    .select('id, school_name, state')
    .eq('school_name', BC_HIGH_NAME)
    .eq('state', BC_HIGH_STATE)
    .limit(1);

  if (programErr || !programRows || programRows.length === 0) {
    console.error('FATAL: Could not find BC High row in hs_programs.');
    console.error(programErr ?? 'No rows returned.');
    console.error(`Looked for: school_name="${BC_HIGH_NAME}", state="${BC_HIGH_STATE}"`);
    console.error('Run seed_hs_programs.sql first, then retry this script.');
    process.exit(1);
  }

  const bcHighProgramId = programRows[0].id;
  console.log(`BC High hs_program_id: ${bcHighProgramId}`);

  // -- Step 2: Track coach insertion order for is_head_coach assignment
  let coachCount = 0;

  // -- Step 3: Process each user row
  console.log('\nProcessing users...\n');

  for (const row of rows) {
    const { name, email, user_type } = row;

    if (!email || !user_type) {
      const msg = `SKIP: missing email or user_type for row: ${JSON.stringify(row)}`;
      console.warn(msg);
      errors.push(msg);
      continue;
    }

    // -- 3a: Create auth.users entry
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
    });

    if (authErr) {
      const msg = `AUTH ERROR [${email}]: ${authErr.message}`;
      console.error(msg);
      errors.push(msg);
      continue;
    }

    const userId = authData.user.id;
    authCreated++;
    console.log(`[AUTH OK]    ${name} <${email}> => ${userId}`);

    // -- 3b: Insert into public.users
    const { error: publicErr } = await supabase.from('users').insert({
      user_id: userId,
      user_type,
      account_status: 'active',
      email_verified: true,
    });

    if (publicErr) {
      const msg = `PUBLIC.USERS ERROR [${email}]: ${publicErr.message}`;
      console.error(msg);
      errors.push(msg);
      // Continue — auth user was created; log the gap but do not abort the run
    } else {
      publicUsersInserted++;
      console.log(`[PUBLIC OK]  ${name} => public.users inserted (${user_type})`);
    }

    // -- 3c: Junction table inserts for coaches and counselors
    if (user_type === 'hs_coach') {
      coachCount++;
      const isHead = coachCount === 1; // First coach in CSV = head coach (Paul Zukauskas)

      const { error: coachJxnErr } = await supabase.from('hs_coach_schools').insert({
        coach_user_id: userId,
        hs_program_id: bcHighProgramId,
        is_head_coach: isHead,
      });

      if (coachJxnErr) {
        const msg = `COACH JUNCTION ERROR [${email}]: ${coachJxnErr.message}`;
        console.error(msg);
        errors.push(msg);
      } else {
        coachJunctionInserted++;
        console.log(`[COACH JXN]  ${name} => hs_coach_schools (is_head_coach=${isHead})`);
      }
    }

    if (user_type === 'hs_guidance_counselor') {
      const { error: counselorJxnErr } = await supabase.from('hs_counselor_schools').insert({
        counselor_user_id: userId,
        hs_program_id: bcHighProgramId,
      });

      if (counselorJxnErr) {
        const msg = `COUNSELOR JUNCTION ERROR [${email}]: ${counselorJxnErr.message}`;
        console.error(msg);
        errors.push(msg);
      } else {
        counselorJunctionInserted++;
        console.log(`[COUNSELOR JXN] ${name} => hs_counselor_schools`);
      }
    }

    // Small delay to avoid rate-limiting the Auth Admin API
    await sleep(200);
  }

  // ---------------------------------------------------------------------------
  // Final report
  // ---------------------------------------------------------------------------

  console.log('\n' + '='.repeat(60));
  console.log('SEED COMPLETE — Final Counts');
  console.log('='.repeat(60));
  console.log(`  auth.users created:            ${authCreated} / ${rows.length}`);
  console.log(`  public.users inserted:          ${publicUsersInserted} / ${rows.length}`);
  console.log(`  hs_coach_schools rows:          ${coachJunctionInserted} (expected 2)`);
  console.log(`  hs_counselor_schools rows:      ${counselorJunctionInserted} (expected 3)`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach((e) => console.log(`  - ${e}`));
  } else {
    console.log('\nNo errors.');
  }

  console.log('\nis_head_coach assignment:');
  console.log('  Paul Zukauskas (first coach in CSV) => is_head_coach=true');
  console.log('  Tom Conley (second coach in CSV)   => is_head_coach=false');

  // Exit non-zero if any errors
  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
