// admin-read-recruiting-events Edge Function
// Session 016-C — OBJ-4
//
// Returns all rows from public.recruiting_events for the admin panel,
// joined to public.schools for the school name display.
//
// Auth gate: Bearer JWT → getUser() → app_metadata.role === 'admin'
// Query: service_role client → recruiting_events + schools join on unitid
//
// Response shape:
//   200 { success: true, events: [...rows] }
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
    // Query recruiting_events with school name via PostgREST embedded resource
    const { data: events, error: eventsError } = await serviceClient
      .from("recruiting_events")
      .select(
        `id,
         unitid,
         event_type,
         event_name,
         event_date,
         end_date,
         registration_deadline,
         location,
         cost_dollars,
         registration_url,
         status,
         description,
         created_at,
         schools!inner ( school_name )`
      )
      .order("event_date", { ascending: false });

    if (eventsError) {
      // Fallback: if the join fails (PostgREST FK detection issue),
      // query without the join and resolve school names separately.
      console.error("admin-read-recruiting-events: joined SELECT failed, trying fallback", eventsError);

      const { data: eventsFlat, error: flatError } = await serviceClient
        .from("recruiting_events")
        .select("*")
        .order("event_date", { ascending: false });

      if (flatError) {
        console.error("admin-read-recruiting-events: fallback SELECT failed", flatError);
        return json({ success: false, error: "Failed to read recruiting events" }, 500);
      }

      // Resolve school names in a second query
      const unitids = [...new Set((eventsFlat ?? []).map((e) => e.unitid))];
      const { data: schoolRows } = await serviceClient
        .from("schools")
        .select("unitid, school_name")
        .in("unitid", unitids);

      const schoolMap = new Map(
        (schoolRows ?? []).map((s) => [s.unitid, s.school_name])
      );

      const remapped = (eventsFlat ?? []).map((row) => ({
        ...row,
        school_name: schoolMap.get(row.unitid) || null,
      }));

      return json({ success: true, events: remapped });
    }

    // Flatten the nested schools object from PostgREST join
    const remapped = (events ?? []).map((row) => ({
      id: row.id,
      unitid: row.unitid,
      event_type: row.event_type,
      event_name: row.event_name,
      event_date: row.event_date,
      end_date: row.end_date,
      registration_deadline: row.registration_deadline,
      location: row.location,
      cost_dollars: row.cost_dollars,
      registration_url: row.registration_url,
      status: row.status,
      description: row.description,
      created_at: row.created_at,
      school_name: (row as any).schools?.school_name || null,
    }));

    return json({ success: true, events: remapped });
  } catch (err) {
    console.error("admin-read-recruiting-events: unexpected error", err);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});
