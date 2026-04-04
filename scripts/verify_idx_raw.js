/**
 * verify_idx_raw.js — raw index dump for 0028-0032 tables
 * David — supplemental query only
 */
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');
dotenv.config({ path: resolve(projectRoot, '.env') });

const pat = process.env.SUPABASE_PAT;
let projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef) {
  const m = (process.env.VITE_SUPABASE_URL || '').match(/https:\/\/([^.]+)\.supabase\.co/);
  projectRef = m ? m[1] : null;
}
const queryUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function query(sql) {
  const res = await fetch(queryUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const rows = await query(`
  SELECT tablename, indexname, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN (
      'school_link_staging',
      'college_coaches',
      'recruiting_events',
      'student_recruiting_events',
      'coach_contacts'
    )
  ORDER BY tablename, indexname
`);

console.log('\nALL INDEXES on target tables:\n');
for (const r of rows) {
  console.log(`  ${r.tablename}  |  ${r.indexname}`);
  console.log(`    ${r.indexdef}`);
}
