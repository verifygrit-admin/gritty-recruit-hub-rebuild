// admin-read-institutions Edge Function
// Session 016-C — OBJ-4
//
// Returns all rows from public.schools for the admin Institutions tab.
// The UI calls them "institutions" but the backing table is public.schools.
// Includes athletics_phone and athletics_email (migration 0036).
//
// Auth gate: Bearer JWT → getUser() → app_metadata.role === 'admin'
// Query: service_role client → schools, ordered by school_name
//
// Response shape:
//   200 { success: true, institutions: [...rows] }
//   401 { success: false, error: 'message' }
//   403 { success: false, error: 'message' }
//   500 { success: false, error: 'message' }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

  try {
    const { data: schools, error: readError } = await serviceClient
      .from("schools")
      .select(
        `unitid,
         school_name,
         state,
         city,
         ncaa_division,
         conference,
         latitude,
         longitude,
         avg_gpa,
         avg_sat,
         graduation_rate,
         need_blind_school,
         is_test_optional,
         athletics_phone,
         athletics_email,
         coach_link,
         prospect_camp_link,
         recruiting_q_link,
         last_updated`
      )
      .order("school_name", { ascending: true });

    if (readError) {
      console.error("admin-read-institutions: SELECT failed", readError);
      return json({ success: false, error: "Failed to read institutions" }, 500);
    }

    return json({ success: true, institutions: schools ?? [] });
  } catch (err) {
    console.error("admin-read-institutions: unexpected error", err);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});
