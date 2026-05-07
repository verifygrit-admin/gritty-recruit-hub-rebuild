/**
 * bulk_import_students.js
 * Imports BC High student-athletes from the bulk_schema Google Sheet into Supabase.
 *
 * 7-step pipeline:
 *   Step 1 — Read bulk_schema tab via gws CLI (or --csv fallback)
 *   Step 2 — Resolve coach + counselor emails to UUIDs; preflight gate on is_head_coach
 *   Step 3 — Create auth.users records (skip on duplicate)
 *   Step 4 — Upsert public.users records
 *   Step 5 — Upsert public.profiles records
 *   Step 6 — Upsert hs_coach_students rows (CRITICAL — makes students visible on Paul's dashboard)
 *   Step 7 — Upsert hs_counselor_students rows
 *
 * Usage:
 *   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/bulk_import_students.js
 *   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/bulk_import_students.js --csv data/bulk_students.csv
 *
 * Sheet: 1zW7vFntjyAmu0GB0g2ZoNuHzPkqepGz59DcWB_RxcIQ, tab: bulk_schema
 * Row 1 = headers, Row 2+ = student data (description row deleted 2026-03-27)
 *
 * Known constants (confirmed by Chris + import_paul_zukauskas.py):
 *   Paul UUID:           9177ba55-eb83-4bce-b4cd-01ce3078d4a3
 *   Paul canonical email: pzukauskas@bchigh.edu
 *   BC High program ID:  de54b9af-c03c-46b8-a312-b87585a06328
 *
 * Authored by: Patch (GAS Engineer) 2026-03-27
 * Session: Session 8, Task 2
 */

// Assumes script is run from project root (node scripts/bulk_import_students.js)
import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://xyudnajzhuwdauwkwsbh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY must be set in environment.');
  process.exit(1);
}

const SHEET_ID = '1zW7vFntjyAmu0GB0g2ZoNuHzPkqepGz59DcWB_RxcIQ';
const SHEET_TAB = 'bulk_schema';

// ---------------------------------------------------------------------------
// School configurations — Sprint 017 parameterization. BC High default behavior
// preserved exactly; Belmont Hill onboards as a new configuration entry.
// ---------------------------------------------------------------------------

const SCHOOL_CONFIGS = {
  'bc-high': {
    program_id: 'de54b9af-c03c-46b8-a312-b87585a06328',
    school_name: 'Boston College High School',
    state: 'MA',
    default_password: 'eagles2026',
    default_hs_lat: 42.3097,
    default_hs_lng: -71.0527,
    head_coach_uuid: '9177ba55-eb83-4bce-b4cd-01ce3078d4a3',
    head_coach_email: 'pzukauskas@bchigh.edu',
    valid_counselor_emails: new Set([
      'dbalfour@bchigh.edu',
      'coconnell@bchigh.edu',
      'kswords@bchigh.edu',
    ]),
    skip_preflight: false,
    skip_coach_student_links: false,
    skip_counselor_student_links: false,
    header_map: null, // canonical snake_case already
  },
  'belmont-hill': {
    program_id: '4ce4c5e4-2efe-4927-b0d2-4c727d244b33', // Sprint 017 D3 pinned
    school_name: 'Belmont Hill School',
    state: 'MA',
    default_password: 'sextants2027',
    default_hs_lat: 42.4069,
    default_hs_lng: -71.1842,
    head_coach_uuid: null, // not yet seeded — coach runs after students per operator order
    head_coach_email: 'roche@belmonthill.org',
    valid_counselor_emails: new Set(['schmunk@belmonthill.org']),
    // Operator order for Belmont: students FIRST (this script), then coach + counselor
    // (seed_users.js with --school belmont-hill --role coach|counselor) which adds
    // junction-students rows. So this script skips preflight + steps 6/7 for Belmont.
    skip_preflight: true,
    skip_coach_student_links: true,
    skip_counselor_student_links: true,
    header_map: {
      'Full Name': 'full_name',
      'Email': 'email',
      'High School': 'high_school',
      'Grad Year': 'grad_year',
      'State': 'state',
      'Phone': 'phone',
      'Twitter': 'twitter',
      'Hudl': 'hudl_url',
      'Head Coach Email': 'coach_email',
      'Guidance Counselor Email': 'counselor_email',
      'GPA': 'gpa',
      'Position': 'position',
      'Height': 'height',
      'Weight': 'weight',
      '40 yd dash': 'speed_40',
      'Expected starter': 'expected_starter',
      'Team Captain': 'captain',
      'All-Conference': 'all_conference',
      'All-State': 'all_state',
      'AGI': 'agi',
      'Dependents': 'dependents',
      'Parent Email': 'parent_guardian_email',
    },
  },
};

