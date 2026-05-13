// fetchPagedRows — Sprint 027.
// Calls admin-read-accounts EF and returns the paged read response.
// Mirrors the EF call pattern from AdminInstitutionsTab.jsx (Bearer JWT +
// apikey header).

import { supabase } from '../supabaseClient.js';

export async function fetchPagedRows({ entity, page = 1, pageSize = 50, sort, dir = 'asc' }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData?.session?.access_token;
  if (!jwt) return { ok: false, error: 'No active admin session.' };

  const params = new URLSearchParams({
    entity,
    page: String(page),
    page_size: String(pageSize),
    dir,
  });
  if (sort) params.set('sort', sort);

  let res;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/admin-read-accounts?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
        apikey: anonKey,
      },
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

  return {
    ok: true,
    rows: body.rows || [],
    total: body.total || 0,
    page: body.page || page,
    pageSize: body.page_size || pageSize,
    entity: body.entity,
  };
}
