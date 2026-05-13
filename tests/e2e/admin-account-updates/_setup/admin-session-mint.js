/**
 * admin-session-mint.js — Sprint 027 Phase 3.
 *
 * Service-role session-mint helper. Bypasses interactive password login by
 * generating a magic-link via the Supabase Admin API, exchanging it for a
 * real access_token + refresh_token, and saving Playwright storageState
 * with the session pre-loaded into localStorage.
 *
 * Why this exists: Phase 3 e2e needs an admin-authenticated browser session.
 * The chris@grittyfb.com password is not in .env. Operator approved this
 * service-role mint approach (Phase 3 pre-flight).
 *
 * SECURITY: This helper requires SUPABASE_SERVICE_ROLE_KEY in .env. The key
 * never leaves the dev machine. The minted session is identical to what a
 * real password login produces — same JWT, same app_metadata.role='admin'.
 *
 * Used by: playwright.admin-account-updates.config.js as `globalSetup`.
 * Output: tests/e2e/admin-account-updates/.auth/admin.json (storageState).
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..', '..', '..', '..');
dotenv.config({ path: resolve(projectRoot, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'chris@grittyfb.com';

const STORAGE_STATE_PATH = resolve(__dirname, '..', '.auth', 'admin.json');

// Project ref for the localStorage key — supabase-js v2 default key shape:
//   sb-<project-ref>-auth-token
function projectRefFromUrl(url) {
  const m = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!m) throw new Error(`Cannot parse project ref from SUPABASE_URL: ${url}`);
  return m[1];
}

export default async function globalSetup() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error(
      'admin-session-mint: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env'
    );
  }

  const projectRef = projectRefFromUrl(SUPABASE_URL);
  const storageKey = `sb-${projectRef}-auth-token`;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Generate a magic link for the admin user. This returns an action_link
  //    URL with a verification token that, when consumed, exchanges for a
  //    real session. We consume the token via Supabase's verifyOtp endpoint.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: ADMIN_EMAIL,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw new Error(`generateLink failed: ${linkErr?.message || 'no hashed_token'}`);
  }
  const hashedToken = linkData.properties.hashed_token;

  // 2) Exchange the hashed_token for a session via verifyOtp on the
  //    user-scoped client (anon key). This is the canonical "consume magic
  //    link" call — it returns access_token + refresh_token.
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error('VITE_SUPABASE_ANON_KEY required');
  const userClient = createClient(SUPABASE_URL, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: verifyData, error: verifyErr } = await userClient.auth.verifyOtp({
    type: 'magiclink',
    token_hash: hashedToken,
  });
  if (verifyErr || !verifyData?.session) {
    throw new Error(`verifyOtp failed: ${verifyErr?.message || 'no session'}`);
  }
  const session = verifyData.session;

  // 3) Sanity: verify app_metadata.role === 'admin' on the minted session.
  if (session.user?.app_metadata?.role !== 'admin') {
    throw new Error(
      `Minted session for ${ADMIN_EMAIL} does NOT carry app_metadata.role='admin' (got: ${JSON.stringify(session.user?.app_metadata)})`
    );
  }

  // 4) Build Playwright storageState — localStorage entry for the supabase
  //    auth token, scoped to the dev origin. The Vite dev server defaults to
  //    http://localhost:5173 (set via VITE_DEV_BASE_URL if different).
  const baseUrl = process.env.VITE_DEV_BASE_URL || 'http://localhost:5173';
  const origin = new URL(baseUrl).origin;

  const storageState = {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          {
            name: storageKey,
            value: JSON.stringify(session),
          },
          // also dismiss the global tutorial overlay if present (mirrors gotoApp helper)
          { name: 'grh_tutSeen', value: '1' },
        ],
      },
    ],
  };

  // 5) Write to .auth/admin.json
  mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true });
  writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2), 'utf8');

  // eslint-disable-next-line no-console
  console.log(
    `[session-mint] minted admin session for ${ADMIN_EMAIL} ` +
    `(role=${session.user.app_metadata.role}, expires_at=${session.expires_at})`
  );
  // eslint-disable-next-line no-console
  console.log(`[session-mint] storageState → ${STORAGE_STATE_PATH}`);
}

// Direct-invocation entry: `node tests/e2e/admin-account-updates/_setup/admin-session-mint.js`.
// Playwright globalSetup imports the default export and calls it itself —
// for that path, this top-level await is a no-op (Node still imports the module
// but Playwright wraps the call in its own runner). When invoked directly via
// `node ...`, this runs and exits.
const isDirect = process.argv[1] && /admin-session-mint\.js$/i.test(process.argv[1]);
if (isDirect) {
  globalSetup()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('admin-session-mint failed:', err);
      process.exit(1);
    });
}
