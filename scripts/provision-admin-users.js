/**
 * provision-admin-users.js
 * One-time script to set app_metadata.role = 'admin' on the two GrittyOS admin accounts.
 *
 * Accounts:
 *   chris@grittyfb.com    — user id known (hardcoded below, confirmed by Chris)
 *   verifygrit@gmail.com  — user id resolved at runtime via listUsers() email lookup
 *
 * Safe merge strategy:
 *   1. Read current user from auth.users to capture existing app_metadata.
 *   2. Merge { role: 'admin' } into the existing metadata object.
 *   3. Write the merged result back via updateUserById().
 *   This prevents wiping provider/providers fields that Supabase sets on account creation.
 *
 * IMPORTANT: DO NOT RUN without Scout + Chris authorization.
 * This script writes to auth.users in production via the service_role key.
 * It is a one-time operation — running it twice is idempotent (same result) but
 * the CHECK WITH ME gate must clear before the first run.
 *
 * Usage (from project root):
 *   node scripts/provision-admin-users.js
 *
 * Env vars required (from .env via dotenv/config):
 *   SUPABASE_URL or VITE_SUPABASE_URL  — project URL
 *   SUPABASE_SERVICE_ROLE_KEY          — service role key (never the anon key)
 */

import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// .env uses VITE_SUPABASE_URL for the Vite frontend build.
// seed_users.js expects SUPABASE_URL bare. Support both so no new env var is needed.
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'ERROR: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be set.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ---------------------------------------------------------------------------
// Known account — user id confirmed by Chris on 2026-04-10.
// ---------------------------------------------------------------------------

const KNOWN_ADMIN = {
  email: 'chris@grittyfb.com',
  userId: '4fc7abee-6ffa-4a45-891f-2b3a3a8516dd',
};

// ---------------------------------------------------------------------------
// Helper: resolve a user id by email via listUsers()
// ---------------------------------------------------------------------------

/**
 * Finds a Supabase auth user by email address.
 * listUsers() is paginated — this function pages through until it finds a match
 * or exhausts all pages. Throws if the user is not found.
 *
 * @param {string} email
 * @returns {Promise<{ id: string, app_metadata: object }>}
 */
async function findUserByEmail(email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`listUsers() failed (page ${page}): ${error.message}`);
    }

    if (!data?.users || data.users.length === 0) {
      throw new Error(`User not found in auth.users: ${email}`);
    }

    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (match) {
      return { id: match.id, app_metadata: match.app_metadata ?? {} };
    }

    // If the page returned fewer results than perPage, we've reached the end.
    if (data.users.length < perPage) {
      throw new Error(`User not found in auth.users after full scan: ${email}`);
    }

    page++;
  }
}

// ---------------------------------------------------------------------------
// Helper: read a user by id
// ---------------------------------------------------------------------------

/**
 * Reads a single auth user by id to capture their current app_metadata.
 * Used for the merge-safe update path.
 *
 * @param {string} userId
 * @returns {Promise<{ id: string, email: string, app_metadata: object }>}
 */
async function getUserById(userId) {
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error || !data?.user) {
    throw new Error(
      `getUserById(${userId}) failed: ${error?.message ?? 'no user returned'}`
    );
  }

  return {
    id: data.user.id,
    email: data.user.email,
    app_metadata: data.user.app_metadata ?? {},
  };
}

// ---------------------------------------------------------------------------
// Helper: merge-safe admin role provision
// ---------------------------------------------------------------------------

/**
 * Provisions app_metadata.role = 'admin' on a single user.
 * Reads current metadata first, merges role in, writes back.
 * Logs the result on success. Throws on any failure.
 *
 * @param {string} userId
 * @param {string} email  (for log output only)
 */
async function provisionAdminRole(userId, email) {
  console.log(`\n[PROVISIONING] ${email} (${userId})`);

  // Step 1: Read current user to capture existing app_metadata.
  const current = await getUserById(userId);
  const existingMeta = current.app_metadata;

  console.log(`  Current app_metadata: ${JSON.stringify(existingMeta)}`);

  // Step 2: Merge { role: 'admin' } into existing metadata.
  // This preserves provider, providers, and any other fields Supabase set.
  const mergedMeta = {
    ...existingMeta,
    role: 'admin',
  };

  console.log(`  Merged app_metadata:  ${JSON.stringify(mergedMeta)}`);

  // Step 3: Write the merged metadata back.
  const { data: updateData, error: updateError } =
    await supabase.auth.admin.updateUserById(userId, {
      app_metadata: mergedMeta,
    });

  if (updateError || !updateData?.user) {
    throw new Error(
      `updateUserById(${userId}) failed: ${updateError?.message ?? 'no user returned'}`
    );
  }

  const finalMeta = updateData.user.app_metadata;

  // Step 4: Confirm role is present in the returned metadata.
  if (finalMeta?.role !== 'admin') {
    throw new Error(
      `Update reported success but returned app_metadata.role is not 'admin': ${JSON.stringify(finalMeta)}`
    );
  }

  console.log(`  [OK] ${email} — final app_metadata: ${JSON.stringify(finalMeta)}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(60));
  console.log('provision-admin-users.js');
  console.log('Sets app_metadata.role = admin on two GrittyOS admin accounts.');
  console.log('='.repeat(60));

  const errors = [];

  // -- Account 1: chris@grittyfb.com — user id known, no lookup needed.
  console.log(`\n--- Account 1: ${KNOWN_ADMIN.email} ---`);
  try {
    await provisionAdminRole(KNOWN_ADMIN.userId, KNOWN_ADMIN.email);
  } catch (err) {
    const msg = `FAILED [${KNOWN_ADMIN.email}]: ${err.message}`;
    console.error(msg);
    errors.push(msg);
  }

  // -- Account 2: verifygrit@gmail.com — user id resolved at runtime.
  const vegEmail = 'verifygrit@gmail.com';
  console.log(`\n--- Account 2: ${vegEmail} ---`);
  try {
    console.log(`  Resolving user id by email via listUsers()...`);
    const found = await findUserByEmail(vegEmail);
    console.log(`  Resolved user id: ${found.id}`);
    await provisionAdminRole(found.id, vegEmail);
  } catch (err) {
    const msg = `FAILED [${vegEmail}]: ${err.message}`;
    console.error(msg);
    errors.push(msg);
  }

  // ---------------------------------------------------------------------------
  // Final report
  // ---------------------------------------------------------------------------

  console.log('\n' + '='.repeat(60));
  console.log('PROVISION COMPLETE');
  console.log('='.repeat(60));

  if (errors.length === 0) {
    console.log('Both accounts provisioned successfully.');
    console.log('Both JWTs will carry app_metadata.role = "admin" on next sign-in.');
    console.log('\nNext step: Chris signs in to both accounts and Dexter runs the gate check.');
  } else {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach((e) => console.log(`  - ${e}`));
    console.log(
      '\nDo not proceed to Dexter gate check until all errors are resolved.'
    );
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
