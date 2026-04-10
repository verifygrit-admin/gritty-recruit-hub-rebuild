// admin-read-schools Edge Function
// Section C — EF1
//
// Returns all rows from public.schools for the admin panel.
// Caller must be authenticated with a valid Supabase session JWT carrying
// app_metadata.role === 'admin'. Any other caller receives 403.
//
// Auth gate:
//   1. Extract Bearer token from Authorization header.
//   2. Decode session via getSession() on a user-scoped client.
//   3. Check app_metadata.role === 'admin'. Reject with 403 if not.
//   4. Escalate to service_role client for the SELECT (bypasses RLS).
//
// Column aliasing (frontend contract):
//   unitid      → id    (SchoolsTableEditor.jsx uses school.id as row key)
//   school_name → name  (SchoolsTableEditor.jsx DISPLAY_COLUMNS uses key 'name')
//
// Response shape:
//   200 { success: true, schools: [...rows] }
//   401 { success: false, error: 'message' }
//   403 { success: false, error: 'message' }
//   500 { success: false, error: 'message' }
//
// Required env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// CORS headers — admin panel is served from the same origin as the main app.
// Wildcard origin is consistent with the existing Edge Function pattern.
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

  // Extract the Bearer token from the Authorization header.
  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!accessToken) {
    return json({ success: false, error: "Authorization header required" }, 401);
  }

  // Validate the JWT by calling getUser() — which makes a server-side call to
  // Supabase Auth and returns the full user object. getSession() does NOT work
  // in stateless Edge Function context (returns null — no persistent storage).
  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: userData, error: userError } =
    await userClient.auth.getUser(accessToken);

  if (userError || !userData?.user) {
    return json({ success: false, error: "Invalid or expired session token" }, 401);
  }

  // Check admin claim.
  const role = userData.user.app_metadata?.role;
  if (role !== "admin") {
    return json({ success: false, error: "Forbidden" }, 403);
  }

  // --- DATABASE READ ---

  // Service role client — bypasses RLS for the SELECT.
  // The schools_public_select policy is open (USING true), so this read would
  // succeed with an anon client too, but service_role is used for consistency
  // with the admin-only pattern and to future-proof against policy changes.
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const { data: schools, error: readError } = await serviceClient
      .from("schools")
      .select(
        // unitid is aliased as "id" for frontend contract compatibility
        // (SchoolsTableEditor.jsx uses school.id as the row identifier).
        // school_name is aliased as "name" for DISPLAY_COLUMNS key compatibility.
        // school_link_staging is a separate table (0028), NOT a column on schools.
        // Chris to decide whether to add it as a column or remove from admin spec.
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
      .order("school_name", { ascending: true });

    if (readError) {
      console.error("admin-read-schools: SELECT failed", readError);
      return json({ success: false, error: "Failed to read schools" }, 500);
    }

    // Remap unitid → id and school_name → name before returning.
    // This is the frontend contract alias — do not remove.
    const remapped = (schools ?? []).map((row) => ({
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
    }));

    return json({ success: true, schools: remapped });
  } catch (err) {
    console.error("admin-read-schools: unexpected error", err);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});
