/**
 * audit-migration-tracking.js — Sprint 027 Phase 4 (CF-027-2 follow-up).
 *
 * Compares migration files on the filesystem (supabase/migrations/0NNN_*.sql)
 * against rows in public.supabase_migrations on the live DB. Exits non-zero
 * on drift so this can be wired into CI / pre-deploy checks later.
 *
 * Why this exists: Phase 0 found 11 missing tracking rows for migrations
 * applied via Supabase CLI db push or the Dashboard SQL editor. Sprint 027
 * 0051 backfilled them, but the gap can re-open whenever a migration is
 * applied outside scripts/migrate.js. This audit provides the detection
 * mechanism going forward.
 *
 * Usage:
 *   node scripts/audit-migration-tracking.js
 *   npm run audit:migrations
 *
 * Exit codes:
 *   0 — no drift (all filesystem migrations have a tracking row)
 *   1 — drift detected (one or more migrations missing tracking rows)
 *   2 — runtime error (env vars, network, etc.)
 *
 * Env vars required (loaded from .env):
 *   SUPABASE_PAT         — Personal Access Token for Management API
 *   SUPABASE_PROJECT_REF — e.g. xyudnajzhuwdauwkwsbh
 *     OR
 *   VITE_SUPABASE_URL    — falls back to parsing the ref from the URL
 *
 * Note: This intentionally uses the Management API (same as scripts/migrate.js)
 * rather than the supabase-js client + service role key, so the script can
 * run in any context where a PAT is available (local dev, CI runner, etc.)
 * without needing the service role key.
 */

import { readdirSync } from 'fs';
import { resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');

dotenv.config({ path: resolve(projectRoot, '.env') });

const PAT = process.env.SUPABASE_PAT;
if (!PAT) {
  console.error('ERROR: SUPABASE_PAT not set in .env');
  process.exit(2);
}

let projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef) {
  const url = process.env.VITE_SUPABASE_URL;
  const m = url?.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!m) {
    console.error('ERROR: cannot resolve project ref from env');
    process.exit(2);
  }
  projectRef = m[1];
}

const QUERY_URL = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

function pad(s, n) {
  return String(s).padEnd(n);
}

async function fetchTrackingRowsFrom(query) {
  const res = await fetch(QUERY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tracking query failed (HTTP ${res.status}): ${body}`);
  }
  return res.json();
}

async function fetchTrackingRows() {
  // This project has TWO tracking tables (discovered Sprint 027 Phase 4):
  //   public.supabase_migrations             — written by scripts/migrate.js
  //   supabase_migrations.schema_migrations  — written by Supabase CLI db push
  // A migration is considered "tracked" if it appears in EITHER. We union
  // both to avoid false-positive drift when a migration was applied via the
  // CLI rather than scripts/migrate.js.
  const [publicRows, cliRows] = await Promise.all([
    fetchTrackingRowsFrom(
      'SELECT version, name FROM public.supabase_migrations ORDER BY version'
    ).catch(() => []),
    fetchTrackingRowsFrom(
      'SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version'
    ).catch(() => []),
  ]);
  return {
    publicRows: Array.isArray(publicRows) ? publicRows : [],
    cliRows: Array.isArray(cliRows) ? cliRows : [],
  };
}

function fsMigrations() {
  const dir = resolve(projectRoot, 'supabase', 'migrations');
  const files = readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f));
  return files
    .map((file) => {
      const m = file.match(/^(\d+)/);
      return { version: m[1], file };
    })
    .sort((a, b) => a.version.localeCompare(b.version));
}

(async () => {
  let trackingRows;
  try {
    trackingRows = await fetchTrackingRows();
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(2);
  }

  // Build sets keyed by the numeric version prefix. Tracking rows from
  // scripts/migrate.js use the file's numeric prefix as version (e.g. "0051").
  // Rows from Supabase CLI db push use timestamp versions (e.g. "20260512..."),
  // so we identify them by the `name` field which we backfilled to match
  // the file basename. The audit script considers a file "tracked" if EITHER:
  //   (a) a row exists with version === file's numeric prefix, OR
  //   (b) a row exists with name === file's basename (regardless of version)
  // OR (c) a row in either tracking table has name matching the basename
  //        without the numeric prefix (CLI's slug-only naming convention).
  const allRows = [...trackingRows.publicRows, ...trackingRows.cliRows];
  const trackedByVersion = new Set(allRows.map((r) => r.version));
  const trackedByName = new Set(allRows.map((r) => r.name).filter(Boolean));

  const fs = fsMigrations();
  const missing = [];
  for (const { version, file } of fs) {
    const baseName = basename(file);
    const baseNoExt = baseName.replace(/\.sql$/, '');
    // CLI naming: drop the leading "<digits>_" — e.g. "0001_hs_programs.sql" → "hs_programs"
    const slugOnly = baseNoExt.replace(/^\d+_/, '');
    const tracked =
      trackedByVersion.has(version) ||
      trackedByName.has(baseName) ||
      trackedByName.has(baseNoExt) ||
      trackedByName.has(slugOnly);
    if (!tracked) missing.push({ version, file });
  }

  // Also report orphaned tracking rows — rows present in tracking but no
  // matching file on disk. These usually indicate manual cleanup or pre-CLI
  // history; informational only, not a hard failure.
  const fsVersions = new Set(fs.map((m) => m.version));
  const fsBaseNames = new Set(fs.map((m) => basename(m.file)));
  const fsBaseNoExt = new Set(fs.map((m) => basename(m.file).replace(/\.sql$/, '')));
  const fsSlugs = new Set(fs.map((m) => basename(m.file).replace(/\.sql$/, '').replace(/^\d+_/, '')));
  const orphans = allRows.filter((r) => {
    const matchByVersion = fsVersions.has(r.version);
    const matchByName = (r.name && (fsBaseNames.has(r.name) || fsBaseNoExt.has(r.name) || fsSlugs.has(r.name)));
    return !matchByVersion && !matchByName;
  });

  // Output
  console.log('Migration tracking audit');
  console.log('========================');
  console.log(`Project:                       ${projectRef}`);
  console.log(`Filesystem migrations:         ${fs.length}`);
  console.log(`Tracking rows (public.*):      ${trackingRows.publicRows.length}`);
  console.log(`Tracking rows (CLI schema):    ${trackingRows.cliRows.length}`);
  console.log(`Distinct tracked migrations:   ${new Set([...trackedByVersion, ...trackedByName]).size}`);
  console.log(`Missing tracking rows:         ${missing.length}`);
  console.log(`Orphan tracking rows:          ${orphans.length} (informational)`);
  console.log('');

  if (missing.length > 0) {
    console.log('MISSING TRACKING ROWS — drift detected:');
    console.log(`  ${pad('version', 10)} file`);
    for (const m of missing) {
      console.log(`  ${pad(m.version, 10)} ${m.file}`);
    }
    console.log('');
    console.log('Fix: apply the missing migrations via npm run migrate, OR');
    console.log('     backfill manually with: INSERT INTO public.supabase_migrations (version, name) VALUES (...)');
  }

  if (orphans.length > 0) {
    console.log('Orphan tracking rows (no file on disk — typically pre-CLI history):');
    for (const o of orphans) {
      console.log(`  version=${o.version} name=${o.name ?? '(null)'}`);
    }
    console.log('');
  }

  if (missing.length === 0) {
    console.log('OK — no drift. All filesystem migrations have a tracking row.');
    process.exit(0);
  }
  process.exit(1);
})().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(2);
});
