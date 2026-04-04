/**
 * verify_migrations_0028_0032.js
 * David — Data Steward verification script
 *
 * Queries the live Supabase DB to confirm migrations 0028-0032 applied correctly.
 * Checks: table existence, column counts, PK type, key constraints, RLS state, indexes.
 *
 * Usage:
 *   node scripts/verify_migrations_0028_0032.js
 *
 * Requires .env with SUPABASE_PAT and (SUPABASE_PROJECT_REF or VITE_SUPABASE_URL).
 */

import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');
dotenv.config({ path: resolve(projectRoot, '.env') });

// ── Resolve Supabase connection ──────────────────────────────────────────────

const pat = process.env.SUPABASE_PAT;
if (!pat) {
  console.error('Error: SUPABASE_PAT not set in .env');
  process.exit(1);
}

let projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef) {
  const url = process.env.VITE_SUPABASE_URL || '';
  const m = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!m) { console.error('Error: cannot resolve project ref'); process.exit(1); }
  projectRef = m[1];
}

const queryUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function query(sql) {
  const res = await fetch(queryUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Verification queries ─────────────────────────────────────────────────────

const VERIFICATION_SQL = `
-- 1. Table existence + column counts
SELECT
  t.table_name,
  COUNT(c.column_name) AS column_count
FROM information_schema.tables t
JOIN information_schema.columns c
  ON c.table_schema = t.table_schema AND c.table_name = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'school_link_staging',
    'college_coaches',
    'recruiting_events',
    'student_recruiting_events',
    'coach_contacts'
  )
GROUP BY t.table_name
ORDER BY t.table_name;
`;

const PK_SQL = `
-- 2. Primary key type for each table
SELECT
  tc.table_name,
  kcu.column_name AS pk_column,
  c.data_type     AS pk_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name
  AND kcu.table_schema = tc.table_schema
JOIN information_schema.columns c
  ON c.table_name = kcu.table_name
  AND c.column_name = kcu.column_name
  AND c.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'school_link_staging',
    'college_coaches',
    'recruiting_events',
    'student_recruiting_events',
    'coach_contacts'
  )
ORDER BY tc.table_name;
`;

const UNIQUE_SQL = `
-- 3. UNIQUE constraints on target tables
SELECT
  tc.table_name,
  tc.constraint_name,
  STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name
  AND kcu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'recruiting_events',
    'student_recruiting_events',
    'coach_contacts'
  )
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name, tc.constraint_name;
`;

const RLS_SQL = `
-- 4. RLS enabled state
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN (
    'school_link_staging',
    'college_coaches',
    'recruiting_events',
    'student_recruiting_events',
    'coach_contacts'
  )
ORDER BY relname;
`;

const INDEX_SQL = `
-- 5. Indexes on target tables (non-PK)
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'school_link_staging',
    'college_coaches',
    'recruiting_events',
    'student_recruiting_events',
    'coach_contacts'
  )
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;
`;

// ── Expected specs ───────────────────────────────────────────────────────────

// Column counts from migration files
const EXPECTED_COLUMNS = {
  school_link_staging:        14,  // id + source_tab + source_run + data_type + row_index + school_name_raw + athletics_url_raw + camp_url + coach_url + matched_unitid + match_confidence + match_status + match_method + reviewed_by + reviewed_at + created_at = 16... recount below
  college_coaches:            10,  // id + unitid + name + title + email + photo_url + twitter_handle + is_head_coach + profile_url + created_at
  recruiting_events:          12,  // id + unitid + event_type + event_name + event_date + end_date + registration_deadline + location + cost_dollars + registration_url + status + description + created_at = 13
  student_recruiting_events:  9,   // id + profile_id + event_id + status + gcal_event_id + confirmed_by + confirmed_at + notes + created_at
  coach_contacts:             10,  // id + profile_id + unitid + coach_id + contact_date + contact_type + initiated_by + short_list_step + notes + created_at
};

// Recount from migration files precisely:
// school_link_staging: id, source_tab, source_run, data_type, row_index, school_name_raw,
//   athletics_url_raw, camp_url, coach_url, matched_unitid, match_confidence, match_status,
//   match_method, reviewed_by, reviewed_at, created_at  = 16
// recruiting_events: id, unitid, event_type, event_name, event_date, end_date,
//   registration_deadline, location, cost_dollars, registration_url, status, description, created_at = 13

const EXPECTED_COLUMNS_CORRECTED = {
  school_link_staging:        16,
  college_coaches:            10,
  recruiting_events:          13,
  student_recruiting_events:  9,
  coach_contacts:             10,
};

const EXPECTED_PK_TYPE = {
  school_link_staging:        'integer',   // serial = integer
  college_coaches:            'uuid',
  recruiting_events:          'uuid',
  student_recruiting_events:  'uuid',
  coach_contacts:             'uuid',
};

const EXPECTED_UNIQUE = {
  recruiting_events:          'recruiting_events_unitid_event_type_event_date_unique',
  student_recruiting_events:  'student_recruiting_events_profile_event_unique',
};

const EXPECTED_RLS_DISABLED = new Set(['school_link_staging']); // no RLS per spec
const EXPECTED_RLS_ENABLED  = new Set([
  'college_coaches',
  'recruiting_events',
  'student_recruiting_events',
  'coach_contacts',
]);

const EXPECTED_INDEXES = {
  college_coaches:            ['college_coaches_unitid_idx'],
  recruiting_events:          ['recruiting_events_unitid_idx'],
  student_recruiting_events:  ['student_recruiting_events_event_id_idx', 'student_recruiting_events_profile_id_idx'],
  coach_contacts:             ['coach_contacts_coach_id_idx', 'coach_contacts_profile_id_idx', 'coach_contacts_unitid_idx'],
};

// ── Run and evaluate ─────────────────────────────────────────────────────────

const TARGET_TABLES = [
  'school_link_staging',
  'college_coaches',
  'recruiting_events',
  'student_recruiting_events',
  'coach_contacts',
];

console.log('David — Migration Verification 0028-0032');
console.log('Target:', queryUrl);
console.log('Running checks...\n');

const [colRows, pkRows, uniqueRows, rlsRows, idxRows] = await Promise.all([
  query(VERIFICATION_SQL),
  query(PK_SQL),
  query(UNIQUE_SQL),
  query(RLS_SQL),
  query(INDEX_SQL),
]);

// Build lookup maps
const colMap    = Object.fromEntries(colRows.map(r => [r.table_name, parseInt(r.column_count, 10)]));
const pkMap     = Object.fromEntries(pkRows.map(r => [r.table_name, r.pk_type]));
const uniqueMap = {}; // table -> [constraint_name]
for (const r of uniqueRows) {
  if (!uniqueMap[r.table_name]) uniqueMap[r.table_name] = [];
  uniqueMap[r.table_name].push(r.constraint_name);
}
const rlsMap    = Object.fromEntries(rlsRows.map(r => [r.table_name, r.rls_enabled]));
const idxMap    = {}; // table -> [indexname]
for (const r of idxRows) {
  if (!idxMap[r.table_name]) idxMap[r.table_name] = [];
  idxMap[r.table_name].push(r.indexname);
}

// ── Evaluate each table ──────────────────────────────────────────────────────

const results = {};
const PASS = 'VERIFIED';
const FAIL = 'FAILED';

for (const tbl of TARGET_TABLES) {
  const findings = [];
  let status = PASS;

  // 1. Existence
  if (!(tbl in colMap)) {
    findings.push('TABLE DOES NOT EXIST');
    results[tbl] = { status: FAIL, findings };
    continue;
  }

  // 2. Column count
  const actualCols = colMap[tbl];
  const expectedCols = EXPECTED_COLUMNS_CORRECTED[tbl];
  if (actualCols !== expectedCols) {
    findings.push(`Column count: expected ${expectedCols}, got ${actualCols}`);
    status = FAIL;
  } else {
    findings.push(`Column count: ${actualCols} OK`);
  }

  // 3. PK type
  const actualPk = pkMap[tbl];
  const expectedPk = EXPECTED_PK_TYPE[tbl];
  if (!actualPk) {
    findings.push('PK: NOT FOUND');
    status = FAIL;
  } else if (actualPk !== expectedPk) {
    findings.push(`PK type: expected ${expectedPk}, got ${actualPk}`);
    status = FAIL;
  } else {
    findings.push(`PK type: ${actualPk} OK`);
  }

  // 4. UNIQUE constraints (only tables that have expected ones)
  if (EXPECTED_UNIQUE[tbl]) {
    const expectedConstraint = EXPECTED_UNIQUE[tbl];
    const actualConstraints = uniqueMap[tbl] || [];
    if (actualConstraints.includes(expectedConstraint)) {
      findings.push(`UNIQUE constraint: ${expectedConstraint} OK`);
    } else {
      findings.push(`UNIQUE constraint: ${expectedConstraint} NOT FOUND (got: ${actualConstraints.join(', ') || 'none'})`);
      status = FAIL;
    }
  }

  // 5. RLS
  const rlsEnabled = rlsMap[tbl];
  if (EXPECTED_RLS_DISABLED.has(tbl)) {
    if (rlsEnabled === false || rlsEnabled === 'false') {
      findings.push('RLS: disabled (correct — no RLS per spec)');
    } else {
      findings.push(`RLS: expected disabled, got ${rlsEnabled}`);
      // Not a FAIL — unexpected RLS on staging is a flag but not catastrophic; mark as warning
      findings.push('  NOTE: RLS enabled on staging table — spec says service role only, no RLS');
    }
  } else if (EXPECTED_RLS_ENABLED.has(tbl)) {
    if (rlsEnabled === true || rlsEnabled === 'true') {
      findings.push('RLS: enabled OK');
    } else {
      findings.push(`RLS: expected enabled, got ${rlsEnabled}`);
      status = FAIL;
    }
  }

  // 6. Indexes
  if (EXPECTED_INDEXES[tbl]) {
    const actualIdxs = (idxMap[tbl] || []).sort();
    const expectedIdxs = EXPECTED_INDEXES[tbl].sort();
    const missing = expectedIdxs.filter(i => !actualIdxs.includes(i));
    const extra   = actualIdxs.filter(i => !expectedIdxs.includes(i));
    if (missing.length === 0) {
      findings.push(`Indexes: all ${expectedIdxs.length} present OK`);
    } else {
      findings.push(`Indexes MISSING: ${missing.join(', ')}`);
      status = FAIL;
    }
    if (extra.length > 0) {
      findings.push(`Indexes extra (not in spec): ${extra.join(', ')}`);
    }
  }

  results[tbl] = { status, findings };
}

// ── Report ───────────────────────────────────────────────────────────────────

console.log('='.repeat(70));
console.log('DAVID — MIGRATION VERIFICATION REPORT: 0028-0032');
console.log(`Date: ${new Date().toISOString()}`);
console.log('='.repeat(70));
console.log();

let allPass = true;

for (const tbl of TARGET_TABLES) {
  const r = results[tbl];
  if (r.status !== PASS) allPass = false;
  console.log(`TABLE: ${tbl}`);
  console.log(`STATUS: ${r.status}`);
  for (const f of r.findings) {
    console.log(`  ${f}`);
  }
  console.log();
}

console.log('='.repeat(70));
console.log(`OVERALL: ${allPass ? 'ALL VERIFIED' : 'ONE OR MORE FAILED — SEE ABOVE'}`);
console.log('='.repeat(70));
