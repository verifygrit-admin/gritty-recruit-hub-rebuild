// admin-update-school Edge Function
// Section C — EF2
//
// Updates a single whitelisted column on a schools row.
// Caller must be authenticated with a valid Supabase session JWT carrying
// app_metadata.role === 'admin'. Any other caller receives 403.
//
// Auth gate:
//   1. Extract Bearer token from Authorization header.
//   2. Decode session via getSession() on a user-scoped client.
//   3. Check app_metadata.role === 'admin'. Reject with 403 if not.
//   4. Escalate to service_role client for all database operations.
//
// Request body (JSON):
//   { school_id: number, column: string, new_value: string, admin_email: string }
//   school_id is unitid (aliased as "id" in EF1 — the value from school.id in the frontend).
//
// Whitelist enforcement:
//   Only these four columns are permitted. Any other value for `column` returns 400.
//   ['coach_link', 'prospect_camp_link', 'recruiting_q_link', 'school_link_staging']
//
// Column aliasing (frontend contract — matches EF1):
//   unitid      → id    (SchoolsTableEditor.jsx uses s.id === school.id for merge)
//   school_name → name  (SchoolsTableEditor.jsx DISPLAY_COLUMNS uses key 'name')
//
// Old value capture:
//   The current column value is read BEFORE the UPDATE for the audit trail.
//
// Audit INSERT:
//   After UPDATE succeeds, INSERT into admin_audit_log.
//   Schema finalized at three-way session (Patch + David + Morty), 2026-04-10.
//   uuid PK (auto-generated), jsonb old_value/new_value.
//   Supabase JS client coerces JS objects to jsonb — no JSON.stringify needed.
//   Audit failure is non-fatal: logs error, does not roll back the UPDATE.
//
// Response shape:
//   200 { success: true, updated_row: { id, name, state, ...all display columns } }
//   400 { success: false, error: 'message' }  — missing fields or invalid column
//   401 { success: false, error: 'message' }  — invalid/expired session
//   403 { success: false, error: 'message' }  — not admin
//   500 { success: false, error: 'message' }  — server error
//
// Required env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Hardcoded column whitelist. Adding any other column name here requires a
// deliberate code change + review — this is the security boundary for the editor.
// school_link_staging is NOT a column on schools (it's a separate table, 0028).
// Removed from whitelist until Chris decides whether to add it as a column.
const ALLOWED_COLUMNS = [
  "coach_link",
  "prospect_camp_link",
  "recruiting_q_link",
] as const;

type AllowedColumn = (typeof ALLOWED_COLUMNS)[number];

