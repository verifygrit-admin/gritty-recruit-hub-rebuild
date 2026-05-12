// admin-approve-bulk-pds Edge Function
// Sprint 026 — EF2 of 4 for the Bulk PDS Approval admin panel.
//
// POST /functions/v1/admin-approve-bulk-pds
//   Body (mutually exclusive):
//     { batch_id: <uuid> }       — approve ALL pending rows in the batch
//     { submission_id: <uuid> }  — approve a single staging row
//
// Per-row flow (with per-row try/catch isolation so one missing profile does
// NOT abort sibling rows):
//   1. Look up the matching profiles row by student_user_id.
//      - If absent: do NOT update profiles, do NOT touch staging,
//        log [BULK_PDS_APPROVE] missing_profile ..., push to errors[].
//   2. UPDATE profiles SET height/weight/speed_40/time_5_10_5/time_l_drill/
//      bench_press/squat/clean = staging values,
//      last_bulk_pds_approved_at = now(), updated_at = now()
//      WHERE user_id = staging.student_user_id.
//   3. UPDATE bulk_pds_submissions SET approval_status='approved',
//      approved_by, approved_at WHERE id = staging.id.
//   4. INSERT admin_audit_log row capturing the pre-update profile field map
//      and the staging field map.
//
// After all rows processed: POST notify-bulk-pds-event { event_type: 'approval' }.
// notify_status is included in the response (best-effort — does not block).
//
// Response shape:
//   200 { success: true, approved: <number>, errors: [{ submission_id, reason }], notify_status }
//   400 { success: false, error }   — body validation
//   401 { success: false, error }
//   403 { success: false, error }
//   404 { success: false, error }   — no pending rows match
//   500 { success: false, error }
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fields that get written from staging → profiles.
const WRITETHRU_FIELDS = [
  "height",
  "weight",
  "speed_40",
  "time_5_10_5",
  "time_l_drill",
  "bench_press",
  "squat",
  "clean",
] as const;

