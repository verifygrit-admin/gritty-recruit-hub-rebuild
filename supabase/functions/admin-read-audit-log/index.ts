// admin-read-audit-log Edge Function
// Section C — EF3
//
// Returns all rows from admin_audit_log, sorted created_at DESC.
// Caller must be authenticated with a valid Supabase session JWT carrying
// app_metadata.role === 'admin'. Any other caller receives 403.
//
// Auth gate:
//   1. Extract Bearer token from Authorization header.
//   2. Decode session via getSession() on a user-scoped client.
//   3. Check app_metadata.role === 'admin'. Reject with 403 if not.
//   4. Escalate to service_role client for the SELECT.
//
// Schema: admin_audit_log — finalized at three-way session (Patch + David + Morty), 2026-04-10.
//   id            uuid          PK, gen_random_uuid()
//   admin_email   text          NOT NULL
//   action        text          NOT NULL
//   table_name    text          NOT NULL
//   row_id        text          NOT NULL
//   old_value     jsonb         nullable
//   new_value     jsonb         nullable
//   created_at    timestamptz   NOT NULL DEFAULT now()
//
// Response shape:
//   200 { success: true, audit_log: [{ id, admin_email, action, table_name, row_id, old_value, new_value, created_at }] }
//   401 { success: false, error: 'message' }
//   403 { success: false, error: 'message' }
//   500 { success: false, error: 'message' }
//
// Required env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Required env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// CORS headers — GET method for this function.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
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

  // --- DATABASE READ ---

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: auditRows, error: readError } = await serviceClient
    .from("admin_audit_log")
    .select("id, admin_email, action, table_name, row_id, old_value, new_value, created_at")
    .order("created_at", { ascending: false });

  if (readError) {
    console.error("admin-read-audit-log: SELECT failed", readError);
    return json({ success: false, error: "Failed to read audit log" }, 500);
  }

  return json({ success: true, audit_log: auditRows ?? [] });
});
