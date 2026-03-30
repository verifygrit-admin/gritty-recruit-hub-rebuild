/**
 * backfill-hudl-avatars.js
 *
 * Backfills Hudl avatar images for all students who have a hudl_url but
 * no avatar_storage_path set. Calls the fetch-hudl-avatar Edge Function
 * for each eligible student, one at a time with a delay between calls to
 * avoid rate-limiting Hudl's servers.
 *
 * Usage:
 *   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/backfill-hudl-avatars.js
 *
 * Optional flags:
 *   --dry-run    Print eligible students but do not call the Edge Function
 *   --delay N    Milliseconds between requests (default: 2000)
 *   --limit N    Process only the first N students (useful for testing)
 *
 * The script is safe to re-run. Students who already have avatar_storage_path
 * set are skipped unless --force is passed.
 *
 * Authored by: Patch (GAS Engineer) 2026-03-30
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
  process.exit(1);
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const force = args.includes('--force');
const delayIdx = args.indexOf('--delay');
const delayMs = delayIdx !== -1 ? parseInt(args[delayIdx + 1], 10) : 2000;
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/fetch-hudl-avatar`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('backfill-hudl-avatars: starting');
  console.log(`  dry-run: ${isDryRun}`);
  console.log(`  force:   ${force}`);
  console.log(`  delay:   ${delayMs}ms`);
  console.log(`  limit:   ${limit ?? 'none'}`);
  console.log('');

  // Fetch eligible students
  let query = supabase
    .from('profiles')
    .select('user_id, name, hudl_url, avatar_storage_path')
    .not('hudl_url', 'is', null);

  if (!force) {
    query = query.is('avatar_storage_path', null);
  }

  const { data: students, error } = await query;

  if (error) {
    console.error('Error fetching profiles:', error.message);
    process.exit(1);
  }

  let eligible = students || [];
  if (limit !== null) {
    eligible = eligible.slice(0, limit);
  }

  console.log(`Found ${eligible.length} eligible student(s).`);
  if (eligible.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  if (isDryRun) {
    console.log('\nDry-run mode — would process:');
    for (const s of eligible) {
      console.log(`  ${s.user_id}  ${s.name || '(no name)'}  ${s.hudl_url}`);
    }
    return;
  }

  let successCount = 0;
  let placeholderCount = 0;
  let errorCount = 0;

  for (let i = 0; i < eligible.length; i++) {
    const student = eligible[i];
    const label = `[${i + 1}/${eligible.length}] ${student.name || student.user_id}`;

    process.stdout.write(`${label} — fetching... `);

    try {
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          user_id: student.user_id,
          hudl_url: student.hudl_url,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        process.stdout.write(`ERROR ${res.status}: ${json.error || 'unknown'}\n`);
        errorCount++;
      } else if (json.status === 'uploaded') {
        process.stdout.write(`uploaded -> ${json.path}\n`);
        successCount++;
      } else if (json.status === 'placeholder' || json.status === 'no_photo') {
        process.stdout.write(`placeholder (no photo on Hudl)\n`);
        placeholderCount++;
      } else {
        process.stdout.write(`ok: ${JSON.stringify(json)}\n`);
        successCount++;
      }
    } catch (err) {
      process.stdout.write(`FETCH ERROR: ${err.message}\n`);
      errorCount++;
    }

    // Rate-limit delay between requests (skip after last item)
    if (i < eligible.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`  Uploaded:    ${successCount}`);
  console.log(`  Placeholder: ${placeholderCount}`);
  console.log(`  Errors:      ${errorCount}`);
  console.log(`  Total:       ${eligible.length}`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