// CORS headers — PUT method required for this function.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "PUT, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// Remap a raw schools row to the frontend contract shape.
// unitid → id, school_name → name.
// This alias set must match EF1 exactly so SchoolsTableEditor.jsx's
// `s.id === school.id` merge works correctly.
function remapSchoolRow(row: Record<string, unknown>) {
  return {
    id: row.unitid,
    name: row.school_name,
    state: row.state,
    city: row.city,
    ncaa_division: row.ncaa_division,
    conference: row.conference,
    coach_link: row.coach_link,
    prospect_camp_link: row.prospect_camp_link,
    recruiting_q_link: row.recruiting_q_link,
    last_updated: row.last_updated,
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "PUT") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  // --- AUTH GATE ---

  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!accessToken) {
    return json({ success: false, error: "Authorization header required" }, 401);
  }

  // Validate the JWT via getUser() — getSession() returns null in stateless EF context.
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

  // --- REQUEST BODY VALIDATION ---

  let body: { school_id: unknown; column: unknown; new_value: unknown; admin_email: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const { school_id, column, new_value, admin_email } = body;

  if (school_id === undefined || school_id === null) {
    return json({ success: false, error: "school_id is required" }, 400);
  }
  if (!column || typeof column !== "string") {
    return json({ success: false, error: "column is required" }, 400);
  }
  if (new_value === undefined || new_value === null) {
    return json({ success: false, error: "new_value is required" }, 400);
  }
  if (!admin_email || typeof admin_email !== "string") {
    return json({ success: false, error: "admin_email is required" }, 400);
  }

  // Whitelist enforcement — reject anything not in ALLOWED_COLUMNS.
  if (!(ALLOWED_COLUMNS as readonly string[]).includes(column)) {
    return json({ success: false, error: "Invalid column" }, 400);
  }

  const safeColumn = column as AllowedColumn;

  // school_id is unitid — must be a number.
  const unitid = Number(school_id);
  if (!Number.isInteger(unitid) || unitid <= 0) {
    return json({ success: false, error: "school_id must be a positive integer (unitid)" }, 400);
  }

  // --- DATABASE OPERATIONS ---

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    // Step 1: Read the current (old) value before the UPDATE.
    // This is required for the audit INSERT (currently TODO-blocked — see file header).
    // The read is cheap and must happen BEFORE the UPDATE to capture the pre-change state.
    const { data: beforeRow, error: beforeError } = await serviceClient
      .from("schools")
      .select(safeColumn)
      .eq("unitid", unitid)
      .single();

    if (beforeError || !beforeRow) {
      console.error("admin-update-school: pre-read failed", beforeError);
      return json({ success: false, error: "School not found" }, 404);
    }

    const oldValue = beforeRow[safeColumn];

    // Step 2: Execute the UPDATE.
    const updatePayload: Record<string, unknown> = {
      [safeColumn]: new_value,
      last_updated: new Date().toISOString(),
    };

    const { error: updateError } = await serviceClient
      .from("schools")
      .update(updatePayload)
      .eq("unitid", unitid);

    if (updateError) {
      console.error("admin-update-school: UPDATE failed", updateError);
      return json({ success: false, error: "Update failed" }, 500);
    }

    // Step 3: Read the full updated row back with the same alias set as EF1.
    // SchoolsTableEditor.jsx line 170: `s.id === school.id` — id must be present
    // in updated_row for the local state merge to work.
    const { data: afterRow, error: afterError } = await serviceClient
      .from("schools")
      .select(
        `unitid,
         school_name,
         state,
         city,
         ncaa_division,
         conference,
         coach_link,
         prospect_camp_link,
         recruiting_q_link,
         last_updated`
      )
      .eq("unitid", unitid)
      .single();

    if (afterError || !afterRow) {
      console.error("admin-update-school: post-read failed", afterError);
      return json({
        success: false,
        error: "Update succeeded but failed to read updated row",
      }, 500);
    }

    // Audit INSERT — schema finalized at three-way session (Patch + David + Morty), 2026-04-10.
    // admin_audit_log: uuid PK (auto-generated by gen_random_uuid()), jsonb old/new_value.
    // Supabase JS client coerces JS objects to jsonb — no JSON.stringify needed.
    // id is not included in the INSERT — it is generated server-side.
    // Audit failure is non-fatal: logs error, does not roll back the UPDATE.
    const { error: auditError } = await serviceClient
      .from("admin_audit_log")
      .insert({
        admin_email: admin_email,
        action: "UPDATE",
        table_name: "schools",
        row_id: String(unitid),
        old_value: { [safeColumn]: oldValue },
        new_value: { [safeColumn]: new_value },
        created_at: new Date().toISOString(),
      });

    if (auditError) {
      // Audit failure is logged but does not roll back the UPDATE.
      // The schools UPDATE has already succeeded. Audit failures are non-fatal
      // to the end user but must be visible in server logs for investigation.
      console.error("admin-update-school: audit INSERT failed", auditError);
    }

    console.log(
      `admin-update-school: updated unitid=${unitid} column=${safeColumn} by ${admin_email}`
    );

    return json({ success: true, updated_row: remapSchoolRow(afterRow) });
  } catch (err) {
    console.error("admin-update-school: unexpected error", err);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});