// CLI arg parsing — minimal additive
const _cliArgs = process.argv.slice(2);
function _getArg(flag) {
  const i = _cliArgs.indexOf(flag);
  return i !== -1 ? _cliArgs[i + 1] : null;
}
const SCHOOL_ID = _getArg('--school') || 'bc-high';
const SCHOOL_CONFIG = SCHOOL_CONFIGS[SCHOOL_ID];
if (!SCHOOL_CONFIG) {
  console.error(`ERROR: Unknown --school '${SCHOOL_ID}'. Available: ${Object.keys(SCHOOL_CONFIGS).join(', ')}`);
  process.exit(1);
}

// Backward-compat aliases — preserve existing references throughout the script.
const PAUL_EMAIL_CANONICAL = SCHOOL_CONFIG.head_coach_email;
const PAUL_UUID_KNOWN = SCHOOL_CONFIG.head_coach_uuid;
const BC_HIGH_PROGRAM_ID = SCHOOL_CONFIG.program_id;
const BC_HIGH_SCHOOL_NAME = SCHOOL_CONFIG.school_name;
const DEFAULT_HS_LAT = SCHOOL_CONFIG.default_hs_lat;
const DEFAULT_HS_LNG = SCHOOL_CONFIG.default_hs_lng;
const DEFAULT_STATE = SCHOOL_CONFIG.state;
const VALID_COUNSELOR_EMAILS = SCHOOL_CONFIG.valid_counselor_emails;

const REQUIRED_FIELDS = ['email', 'full_name', 'coach_email', 'counselor_email'];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function normalizeEmail(email) {
  return (email ?? '').trim().toLowerCase();
}

/** Parse CSV where fields may be simple strings (no embedded commas in this dataset).
 *  Sprint 017: applies SCHOOL_CONFIG.header_map normalization if defined.
 */
function parseCSV(raw) {
  const lines = raw.trim().split('\n');
  const rawHeaders = lines[0].split(',').map((h) => h.trim());
  const headerMap = SCHOOL_CONFIG.header_map;
  const headers = headerMap
    ? rawHeaders.map((h) => headerMap[h] || h)
    : rawHeaders;
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

/** Parse the JSON response from gws CLI sheet read into row objects. */
function parseGWSResponse(raw) {
  const parsed = JSON.parse(raw);
  const rows = parsed.values ?? [];
  if (rows.length === 0) {
    throw new Error('gws returned no rows from bulk_schema tab.');
  }

  // Row 0 = headers, Row 1+ = student data (description row deleted 2026-03-27)
  const headers = rows[0];
  const dataRows = rows.slice(1); // skip header only

  if (dataRows.length === 0) {
    throw new Error('No student data rows found in bulk_schema (expected row 2+).');
  }

  return dataRows.map((values) =>
    Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]))
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Read bulk_schema tab
// ---------------------------------------------------------------------------

