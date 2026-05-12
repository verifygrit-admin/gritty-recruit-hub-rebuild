# Bulk PDS Notification Contract — Sprint 026

Coordination file between Agent 1a (Coach UI) and Agent 1c (Edge Functions). Owner: Agent 1a (may revise). Reads: Agent 1c.

Purpose: lock the shape of the cross-EF email-notification call so Coach UI submit handler and the `notify-bulk-pds-event` EF can be built independently and wired in Phase 2.

---

## EF endpoint

```
POST /functions/v1/notify-bulk-pds-event
Authorization: Bearer <Supabase session JWT>
Content-Type: application/json
```

Auth gate: validates JWT via `auth.getUser()`. The caller's role determines which event types they may trigger:

| Caller role | Allowed event types                        |
|-------------|--------------------------------------------|
| hs_coach    | `submission` only                           |
| admin       | `approval`, `rejection`                     |
| service     | all (used by approve/reject EFs internally) |

Mismatched (caller, event_type) returns 403.

---

## Request body — three event types

### Event 1 — `submission` (fired by Coach UI after a successful staging insert)

```json
{
  "event_type": "submission",
  "batch_id": "uuid",
  "coach_user_id": "uuid",
  "submitted_at": "2026-05-12T18:55:00Z",
  "student_count": 3
}
```

EF derives admin recipient (`chris@grittyfb.com`) from server-side config; coach + student identity from `bulk_pds_submissions` JOIN. Coach client does NOT pass recipient lists.

### Event 2 — `approval` (fired by `admin-approve-bulk-pds` post-write)

```json
{
  "event_type": "approval",
  "submission_ids": ["uuid", "uuid"],
  "approved_by": "uuid",
  "approved_at": "2026-05-12T19:30:00Z"
}
```

EF emails: (a) coach who submitted the batch (1 email summarizing all approved rows in that submission), (b) each affected student-athlete individually.

### Event 3 — `rejection` (fired by `admin-reject-bulk-pds` post-write)

```json
{
  "event_type": "rejection",
  "submission_ids": ["uuid"],
  "rejected_by": "uuid",
  "rejected_at": "2026-05-12T19:30:00Z",
  "rejection_reason": "Measurables look swapped between players — please re-submit."
}
```

EF emails the coach who submitted the batch. No student notification on rejection.

---

## Response shape

```json
{
  "success": true,
  "event_type": "submission|approval|rejection",
  "emails_attempted": 4,
  "emails_sent": 4,
  "emails_disabled": false
}
```

On `RESEND_API_KEY` absent: `emails_sent=0, emails_disabled=true, success=true`. The lifecycle does NOT block on this — server logs each `EMAIL_DISABLED: <event_type> would-send-to <recipient>` line.

Errors: `success=false`, `error: <message>`, HTTP 4xx/5xx.

---

## Coach-side call site (Agent 1a)

After a successful `supabase.from('bulk_pds_submissions').insert(...)` returns:

```js
// src/lib/bulkPds/submitBulkPdsBatch.js
import { supabase } from '../supabaseClient.js';

export async function submitBulkPdsBatch({ batch_id, rows }) {
  const { error: insertError } = await supabase.from('bulk_pds_submissions').insert(rows);
  if (insertError) return { ok: false, error: insertError };

  // Fire-and-forget notification — UI proceeds regardless.
  const { data: { session } } = await supabase.auth.getSession();
  fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-bulk-pds-event`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: 'submission',
      batch_id,
      coach_user_id: session.user.id,
      submitted_at: new Date().toISOString(),
      student_count: rows.length,
    }),
  }).catch((e) => console.warn('[bulk-pds] notify failed (non-blocking):', e));

  return { ok: true, batch_id };
}
```

---

## Open coordination items

- Email template content (HTML + plaintext) is owned by Agent 1c. Each template references coach name (lookup via `school-staff.js`), student name (from staging snapshot), and the field deltas (for approval).
- The "would-send-to" log format for `EMAIL_DISABLED` must be parseable: `EMAIL_DISABLED: <event_type> to=<email1,email2> subject="<subject>"`.

Last revision: 2026-05-12 (orchestrator scaffold; Agent 1a takes ownership at task start).
