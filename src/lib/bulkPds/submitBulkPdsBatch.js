/**
 * submitBulkPdsBatch — Sprint 026 Phase 1a (Coach UI).
 *
 * Inserts the batch into `public.bulk_pds_submissions` and fires a
 * non-blocking notification call to the `notify-bulk-pds-event` Edge
 * Function (event_type: 'submission'). The lifecycle is the DB insert —
 * email is best-effort per the notification contract:
 *   src/lib/bulkPds/notificationContract.md
 *
 * Returns { ok: true, batch_id } on insert success regardless of whether
 * the notify call resolves; returns { ok: false, error } on insert failure.
 */

import { supabase } from '../supabaseClient.js';

export async function submitBulkPdsBatch({ batch_id, rows }) {
  if (!batch_id) return { ok: false, error: new Error('batch_id required') };
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: new Error('rows must be a non-empty array') };
  }

  const { error: insertError } = await supabase
    .from('bulk_pds_submissions')
    .insert(rows);

  if (insertError) return { ok: false, error: insertError };

  // Fire-and-forget notification — staging insert is the source of truth;
  // email is best-effort. Per notificationContract.md §"Coach-side call site".
  // Failure logged with [NOTIFY_FAILED] prefix for grep-friendly diagnostics.
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-bulk-pds-event`;
      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'submission',
          batch_id,
          coach_user_id: session.user.id,
          submitted_at: new Date().toISOString(),
          student_count: rows.length,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            console.warn(`[NOTIFY_FAILED] notify-bulk-pds-event HTTP ${res.status} batch_id=${batch_id} body=${text}`);
          }
        })
        .catch((e) => console.warn(`[NOTIFY_FAILED] notify-bulk-pds-event fetch error batch_id=${batch_id}`, e));
    }
  } catch (e) {
    console.warn(`[NOTIFY_FAILED] notify dispatch error batch_id=${batch_id}`, e);
  }

  return { ok: true, batch_id };
}
