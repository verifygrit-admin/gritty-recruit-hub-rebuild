// admin-create-account Edge Function — Sprint 027 Phase 1 STUB.
//
// PURPOSE
// -------
// CREATE row for the 3 create-enabled entities (Q5 LOCKED):
//   college_coaches | recruiting_events
//
// The colleges entity is listed in the type enum for symmetry, but the
// underlying schools_deny_insert RLS policy blocks all writes — and the UI
// never sends colleges to this EF (CollegesView does not import CreateRowModal).
//
// AUTH GATE
// ---------
// Same as admin-update-account: getUser() + app_metadata.role === 'admin'.
//
// REQUEST
// -------
//   POST /functions/v1/admin-create-account
//   Body: CreateRequest (see below)
//
// ENTITY GATE (defense-in-depth)
// ------------------------------
// EF rejects entity not in the 3 create-enabled keys with 400.
//
// REQUIRED FIELDS
// ---------------
// Per entity's create_required from COLUMN_WHITELISTS.md:
//   college_coaches: [unitid, name]
//   recruiting_events: [unitid, event_date]
// Missing → 400.
//
// WHITELIST ENFORCEMENT
// ---------------------
// Every key in row must be in entity's create_whitelist. Unknown → 400.
//
// AUDIT
// -----
// One row to admin_audit_log: action='INSERT', field=null, old_value=null,
// new_value=<row jsonb>.
//
// PHASE 1 STUB — Phase 2 task 2.C1 fills the body.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type CreatableEntityKey = "colleges" | "college_coaches" | "recruiting_events";

export type CreateRequest = {
  entity: CreatableEntityKey;
  row: Record<string, unknown>;
  admin_email: string;
};

export type CreateResponse =
  | { success: true; row: Record<string, unknown> }
  | { success: false; error: string };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const _ = createClient;
  void SUPABASE_URL;
  void SUPABASE_SERVICE_ROLE_KEY;

  return json({ success: false, error: "admin-create-account: Phase 1 stub. Implement in Phase 2 task 2.C1." }, 501);
});
