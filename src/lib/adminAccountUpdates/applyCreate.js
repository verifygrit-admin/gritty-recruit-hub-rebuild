// applyCreate — Sprint 027.
// Calls admin-create-account EF for college_coaches or recruiting_events.

import { supabase } from '../supabaseClient.js';

export async function applyCreate({ entity, row, adminEmail }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData?.session?.access_token;
  if (!jwt) return { ok: false, error: 'No active admin session.' };

  let res;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/admin-create-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ entity, row, admin_email: adminEmail }),
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
  return { ok: true, row: body.row };
}
