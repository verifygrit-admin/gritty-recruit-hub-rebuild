// applyDelete — Sprint 027. Soft delete via admin-delete-account EF.

import { supabase } from '../supabaseClient.js';

export async function applyDelete({ entity, row_id, adminEmail }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData?.session?.access_token;
  if (!jwt) return { ok: false, error: 'No active admin session.' };

  let res;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/admin-delete-account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ entity, row_id, admin_email: adminEmail }),
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
  if (!res.ok || !body?.success) {
    return { ok: false, error: body?.error || `HTTP ${res.status}` };
  }
  return { ok: true, row_id: body.row_id };
}
