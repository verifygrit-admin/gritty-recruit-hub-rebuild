import { createClient } from '@supabase/supabase-js';

/**
 * Sprint 023 — secondary Supabase client factory.
 *
 * Returns a fresh ephemeral Supabase client used solely for re-authentication
 * in the password change flow (PasswordResetModal). Configured to NOT persist
 * its session, NOT read from localStorage, and NOT subscribe to
 * onAuthStateChange — so that signInWithPassword on this instance does not
 * clobber the active singleton's tokens at sb-<project>-auth-token.
 *
 * Caller is responsible for calling `.auth.signOut()` on the returned instance
 * after use (defensive — even with persistSession: false, this clears any
 * in-memory state on the ephemeral instance before it is garbage-collected).
 *
 * Spec reference: docs/specs/sprint-023-spec.md §3 (mechanism lock).
 */
export function createSecondarySupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'pw-reauth-ephemeral',
    },
  });
}
