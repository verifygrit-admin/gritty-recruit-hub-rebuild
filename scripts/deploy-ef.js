/**
 * deploy-ef.js — Deploy a single Edge Function to Supabase via the Supabase CLI.
 *
 * Usage:
 *   node scripts/deploy-ef.js <function-slug>
 *   node scripts/deploy-ef.js admin-read-users
 *
 * Env vars required (loaded from .env in project root):
 *   SUPABASE_PAT               — Personal Access Token (set as SUPABASE_ACCESS_TOKEN for CLI)
 *   SUPABASE_PROJECT_REF       — e.g. xyudnajzhuwdauwkwsbh
 *     OR
 *   VITE_SUPABASE_URL          — https://xyudnajzhuwdauwkwsbh.supabase.co
 *
 * Source: supabase/functions/<slug>/index.ts
 *
 * Deploy method: npx supabase functions deploy --use-api --no-verify-jwt --project-ref <ref>
 *
 * NOTE: The raw Management API body-upload method (POST/PATCH with body field) does NOT
 * produce a valid eszip bundle and results in BOOT_ERROR on the Supabase Edge Runtime.
 * The Supabase CLI --use-api flag bundles and uploads correctly without requiring Docker
 * or a local config.toml. Always use the CLI for EF deployments.
 *
 * IMPORTANT: --no-verify-jwt is required. All admin EFs handle their own auth internally
 * via getUser() + app_metadata.role check. Without this flag, Supabase's API gateway (Kong)
 * validates the JWT before the EF code runs, which rejects valid session tokens with
 * "Invalid JWT". See: 2026-04-12 production incident (verify_jwt mismatch).
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execSync } from 'child_process';

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

// ── Verify function source exists ─────────────────────────────────────────────

const sourcePath = resolve(projectRoot, 'supabase', 'functions', slug, 'index.ts');
if (!existsSync(sourcePath)) {
  console.error(`Error: function source not found: ${sourcePath}`);
  process.exit(1);
}

console.log(`Function source confirmed: ${sourcePath}`);

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

// ── Deploy via Supabase CLI ───────────────────────────────────────────────────

console.log(`Deploying via: npx supabase functions deploy ${slug} --project-ref ${projectRef} --use-api --no-verify-jwt`);

try {
  const output = execSync(
    `npx supabase functions deploy ${slug} --project-ref ${projectRef} --use-api --no-verify-jwt`,
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: pat,
      },
      stdio: 'pipe',
      encoding: 'utf8',
    }
  );
  console.log(output);
} catch (err) {
  console.error('Deploy failed.');
  console.error(err.stdout || '');
  console.error(err.stderr || '');
  process.exit(1);
}

console.log(`Function URL: https://${projectRef}.supabase.co/functions/v1/${slug}`);
console.log('Done.');
