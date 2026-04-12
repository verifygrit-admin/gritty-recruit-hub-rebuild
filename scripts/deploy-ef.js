/**
 * deploy-ef.js — Deploy a single Edge Function to Supabase via the Management API.
 *
 * Usage:
 *   node scripts/deploy-ef.js <function-slug>
 *   node scripts/deploy-ef.js admin-read-users
 *
 * Env vars required (loaded from .env in project root):
 *   SUPABASE_PAT               — Personal Access Token
 *   SUPABASE_PROJECT_REF       — e.g. xyudnajzhuwdauwkwsbh
 *     OR
 *   VITE_SUPABASE_URL          — https://xyudnajzhuwdauwkwsbh.supabase.co
 *
 * Source: supabase/functions/<slug>/index.ts
 *
 * API endpoints used:
 *   GET    https://api.supabase.com/v1/projects/{ref}/functions/{slug}  (existence check)
 *   POST   https://api.supabase.com/v1/projects/{ref}/functions          (create)
 *   PATCH  https://api.supabase.com/v1/projects/{ref}/functions/{slug}   (update)
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');

dotenv.config({ path: resolve(projectRoot, '.env') });

// ── Resolve CLI arg ───────────────────────────────────────────────────────────

const [, , slug] = process.argv;

if (!slug) {
  console.error('Error: function slug required.');
  console.error('  Usage: node scripts/deploy-ef.js admin-read-users');
  process.exit(1);
}

// ── Read function source ──────────────────────────────────────────────────────

const sourcePath = resolve(projectRoot, 'supabase', 'functions', slug, 'index.ts');
let sourceBody;
try {
  sourceBody = readFileSync(sourcePath, 'utf8');
} catch (err) {
  console.error(`Error: could not read function source: ${sourcePath}`);
  console.error(err.message);
  process.exit(1);
}

console.log(`Function source read: ${sourcePath} (${sourceBody.length} bytes)`);

// ── Resolve credentials ───────────────────────────────────────────────────────

const pat = process.env.SUPABASE_PAT;
if (!pat) {
  console.error('Error: SUPABASE_PAT is not set in .env');
  process.exit(1);
}

let projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error('Error: neither SUPABASE_PROJECT_REF nor VITE_SUPABASE_URL is set in .env');
    process.exit(1);
  }
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    console.error(`Error: could not parse project ref from VITE_SUPABASE_URL: ${supabaseUrl}`);
    process.exit(1);
  }
  projectRef = match[1];
}

console.log(`Project ref: ${projectRef}`);
console.log(`Function slug: ${slug}`);

const baseUrl = `https://api.supabase.com/v1/projects/${projectRef}/functions`;
const headers = {
  Authorization: `Bearer ${pat}`,
  'Content-Type': 'application/json',
};

// ── Check if function already exists ─────────────────────────────────────────

console.log(`Checking if function '${slug}' already exists...`);

let existsResponse;
try {
  existsResponse = await fetch(`${baseUrl}/${slug}`, { method: 'GET', headers });
} catch (err) {
  console.error('Error: network request failed on existence check.');
  console.error(err.message);
  process.exit(1);
}

const functionExists = existsResponse.status === 200;
console.log(`Function exists: ${functionExists} (HTTP ${existsResponse.status})`);

// ── Create or update ──────────────────────────────────────────────────────────

const body = JSON.stringify({
  slug,
  name: slug,
  body: sourceBody,
  verify_jwt: true,
});

let deployResponse;

if (functionExists) {
  console.log(`Updating existing function via PATCH ${baseUrl}/${slug} ...`);
  try {
    deployResponse = await fetch(`${baseUrl}/${slug}`, {
      method: 'PATCH',
      headers,
      body,
    });
  } catch (err) {
    console.error('Error: network request failed on PATCH.');
    console.error(err.message);
    process.exit(1);
  }
} else {
  console.log(`Creating new function via POST ${baseUrl} ...`);
  try {
    deployResponse = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body,
    });
  } catch (err) {
    console.error('Error: network request failed on POST.');
    console.error(err.message);
    process.exit(1);
  }
}

// ── Report result ─────────────────────────────────────────────────────────────

const responseText = await deployResponse.text();

if (!deployResponse.ok) {
  console.error(`Deploy failed (HTTP ${deployResponse.status}).`);
  console.error(responseText);
  process.exit(1);
}

console.log(`Deploy succeeded (HTTP ${deployResponse.status}).`);
console.log(responseText);
console.log();
console.log(`Function URL: https://${projectRef}.supabase.co/functions/v1/${slug}`);
console.log('Done.');
