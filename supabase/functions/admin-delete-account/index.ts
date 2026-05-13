// admin-delete-account Edge Function — Sprint 027 Phase 1 STUB.
//
// PURPOSE
// -------
// SOFT DELETE row for the 3 delete-enabled entities (Q5 LOCKED).
// Implementation: UPDATE <table> SET deleted_at = now() WHERE <pk> = row_id.
//
// PREREQUISITE: 0052 migration (Phase 2 task 2.C2) adds:
//   ALTER TABLE public.college_coaches ADD COLUMN deleted_at timestamptz;
//   ALTER TABLE public.recruiting_events ADD COLUMN deleted_at timestamptz;
// admin-read-accounts filters WHERE deleted_at IS NULL after 0052 ships.
//
// AUTH GATE
// ---------
// Same as admin-update-account: getUser() + app_metadata.role === 'admin'.
//
// REQUEST
// -------
//   DELETE /functions/v1/admin-delete-account
//   Body: DeleteRequest (see below)
//
// ENTITY GATE
// -----------
// Reject entity not in the 3 delete-enabled keys with 400. colleges is in
// the enum for symmetry but schools_deny_delete blocks at DB layer.
//
// AUDIT
// -----
// One row: action='DELETE', field=null, old_value=<full row jsonb>,
// new_value=null.
//
// PHASE 1 STUB — Phase 2 task 2.C2 fills the body.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
};

export type DeletableEntityKey = "colleges" | "college_coaches" | "recruiting_events";

export type DeleteRequest = {
  entity: DeletableEntityKey;
  row_id: string;
  admin_email: string;
};

export type DeleteResponse =
  | { success: true; row_id: string }
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
  if (req.method !== "DELETE") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const _ = createClient;
  void SUPABASE_URL;
  void SUPABASE_SERVICE_ROLE_KEY;

  return json({ success: false, error: "admin-delete-account: Phase 1 stub. Implement in Phase 2 task 2.C2." }, 501);
});
