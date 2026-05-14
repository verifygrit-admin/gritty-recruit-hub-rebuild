// applyBatchEdit — Sprint 027.
// Calls admin-update-account EF with the batch payload.
// Returns:
//   { ok: true, updated_count, audit_count, updated_rows }
//   { ok: false, error }
//   { ok: false, error: 'Conflict', conflicts: [...] }  ← 409

import { supabase } from '../supabaseClient.js';

export async function applyBatchEdit({ entity, batch, adminEmail }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData?.session?.access_token;
  if (!jwt) return { ok: false, error: 'No active admin session.' };

  let res;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/admin-update-account`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ entity, batch, admin_email: adminEmail }),
    });
  } catch (err) {
    return { ok: false, error: `Network error: ${err.message}` };
  }

  let body;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: `Bad JSON response (HTTP ${res.status})` };
  }

  if (res.status === 409) {
    return { ok: false, error: 'Conflict', conflicts: body.conflicts || [] };
  }

  if (!res.ok || !body?.success) {
    return { ok: false, error: body?.error || `HTTP ${res.status}` };
  }

  return {
    ok: true,
    updated_count: body.updated_count || 0,
    audit_count: body.audit_count || 0,
    updated_rows: body.updated_rows || [],
  };
}
