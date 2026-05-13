// admin-create-account Edge Function — Sprint 027 Phase 2.
//
// CREATE row for the 3 create-enabled entities (Q5 LOCKED):
//   college_coaches | recruiting_events
// colleges is in the enum for symmetry but the underlying schools_deny_insert
// RLS policy blocks all writes; the UI never sends colleges to this EF.
//
// AUTH (DEC 016-C WT-B): getUser() + app_metadata.role === 'admin'.
//
// REQUEST: POST /functions/v1/admin-create-account
//   Body: { entity, row, admin_email }
//
// Required fields per entity from COLUMN_WHITELISTS.md:
//   college_coaches: [unitid, name]
//   recruiting_events: [unitid, event_date]
//
// AUDIT: one row to admin_audit_log: action='INSERT', field=null,
//   old_value=null, new_value={...row}.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CreatableEntityKey = "colleges" | "college_coaches" | "recruiting_events";

type EntityConfig = {
  table: string;
  pk: string;
  create_whitelist: readonly string[];
  create_required: readonly string[];
};

const COLLEGE_COACHES_WHITELIST = ["unitid","name","title","email","photo_url","twitter_handle","is_head_coach","profile_url"] as const;
const RECRUITING_EVENTS_WHITELIST = ["unitid","event_type","event_name","event_date","end_date","registration_deadline","location","cost_dollars","registration_url","status","description"] as const;

const REGISTRY: Record<CreatableEntityKey, EntityConfig | null> = {
  colleges: null, // hard-blocked by schools_deny_insert; rejected at gate
  college_coaches: { table: "college_coaches", pk: "id", create_whitelist: COLLEGE_COACHES_WHITELIST, create_required: ["unitid","name"] },
  recruiting_events: { table: "recruiting_events", pk: "id", create_whitelist: RECRUITING_EVENTS_WHITELIST, create_required: ["unitid","event_date"] },
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

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

  const entity = body?.entity as CreatableEntityKey;
  const row = body?.row;
  const admin_email = body?.admin_email;

  if (entity === "colleges") {
    return json({ success: false, error: "Create disabled for colleges (schools_deny_insert)" }, 400);
  }
  const cfg = REGISTRY[entity];
  if (!cfg) {
    return json({ success: false, error: "entity must be one of: college_coaches, recruiting_events" }, 400);
  }
  if (!row || typeof row !== "object") {
    return json({ success: false, error: "row is required" }, 400);
  }
  if (typeof admin_email !== "string" || !admin_email) {
    return json({ success: false, error: "admin_email is required" }, 400);
  }

  // Required fields
  for (const f of cfg.create_required) {
    const v = row[f];
    if (v === undefined || v === null || v === "") {
      return json({ success: false, error: `Required field missing: ${f}` }, 400);
    }
  }
  // Whitelist
  for (const k of Object.keys(row)) {
    if (!cfg.create_whitelist.includes(k)) {
      return json({ success: false, error: `Invalid column for entity: '${k}'` }, 400);
    }
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  try {
    const ins = await db.from(cfg.table).insert(row).select("*").maybeSingle();
    if (ins.error || !ins.data) {
      console.error("insert failed", ins.error);
      return json({ success: false, error: ins.error?.message || "Insert failed" }, 500);
    }
    const created = ins.data as Record<string, any>;

    // Audit
    const auditIns = await db.from("admin_audit_log").insert({
      admin_email,
      action: "INSERT",
      table_name: cfg.table,
      row_id: String(created[cfg.pk]),
      field: null,
      old_value: null,
      new_value: row,
    });
    if (auditIns.error) console.error("audit insert failed:", auditIns.error);

    return json({ success: true, row: created });
  } catch (err) {
    console.error("admin-create-account: unexpected error", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return json({ success: false, error: msg }, 500);
  }
});
