// admin-delete-account Edge Function — Sprint 027 Phase 2.
//
// SOFT DELETE row for the 3 delete-enabled entities (Q5 LOCKED):
//   college_coaches | recruiting_events
// Implementation: UPDATE <table> SET deleted_at = now() WHERE <pk> = row_id.
// Requires 0052 migration (deleted_at column).
//
// AUTH (DEC 016-C WT-B): getUser() + app_metadata.role === 'admin'.
//
// REQUEST: DELETE /functions/v1/admin-delete-account
//   Body: { entity, row_id, admin_email }
//
// AUDIT: one row: action='DELETE', field=null, old_value=<full row>,
//        new_value=null.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
};

type DeletableEntityKey = "colleges" | "college_coaches" | "recruiting_events";

const TABLE_BY_ENTITY: Record<DeletableEntityKey, string> = {
  colleges: "schools",
  college_coaches: "college_coaches",
  recruiting_events: "recruiting_events",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "DELETE") return json({ success: false, error: "Method not allowed" }, 405);

  // --- AUTH GATE ---
  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return json({ success: false, error: "Authorization header required" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData?.user) return json({ success: false, error: "Invalid or expired session token" }, 401);
  if (userData.user.app_metadata?.role !== "admin") return json({ success: false, error: "Forbidden" }, 403);

  // --- BODY ---
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }
  const entity = body?.entity as DeletableEntityKey;
  const row_id = body?.row_id;
  const admin_email = body?.admin_email;

  if (entity === "colleges") {
    return json({ success: false, error: "Delete disabled for colleges (schools_deny_delete)" }, 400);
  }
  if (entity !== "college_coaches" && entity !== "recruiting_events") {
    return json({ success: false, error: "entity must be one of: college_coaches, recruiting_events" }, 400);
  }
  if (!row_id) return json({ success: false, error: "row_id is required" }, 400);
  if (typeof admin_email !== "string" || !admin_email) {
    return json({ success: false, error: "admin_email is required" }, 400);
  }

  const table = TABLE_BY_ENTITY[entity];
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  try {
    // Pre-read for audit
    const preRead = await db.from(table).select("*").eq("id", row_id).is("deleted_at", null).maybeSingle();
    if (preRead.error || !preRead.data) {
      return json({ success: false, error: "Row not found or already deleted" }, 404);
    }
    const preRow = preRead.data as Record<string, any>;

    // Soft delete
    const upd = await db.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", row_id).select("id, deleted_at").maybeSingle();
    if (upd.error) {
      console.error("soft delete failed", upd.error);
      return json({ success: false, error: upd.error.message || "Delete failed" }, 500);
    }

    // Audit
    const auditIns = await db.from("admin_audit_log").insert({
      admin_email,
      action: "DELETE",
      table_name: table,
      row_id: String(row_id),
      field: null,
      old_value: preRow,
      new_value: null,
    });
    if (auditIns.error) console.error("audit insert failed:", auditIns.error);

    return json({ success: true, row_id: String(row_id) });
  } catch (err) {
    console.error("admin-delete-account: unexpected error", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return json({ success: false, error: msg }, 500);
  }
});
