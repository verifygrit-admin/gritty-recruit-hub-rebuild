// admin-read-users Edge Function
// Session 016-C — OBJ-4
//
// Returns rows from public.users JOIN public.profiles for the admin panel.
// Accepts optional ?user_type= query param to filter by user type sub-tab.
//
// Auth gate: Bearer JWT → getUser() → app_metadata.role === 'admin'
// Query: service_role client → users + profiles, merged on user_id
//
// Response shape:
//   200 { success: true, users: [...rows] }
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

const VALID_USER_TYPES = [
  "student_athlete",
  "hs_coach",
  "hs_guidance_counselor",
  "parent",
  "college_coach",
  "college_admissions_officer",
];

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

  // --- PARSE QUERY PARAMS ---

  const url = new URL(req.url);
  const userType = url.searchParams.get("user_type");

  if (userType && !VALID_USER_TYPES.includes(userType)) {
    return json({ success: false, error: `Invalid user_type: ${userType}` }, 400);
  }

  // --- DATABASE READ ---

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    // Query users table (optionally filtered by user_type)
    let usersQuery = serviceClient
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (userType) {
      usersQuery = usersQuery.eq("user_type", userType);
    }

    const { data: usersRows, error: usersError } = await usersQuery;

    if (usersError) {
      console.error("admin-read-users: users SELECT failed", usersError);
      return json({ success: false, error: "Failed to read users" }, 500);
    }

    if (!usersRows || usersRows.length === 0) {
      return json({ success: true, users: [] });
    }

    // Query profiles for matching user_ids
    const userIds = usersRows.map((u) => u.user_id);
    const { data: profilesRows, error: profilesError } = await serviceClient
      .from("profiles")
      .select("*")
      .in("user_id", userIds);

    if (profilesError) {
      console.error("admin-read-users: profiles SELECT failed", profilesError);
      return json({ success: false, error: "Failed to read profiles" }, 500);
    }

    // Build a lookup map: user_id → profile row
    const profilesByUserId = new Map(
      (profilesRows ?? []).map((p) => [p.user_id, p])
    );

    // Merge: profiles fields first, users fields override (id, created_at)
    // email comes from profiles (the user-facing email)
    const merged = usersRows.map((u) => {
      const p = profilesByUserId.get(u.user_id) || {};
      return {
        ...p,
        ...u,
        profile_id: p.id || null,
        email: p.email || null,
        name: p.name || null,
        phone: p.phone || null,
      };
    });

    return json({ success: true, users: merged });
  } catch (err) {
    console.error("admin-read-users: unexpected error", err);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});