function readSheetData(csvFallbackPath) {
  if (csvFallbackPath) {
    console.log(`\n[STEP 1] Reading student data from CSV: ${csvFallbackPath}`);
    if (!existsSync(csvFallbackPath)) {
      console.error(`ERROR: CSV file not found: ${csvFallbackPath}`);
      process.exit(1);
    }
    const raw = readFileSync(csvFallbackPath, 'utf-8');
    return parseCSV(raw);
  }

  console.log(`\n[STEP 1] Reading bulk_schema tab via gws CLI...`);
  console.log(`  Sheet:  ${SHEET_ID}`);
  console.log(`  Tab:    ${SHEET_TAB}`);

  let rawOutput;
  try {
    rawOutput = execSync(
      `gws sheets +read --spreadsheet ${SHEET_ID} --range "${SHEET_TAB}!A1:Z100"`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
  } catch (err) {
    console.error('ERROR: gws CLI failed. Is gws installed and authenticated?');
    console.error(err.stderr ?? err.message);
    console.error('\nFallback: pass --csv <path> to supply a CSV export of the tab.');
    process.exit(1);
  }

  return parseGWSResponse(rawOutput);
}

/** Validate required fields and basic email format. HALT on failure. */
function validateRows(rows) {
  console.log(`\n  Validating ${rows.length} student rows...`);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // sheet row number (1=header, 2+=data)

    for (const field of REQUIRED_FIELDS) {
      if (!row[field]) {
        errors.push(`Row ${rowNum}: missing required field "${field}"`);
      }
    }

    if (row.email && !emailRegex.test(row.email)) {
      errors.push(`Row ${rowNum}: invalid email format "${row.email}"`);
    }
  }

  if (errors.length > 0) {
    console.error('\nVALIDATION FAILED — halting before any writes:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(`  Validation passed.`);
  return rows;
}

// ---------------------------------------------------------------------------
// Step 2 — Resolve coach + counselor emails to UUIDs; preflight gate
// ---------------------------------------------------------------------------

/**
 * Resolve a single email to a Supabase Auth UUID.
 *
 * Uses the GoTrue Admin REST API directly with an email filter query param.
 * This is an O(1) server-side lookup — no client-side pagination required.
 *
 * Why not supabase.auth.admin.listUsers()? GoTrue caps its own page size at 50
 * regardless of what perPage you request. The prior implementation set
 * perPage=1000, so the termination condition (data.users.length < perPage)
 * fired on every first page, meaning users beyond the first 50 in auth.users
 * were never found. All 23 existing students silently resolved to null.
 *
 * Why not supabase.auth.admin.getUserByEmail()? That method does not exist in
 * @supabase/supabase-js v2. The JS client exposes listUsers() and getUserById()
 * on the admin API; email lookup must go through the REST endpoint directly.
 *
 * Returns null if not found or on error.
 */
async function resolveEmailToUUID(email) {
  const normalized = normalizeEmail(email);

  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(normalized)}`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  );

  if (res.status === 404) return null;

  if (!res.ok) {
    const body = await res.text().catch(() => '(no body)');
    console.error(`  ERROR resolving email "${normalized}": HTTP ${res.status} — ${body}`);
    return null;
  }

  const json = await res.json();

  // GoTrue returns { users: [...] } for the admin list endpoint with an email filter
  const users = json.users ?? (json.id ? [json] : []);
  const match = users.find((u) => normalizeEmail(u.email) === normalized);

  return match?.id ?? null;
}

async function resolveCoachAndCounselors(rows) {
  // Sprint 017: Belmont path skips this step — coach + counselor are seeded by
  // seed_users.js AFTER this script runs, so neither exists in auth.users yet.
  // Junction-students rows are also created by seed_users.js (Belmont path),
  // not by this script (Steps 6 + 7 are skipped below).
  if (SCHOOL_CONFIG.skip_preflight) {
    console.log('\n[STEP 2] SKIPPED — school config skip_preflight=true (Belmont order: students first, coach + counselor + junction-students after).');
    return { coachUUID: null, counselorUUIDs: {} };
  }

  console.log('\n[STEP 2] Resolving coach + counselor emails to UUIDs...');

  // Collect unique counselor emails from the data
  const counselorEmails = new Set();
  for (const row of rows) {
    const email = normalizeEmail(row.counselor_email);
    if (email) counselorEmails.add(email);
  }

  // ---- Coach ----
  // Use known UUID directly (confirmed seeded). Verify via preflight gate.
  console.log(`  Coach (known): ${PAUL_EMAIL_CANONICAL} => ${PAUL_UUID_KNOWN}`);

  // Preflight: assert coach has is_head_coach=true for BC High program
  const { data: coachRows, error: coachErr } = await supabase
    .from('hs_coach_schools')
    .select('coach_user_id, hs_program_id, is_head_coach')
    .eq('coach_user_id', PAUL_UUID_KNOWN)
    .eq('hs_program_id', BC_HIGH_PROGRAM_ID)
    .limit(1);

  if (coachErr) {
    console.error(`  FATAL: hs_coach_schools preflight query failed: ${coachErr.message}`);
    process.exit(1);
  }

  if (!coachRows || coachRows.length === 0) {
    console.error(
      `  FATAL: Paul Zukauskas (${PAUL_UUID_KNOWN}) is not in hs_coach_schools for BC High (${BC_HIGH_PROGRAM_ID}).`
    );
    console.error('  Run import_paul_zukauskas.py first, then retry.');
    process.exit(1);
  }

  if (!coachRows[0].is_head_coach) {
    console.error(
      `  FATAL: Paul Zukauskas is in hs_coach_schools but is_head_coach=false. Expected true.`
    );
    console.error('  Correct the DB record, then retry.');
    process.exit(1);
  }

  console.log(`  Preflight PASS: is_head_coach=true confirmed for BC High program.`);

  // ---- Counselors ----
  const counselorUUIDs = {};

  for (const email of counselorEmails) {
    if (!VALID_COUNSELOR_EMAILS.has(email)) {
      console.warn(
        `  WARN: "${email}" is not in the known valid counselor list for BC High. Attempting lookup anyway.`
      );
    }

    const uuid = await resolveEmailToUUID(email);
    if (!uuid) {
      console.error(`  FATAL: Could not resolve counselor email "${email}" to a UUID.`);
      console.error('  Ensure this counselor has been seeded via seed_users.js before running this script.');
      process.exit(1);
    }

    counselorUUIDs[email] = uuid;
    console.log(`  Counselor: ${email} => ${uuid}`);
  }

  return {
    coachUUID: PAUL_UUID_KNOWN,
    counselorUUIDs,
  };
}

// ---------------------------------------------------------------------------
// Step 3 — Create auth.users records
// ---------------------------------------------------------------------------

async function createAuthUsers(rows) {
  console.log(`\n[STEP 3] Creating auth.users records...`);
  const uuidMap = {}; // email -> UUID
  let created = 0;
  let skipped = 0;
  const errors = [];

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    const password = row.temp_password || SCHOOL_CONFIG.default_password;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      // User already exists — resolve UUID via direct email lookup.
      // GoTrue Admin API returns "User already exists" (HTTP 422) for duplicates.
      // Also catch "already registered", "duplicate", and HTTP 422 status as
      // defensive fallbacks across GoTrue versions.
      const msg = error.message?.toLowerCase() ?? '';
      const isDuplicate =
        msg.includes('already registered') ||
        msg.includes('already exists') ||
        msg.includes('duplicate') ||
        error.status === 422;

      if (isDuplicate) {
        console.log(`  [SKIP AUTH]  ${email} — already registered, resolving existing UUID...`);
        const existingUUID = await resolveEmailToUUID(email);
        if (existingUUID) {
          uuidMap[email] = existingUUID;
          skipped++;
          console.log(`  [UUID OK]    ${email} => ${existingUUID} (existing)`);
        } else {
          const msg = `AUTH RESOLVE FAILED [${email}]: user exists but UUID lookup returned null`;
          console.error(`  ${msg}`);
          errors.push(msg);
        }
      } else {
        const msg = `AUTH ERROR [${email}]: ${error.message}`;
        console.error(`  ${msg}`);
        errors.push(msg);
      }
    } else {
      const uuid = data.user.id;
      uuidMap[email] = uuid;
      created++;
      console.log(`  [AUTH OK]    ${email} => ${uuid}`);
    }

    await sleep(200);
  }

  return { uuidMap, authCreated: created, authSkipped: skipped, authErrors: errors };
}

// ---------------------------------------------------------------------------
// Step 4 — Upsert public.users records
// ---------------------------------------------------------------------------

async function upsertPublicUsers(rows, uuidMap) {
  console.log(`\n[STEP 4] Upserting public.users records...`);
  let inserted = 0;
  const errors = [];

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    const userId = uuidMap[email];

    if (!userId) {
      const msg = `SKIP public.users [${email}]: no UUID resolved (auth step failed)`;
      console.warn(`  ${msg}`);
      errors.push(msg);
      continue;
    }

    const { error } = await supabase.from('users').upsert(
      {
        user_id: userId,
        user_type: 'student_athlete',
        account_status: 'active',
        email_verified: true,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      const msg = `PUBLIC.USERS ERROR [${email}]: ${error.message}`;
      console.error(`  ${msg}`);
      errors.push(msg);
    } else {
      inserted++;
      console.log(`  [USERS OK]   ${email} => public.users upserted`);
    }

    await sleep(50);
  }

  return { publicUsersInserted: inserted, publicUsersErrors: errors };
}

// ---------------------------------------------------------------------------
// Step 5 — Upsert public.profiles records
// ---------------------------------------------------------------------------

function buildProfilePayload(row, userId) {
  // Height: sheet stores total inches (e.g. 70). Keep as integer.
  const height = row.height ? parseInt(row.height, 10) : null;

  // hs_lng: Boston longitude must be negative. Some sheet rows may lack the minus sign.
  let hsLng = row.hs_lng ? parseFloat(row.hs_lng) : DEFAULT_HS_LNG;
  if (hsLng > 0) hsLng = -hsLng; // correct positive longitude for Boston area

  const hsLat = row.hs_lat ? parseFloat(row.hs_lat) : DEFAULT_HS_LAT;

  const payload = {
    user_id: userId,
    name: row.full_name,
    email: normalizeEmail(row.email),
    high_school: BC_HIGH_SCHOOL_NAME,
    position: row.position || null,
    height,
    weight: row.weight ? parseInt(row.weight, 10) : null,
    speed_40: row.speed_40 ? parseFloat(row.speed_40) : null,
    gpa: row.gpa ? parseFloat(row.gpa) : null,
    sat: row.sat ? parseInt(row.sat, 10) : null,
    hs_lat: hsLat,
    hs_lng: hsLng,
    state: row.state || DEFAULT_STATE,
    agi: row.agi ? parseInt(row.agi, 10) : null,
    dependents: row.dependents ? parseInt(row.dependents, 10) : null,
    grad_year: row.grad_year ? parseInt(row.grad_year, 10) : null,
  };

  // Optional fields — only include if non-empty
  if (row.hudl_url) payload.hudl_url = row.hudl_url;
  if (row.phone) payload.phone = row.phone;
  if (row.twitter) payload.twitter = row.twitter;
  if (row.parent_guardian_email) payload.parent_guardian_email = row.parent_guardian_email;

  // Boolean fields — sheet stores "TRUE"/"FALSE" strings
  const parseBool = (val) => {
    if (val === undefined || val === null || val === '') return null;
    return val.toString().toUpperCase() === 'TRUE';
  };

  const expectedStarter = parseBool(row.expected_starter);
  const captain = parseBool(row.captain);
  const allConference = parseBool(row.all_conference);
  const allState = parseBool(row.all_state);

  if (expectedStarter !== null) payload.expected_starter = expectedStarter;
  if (captain !== null) payload.captain = captain;
  if (allConference !== null) payload.all_conference = allConference;
  if (allState !== null) payload.all_state = allState;

  return payload;
}

async function upsertProfiles(rows, uuidMap) {
  console.log(`\n[STEP 5] Upserting public.profiles records...`);
  let inserted = 0;
  const errors = [];

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    const userId = uuidMap[email];

    if (!userId) {
      const msg = `SKIP profiles [${email}]: no UUID resolved`;
      console.warn(`  ${msg}`);
      errors.push(msg);
      continue;
    }

    const payload = buildProfilePayload(row, userId);

    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      const msg = `PROFILES ERROR [${email}]: ${error.message}`;
      console.error(`  ${msg}`);
      errors.push(msg);
    } else {
      inserted++;
      console.log(`  [PROFILE OK] ${email} => profiles upserted (${row.full_name})`);
    }

    await sleep(50);
  }

  return { profilesInserted: inserted, profilesErrors: errors };
}

// ---------------------------------------------------------------------------
// Step 6 — Upsert hs_coach_students rows (CRITICAL)
// ---------------------------------------------------------------------------

async function upsertCoachStudents(rows, uuidMap, coachUUID) {
  if (SCHOOL_CONFIG.skip_coach_student_links) {
    console.log('\n[STEP 6] SKIPPED — school config skip_coach_student_links=true (handled by seed_users.js for this school).');
    return { coachLinksInserted: 0, coachLinksErrors: [] };
  }

  console.log(`\n[STEP 6] Upserting hs_coach_students rows (coach => ${coachUUID})...`);
  let inserted = 0;
  const errors = [];

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    const studentUUID = uuidMap[email];

    if (!studentUUID) {
      const msg = `SKIP hs_coach_students [${email}]: no UUID resolved`;
      console.warn(`  ${msg}`);
      errors.push(msg);
      continue;
    }

    const { error } = await supabase.from('hs_coach_students').upsert(
      {
        coach_user_id: coachUUID,
        student_user_id: studentUUID,
      },
      { onConflict: 'coach_user_id,student_user_id' }
    );

    if (error) {
      const msg = `COACH_STUDENTS ERROR [${email}]: ${error.message}`;
      console.error(`  ${msg}`);
      errors.push(msg);
    } else {
      inserted++;
      console.log(`  [COACH LNK]  ${email} => hs_coach_students linked`);
    }

    await sleep(50);
  }

  return { coachLinksInserted: inserted, coachLinksErrors: errors };
}

// ---------------------------------------------------------------------------
// Step 7 — Upsert hs_counselor_students rows
// ---------------------------------------------------------------------------

async function upsertCounselorStudents(rows, uuidMap, counselorUUIDs) {
  if (SCHOOL_CONFIG.skip_counselor_student_links) {
    console.log('\n[STEP 7] SKIPPED — school config skip_counselor_student_links=true (handled by seed_users.js for this school).');
    return { counselorLinksInserted: 0, counselorLinksErrors: [] };
  }

  console.log(`\n[STEP 7] Upserting hs_counselor_students rows...`);
  let inserted = 0;
  const errors = [];

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    const studentUUID = uuidMap[email];
    const counselorEmail = normalizeEmail(row.counselor_email);
    const counselorUUID = counselorUUIDs[counselorEmail];

    if (!studentUUID) {
      const msg = `SKIP hs_counselor_students [${email}]: no student UUID resolved`;
      console.warn(`  ${msg}`);
      errors.push(msg);
      continue;
    }

    if (!counselorUUID) {
      const msg = `SKIP hs_counselor_students [${email}]: no counselor UUID for "${counselorEmail}"`;
      console.warn(`  ${msg}`);
      errors.push(msg);
      continue;
    }

    const { error } = await supabase.from('hs_counselor_students').upsert(
      {
        counselor_user_id: counselorUUID,
        student_user_id: studentUUID,
      },
      { onConflict: 'counselor_user_id,student_user_id' }
    );

    if (error) {
      const msg = `COUNSELOR_STUDENTS ERROR [${email}]: ${error.message}`;
      console.error(`  ${msg}`);
      errors.push(msg);
    } else {
      inserted++;
      console.log(`  [CNSL LNK]   ${email} (${counselorEmail}) => hs_counselor_students linked`);
    }

    await sleep(50);
  }

  return { counselorLinksInserted: inserted, counselorLinksErrors: errors };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Parse CLI args — support --csv <path>
  const args = process.argv.slice(2);
  const csvIndex = args.indexOf('--csv');
  const csvFallbackPath = csvIndex !== -1 ? args[csvIndex + 1] : null;

  console.log('='.repeat(60));
  console.log('bulk_import_students.js');
  console.log(`Target: ${SUPABASE_URL}`);
  console.log(`Coach:  ${PAUL_EMAIL_CANONICAL} (${PAUL_UUID_KNOWN})`);
  console.log(`BC High program ID: ${BC_HIGH_PROGRAM_ID}`);
  console.log('='.repeat(60));

  // Step 1 — Read + validate
  const rawRows = readSheetData(csvFallbackPath);
  console.log(`  Read ${rawRows.length} student rows from source.`);
  const rows = validateRows(rawRows);

  // Step 2 — Resolve UUIDs + preflight
  const { coachUUID, counselorUUIDs } = await resolveCoachAndCounselors(rows);

  // Step 3 — Auth users
  const { uuidMap, authCreated, authSkipped, authErrors } = await createAuthUsers(rows);

  // Step 4 — public.users
  const { publicUsersInserted, publicUsersErrors } = await upsertPublicUsers(rows, uuidMap);

  // Step 5 — public.profiles
  const { profilesInserted, profilesErrors } = await upsertProfiles(rows, uuidMap);

  // Step 6 — hs_coach_students
  const { coachLinksInserted, coachLinksErrors } = await upsertCoachStudents(
    rows,
    uuidMap,
    coachUUID
  );

  // Step 7 — hs_counselor_students
  const { counselorLinksInserted, counselorLinksErrors } = await upsertCounselorStudents(
    rows,
    uuidMap,
    counselorUUIDs
  );

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  const allErrors = [
    ...authErrors,
    ...publicUsersErrors,
    ...profilesErrors,
    ...coachLinksErrors,
    ...counselorLinksErrors,
  ];

  console.log('\n' + '='.repeat(60));
  console.log('BULK IMPORT COMPLETE — Final Counts');
  console.log('='.repeat(60));
  console.log(`  Total students processed:        ${rows.length}`);
  console.log(`  auth.users created:              ${authCreated}`);
  console.log(`  auth.users skipped (existing):   ${authSkipped}`);
  console.log(`  public.users upserted:           ${publicUsersInserted}`);
  console.log(`  public.profiles upserted:        ${profilesInserted}`);
  console.log(`  hs_coach_students links:         ${coachLinksInserted}`);
  console.log(`  hs_counselor_students links:     ${counselorLinksInserted}`);

  if (allErrors.length > 0) {
    console.log(`\nErrors (${allErrors.length}):`);
    allErrors.forEach((e) => console.log(`  - ${e}`));
    process.exit(1);
  } else {
    console.log('\nNo errors.');
    console.log(`\nStudents are now visible on Paul Zukauskas's coach dashboard.`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