function pickWritethru(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of WRITETHRU_FIELDS) out[k] = row[k] ?? null;
  return out;
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  // --- AUTH GATE ---
  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return json({ success: false, error: "Authorization header required" }, 401);
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: userData, error: userError } =
    await userClient.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return json({ success: false, error: "Invalid or expired session token" }, 401);
  }
  const role = userData.user.app_metadata?.role;
  if (role !== "admin") {
    return json({ success: false, error: "Forbidden" }, 403);
  }
  const adminUserId = userData.user.id;
  const adminEmail = userData.user.email ?? "unknown@grittyfb.com";

  // --- BODY VALIDATION ---
  let body: { batch_id?: unknown; submission_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const { batch_id, submission_id } = body;
  const hasBatch = typeof batch_id === "string" && batch_id.length > 0;
  const hasSubmission = typeof submission_id === "string" && submission_id.length > 0;

  if (hasBatch === hasSubmission) {
    return json(
      { success: false, error: "Provide exactly one of batch_id or submission_id" },
      400,
    );
  }
  if (hasBatch && !UUID_RE.test(batch_id as string)) {
    return json({ success: false, error: "batch_id must be a uuid" }, 400);
  }
  if (hasSubmission && !UUID_RE.test(submission_id as string)) {
    return json({ success: false, error: "submission_id must be a uuid" }, 400);
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // --- FETCH PENDING TARGET ROWS ---
  let query = serviceClient
    .from("bulk_pds_submissions")
    .select("*")
    .eq("approval_status", "pending");
  if (hasBatch) query = query.eq("batch_id", batch_id as string);
  if (hasSubmission) query = query.eq("id", submission_id as string);

  const { data: targets, error: targetsError } = await query;
  if (targetsError) {
    console.error("admin-approve-bulk-pds: target SELECT failed", targetsError);
    return json({ success: false, error: "Failed to read submissions" }, 500);
  }
  if (!targets || targets.length === 0) {
    return json({ success: false, error: "No pending submissions match" }, 404);
  }

  const nowIso = new Date().toISOString();
  const errors: Array<{ submission_id: string; reason: string }> = [];
  const approvedSubmissionIds: string[] = [];

  // --- PER-ROW PROCESSING (isolated try/catch per row) ---
  for (const staging of targets as Record<string, unknown>[]) {
    const stagingId = staging.id as string;
    const studentUserId = staging.student_user_id as string;

    try {
      // 1. Look up the matching profiles row.
      const { data: profileRow, error: profileError } = await serviceClient
        .from("profiles")
        .select(WRITETHRU_FIELDS.join(", "))
        .eq("user_id", studentUserId)
        .maybeSingle();

      if (profileError) {
        console.error(
          `[BULK_PDS_APPROVE] profile_lookup_error student_user_id=${studentUserId} submission_id=${stagingId}`,
          profileError,
        );
        errors.push({ submission_id: stagingId, reason: "profile_lookup_error" });
        continue;
      }
      if (!profileRow) {
        // Q7 contract — error per row, leave staging at 'pending', sibling rows proceed.
        console.error(
          `[BULK_PDS_APPROVE] missing_profile student_user_id=${studentUserId} submission_id=${stagingId}`,
        );
        errors.push({ submission_id: stagingId, reason: "missing_profile" });
        continue;
      }

      const oldValue = pickWritethru(profileRow as Record<string, unknown>);
      const newValue = pickWritethru(staging);

      // 2. UPDATE profiles.
      const profilePatch: Record<string, unknown> = {
        ...newValue,
        last_bulk_pds_approved_at: nowIso,
        updated_at: nowIso,
      };
      const { error: profileUpdateError } = await serviceClient
        .from("profiles")
        .update(profilePatch)
        .eq("user_id", studentUserId);

      if (profileUpdateError) {
        console.error(
          `[BULK_PDS_APPROVE] profile_update_failed student_user_id=${studentUserId} submission_id=${stagingId}`,
          profileUpdateError,
        );
        errors.push({ submission_id: stagingId, reason: "profile_update_failed" });
        continue;
      }

      // 3. UPDATE staging row → approved.
      const { error: stagingUpdateError } = await serviceClient
        .from("bulk_pds_submissions")
        .update({
          approval_status: "approved",
          approved_by: adminUserId,
          approved_at: nowIso,
        })
        .eq("id", stagingId);

      if (stagingUpdateError) {
        console.error(
          `[BULK_PDS_APPROVE] staging_update_failed submission_id=${stagingId}`,
          stagingUpdateError,
        );
        // Profiles already mutated — surface but do not roll back; staging will
        // remain pending and admin can retry. The audit log will still be written below.
        errors.push({ submission_id: stagingId, reason: "staging_update_failed" });
      }

      // 4. INSERT admin_audit_log (non-fatal on failure).
      const { error: auditError } = await serviceClient
        .from("admin_audit_log")
        .insert({
          admin_email: adminEmail,
          action: "bulk_pds_approve",
          table_name: "profiles",
          row_id: studentUserId,
          old_value: oldValue,
          new_value: newValue,
        });
      if (auditError) {
        console.error(
          `[BULK_PDS_APPROVE] audit_insert_failed submission_id=${stagingId}`,
          auditError,
        );
        // Non-fatal — the profile write is the source of truth.
      }

      approvedSubmissionIds.push(stagingId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[BULK_PDS_APPROVE] unexpected_error submission_id=${stagingId} error=${msg}`,
      );
      errors.push({ submission_id: stagingId, reason: "unexpected_error" });
    }
  }

  // --- NOTIFY (best-effort) ---
  let notifyStatus: Record<string, unknown> = { skipped: true };
  if (approvedSubmissionIds.length > 0) {
    try {
      const notifyResp = await fetch(
        `${SUPABASE_URL}/functions/v1/notify-bulk-pds-event`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_type: "approval",
            submission_ids: approvedSubmissionIds,
            approved_by: adminUserId,
            approved_at: nowIso,
          }),
        },
      );
      notifyStatus = await notifyResp.json().catch(() => ({
        success: notifyResp.ok,
        status: notifyResp.status,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[BULK_PDS_APPROVE] notify_failed error=${msg}`);
      notifyStatus = { success: false, error: msg };
    }
  }

  return json({
    success: true,
    approved: approvedSubmissionIds.length,
    errors,
    notify_status: notifyStatus,
  });
};

Deno.serve(handler);
