// admin-reject-bulk-pds Edge Function
// Sprint 026 — EF3 of 4 for the Bulk PDS Approval admin panel.
//
// POST /functions/v1/admin-reject-bulk-pds
//   Body:
//     { batch_id?, submission_id?, rejection_reason: <non-empty text> }
//   - batch_id and submission_id are mutually exclusive (exactly one required).
//   - rejection_reason is REQUIRED and must be a non-empty string.
//
// For each pending target staging row:
//   1. UPDATE bulk_pds_submissions SET approval_status='rejected',
//      approved_by, approved_at, rejection_reason.
//   2. INSERT admin_audit_log: action='bulk_pds_reject', table_name='bulk_pds_submissions',
//      row_id=submission_id::text, new_value={ approval_status: 'rejected', rejection_reason }.
//
// NO writes to public.profiles.
// After all rows: POST notify-bulk-pds-event { event_type: 'rejection' } (best-effort).
//
// Response:
//   200 { success: true, rejected: <number>, errors: [...], notify_status }
//   400/401/403/404/500 standard error envelope.
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
  let body: { batch_id?: unknown; submission_id?: unknown; rejection_reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const { batch_id, submission_id, rejection_reason } = body;
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
  if (typeof rejection_reason !== "string" || rejection_reason.trim().length === 0) {
    return json(
      { success: false, error: "rejection_reason is required (non-empty string)" },
      400,
    );
  }
  const reason = (rejection_reason as string).trim();

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // --- FETCH PENDING TARGETS ---
  let query = serviceClient
    .from("bulk_pds_submissions")
    .select("id, batch_id, student_user_id, coach_user_id, approval_status")
    .eq("approval_status", "pending");
  if (hasBatch) query = query.eq("batch_id", batch_id as string);
  if (hasSubmission) query = query.eq("id", submission_id as string);

  const { data: targets, error: targetsError } = await query;
  if (targetsError) {
    console.error("admin-reject-bulk-pds: target SELECT failed", targetsError);
    return json({ success: false, error: "Failed to read submissions" }, 500);
  }
  if (!targets || targets.length === 0) {
    return json({ success: false, error: "No pending submissions match" }, 404);
  }

  const nowIso = new Date().toISOString();
  const errors: Array<{ submission_id: string; reason: string }> = [];
  const rejectedSubmissionIds: string[] = [];

  for (const t of targets as Record<string, unknown>[]) {
    const stagingId = t.id as string;
    try {
      const { error: updateError } = await serviceClient
        .from("bulk_pds_submissions")
        .update({
          approval_status: "rejected",
          approved_by: adminUserId,
          approved_at: nowIso,
          rejection_reason: reason,
        })
        .eq("id", stagingId)
        .eq("approval_status", "pending");

      if (updateError) {
        console.error(
          `[BULK_PDS_REJECT] update_failed submission_id=${stagingId}`,
          updateError,
        );
        errors.push({ submission_id: stagingId, reason: "update_failed" });
        continue;
      }

      const { error: auditError } = await serviceClient
        .from("admin_audit_log")
        .insert({
          admin_email: adminEmail,
          action: "bulk_pds_reject",
          table_name: "bulk_pds_submissions",
          row_id: stagingId,
          old_value: { approval_status: "pending" },
          new_value: { approval_status: "rejected", rejection_reason: reason },
        });
      if (auditError) {
        console.error(
          `[BULK_PDS_REJECT] audit_insert_failed submission_id=${stagingId}`,
          auditError,
        );
        // Non-fatal.
      }

      rejectedSubmissionIds.push(stagingId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[BULK_PDS_REJECT] unexpected_error submission_id=${stagingId} error=${msg}`,
      );
      errors.push({ submission_id: stagingId, reason: "unexpected_error" });
    }
  }

  // --- NOTIFY (best-effort) ---
  let notifyStatus: Record<string, unknown> = { skipped: true };
  if (rejectedSubmissionIds.length > 0) {
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
            event_type: "rejection",
            submission_ids: rejectedSubmissionIds,
            rejected_by: adminUserId,
            rejected_at: nowIso,
            rejection_reason: reason,
          }),
        },
      );
      notifyStatus = await notifyResp.json().catch(() => ({
        success: notifyResp.ok,
        status: notifyResp.status,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[BULK_PDS_REJECT] notify_failed error=${msg}`);
      notifyStatus = { success: false, error: msg };
    }
  }

  return json({
    success: true,
    rejected: rejectedSubmissionIds.length,
    errors,
    notify_status: notifyStatus,
  });
};

Deno.serve(handler);
