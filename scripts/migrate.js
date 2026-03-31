/**
 * migrate.js — Run a single SQL migration file against Supabase via HTTPS.
 *
 * Usage:
 *   node scripts/migrate.js supabase/migrations/0027_example.sql
 *   npm run migrate -- supabase/migrations/0027_example.sql
 *
 * Env vars required (loaded from .env in project root):
 *   SUPABASE_PAT               — Personal Access Token (generate at https://app.supabase.com/account/tokens)
 *   SUPABASE_PROJECT_REF       — e.g. xyudnajzhuwdauwkwsbh
 *     OR
 *   VITE_SUPABASE_URL          — https://xyudnajzhuwdauwkwsbh.supabase.co
 *     (SUPABASE_PROJECT_REF takes precedence if both are set)
 *
 * Endpoint: Supabase Management API — https://api.supabase.com/v1/projects/{ref}/database/query
 */

import { readFileSync } from 'fs';
import { resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Load dotenv — devDependency, ESM-safe via createRequire
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');

dotenv.config({ path: resolve(projectRoot, '.env') });

// ── Resolve CLI arg ──────────────────────────────────────────────────────────

const [, , migrationArg] = process.argv;

if (!migrationArg) {
  console.error('Error: migration file path required.');
  console.error('  Usage: node scripts/migrate.js supabase/migrations/0027_example.sql');
  process.exit(1);
}

const migrationPath = resolve(projectRoot, migrationArg);

// ── Read migration SQL ───────────────────────────────────────────────────────

let sql;
try {
  sql = readFileSync(migrationPath, 'utf8');
} catch (err) {
  console.error(`Error: could not read migration file: ${migrationPath}`);
  console.error(err.message);
  process.exit(1);
}

// ── Resolve Supabase project ref ─────────────────────────────────────────────

const pat = process.env.SUPABASE_PAT;
if (!pat) {
  console.error(
    'Error: SUPABASE_PAT is not set in .env. Generate one at https://app.supabase.com/account/tokens'
  );
  process.exit(1);
}

let projectRef = process.env.SUPABASE_PROJECT_REF;

if (!projectRef) {
  // Fall back: parse from VITE_SUPABASE_URL
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error(
      'Error: neither SUPABASE_PROJECT_REF nor VITE_SUPABASE_URL is set in .env'
    );
    process.exit(1);
  }
  // https://abcdefg.supabase.co  →  abcdefg
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    console.error(
      `Error: could not parse project ref from VITE_SUPABASE_URL: ${supabaseUrl}`
    );
    process.exit(1);
  }
  projectRef = match[1];
}

// ── Parse migration filename ─────────────────────────────────────────────────

const fileName = basename(migrationPath); // e.g. 0027_example.sql
// Version = numeric prefix before the first underscore
const versionMatch = fileName.match(/^(\d+)/);
if (!versionMatch) {
  console.error(
    `Error: migration filename must start with a numeric prefix (e.g. 0027_example.sql). Got: ${fileName}`
  );
  process.exit(1);
}
const version = versionMatch[1]; // "0027"

// ── Execute migration ────────────────────────────────────────────────────────

const queryUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

console.log(`Running migration: ${fileName}`);
console.log(`Target: ${queryUrl}`);

let queryResponse;
try {
  queryResponse = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
} catch (err) {
  console.error('Error: network request failed.');
  console.error(err.message);
  process.exit(1);
}

if (!queryResponse.ok) {
  const body = await queryResponse.text();
  console.error(`Error: migration query failed (HTTP ${queryResponse.status}).`);
  console.error(body);
  process.exit(1);
}

console.log(`Migration SQL executed successfully.`);

// ── Record migration history ─────────────────────────────────────────────────

const historySQL = `INSERT INTO supabase_migrations (version, name) VALUES ('${version}', '${fileName}')`;

let historyResponse;
try {
  historyResponse = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: historySQL }),
  });
} catch (err) {
  console.error('Warning: migration ran but failed to record history.');
  console.error(err.message);
  process.exit(1);
}

if (!historyResponse.ok) {
  const body = await historyResponse.text();
  console.error(`Warning: migration ran but history insert failed (HTTP ${historyResponse.status}).`);
  console.error(body);
  process.exit(1);
}

console.log(`Migration history recorded: version=${version}, name=${fileName}`);
console.log('Done.');
