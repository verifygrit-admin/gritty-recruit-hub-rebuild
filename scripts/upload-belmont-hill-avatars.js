/**
 * upload-belmont-hill-avatars.js
 *
 * One-off script. Uploads the three locally-staged Hudl profile pictures for
 * the Belmont Hill onboarding cohort (Sprint 021 Goal 1) directly to the
 * `avatars` Supabase Storage bucket and updates `profiles.avatar_storage_path`
 * for each. Replaces the fetch-hudl-avatar Edge Function path for these three
 * specific users — we already have the images on disk so there's no Hudl
 * scrape to perform.
 *
 * Usage:
 *   node scripts/upload-belmont-hill-avatars.js
 *
 * Env:
 *   SUPABASE_URL                 — loaded from .env via dotenv
 *   SUPABASE_SERVICE_ROLE_KEY    — loaded from .env via dotenv
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const STUDENTS = [
  {
    user_id: '99942a06-44ff-4f78-ba6c-2f31edfa9c6a',
    email: 'kromahaj@belmonthill.org',
    name: 'Ajani Kromah',
    file: 'src/assets/kromah_hudl_profile_pic.jpg',
  },
  {
    user_id: 'd892c717-214a-4117-9c54-2ba8aebca533',
    email: 'monteiroky@belmonthill.org',
    name: 'Ky-Mani Monteiro',
    file: 'src/assets/monteiro_hudl_profile_pic.jpg',
  },
  {
    user_id: '799b483a-97ed-49e2-8f4d-aac8c803c8ad',
    email: 'copelandul@belmonthill.org',
    name: 'Ricky Copeland',
    file: 'src/assets/copeland_hudl_profile_pic.jpg',
  },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function uploadOne(student) {
  const localPath = resolve(REPO_ROOT, student.file);
  const objectPath = `${student.user_id}/avatar.jpg`;

  process.stdout.write(`${student.name} (${student.email})\n`);
  process.stdout.write(`  reading ${student.file}... `);
  const buffer = await readFile(localPath);
  process.stdout.write(`${buffer.byteLength} bytes\n`);

  process.stdout.write(`  uploading to avatars/${objectPath}... `);
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(objectPath, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (uploadError) {
    process.stdout.write(`ERROR: ${uploadError.message}\n`);
    throw uploadError;
  }
  process.stdout.write(`ok\n`);

  process.stdout.write(`  updating profiles.avatar_storage_path... `);
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_storage_path: objectPath })
    .eq('user_id', student.user_id);
  if (updateError) {
    process.stdout.write(`ERROR: ${updateError.message}\n`);
    throw updateError;
  }
  process.stdout.write(`ok\n`);

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(objectPath);
  process.stdout.write(`  public URL: ${pub.publicUrl}\n\n`);
}

async function main() {
  console.log('upload-belmont-hill-avatars: starting');
  console.log(`  SUPABASE_URL: ${SUPABASE_URL}`);
  console.log(`  ${STUDENTS.length} student(s) to process\n`);

  for (const s of STUDENTS) {
    await uploadOne(s);
  }

  console.log('All uploads complete.');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
