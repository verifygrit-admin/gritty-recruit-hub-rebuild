// admin-read-users Edge Function
// Sprint 001 D2 — expanded to surface has_password, school_name, is_head_coach.
//
// Returns rows from public.users JOIN public.profiles for the admin panel.
// Accepts optional ?user_type= query param to filter by user type sub-tab.
//
// Auth gate: Bearer JWT → getUser() → app_metadata.role === 'admin'
//
// Additional merges (D2):
//   has_password    — derived from auth.admin.listUsers().encrypted_password
//                     (null if the admin API call fails — surface as carry-forward)
//   school_name     — from hs_coach_schools / hs_counselor_schools + hs_programs
//   is_head_coach   — from hs_coach_schools (null for non-coach rows)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  aggregateHsCoachAssociations,
  aggregateHsCounselorAssociations,
} from "./associations.js";

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

// Page through auth.admin.listUsers until the requested user_ids are covered
// or the listing is exhausted. Returns a map user_id → has_password.
async function buildHasPasswordMap(
  serviceClient: any,
  neededIds: Set<string>,
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (neededIds.size === 0) return map;
  const PER_PAGE = 1000;
  let page = 1;
  while (map.size < neededIds.size) {
    const { data, error } = await serviceClient.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) {
      if (neededIds.has(u.id)) {
        const pw = (u as any).encrypted_password;
        map.set(
          u.id,
          typeof pw === "string" && pw.trim().length > 0,
        );
      }
    }
    if (users.length < PER_PAGE) break;
    page += 1;
  }
  return map;
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

    // D2: has_password map (best-effort — null on failure, not a hard block)
    let hasPasswordMap: Map<string, boolean> = new Map();
    try {
      hasPasswordMap = await buildHasPasswordMap(
        serviceClient,
        new Set(userIds),
      );
    } catch (err) {
      console.error("admin-read-users: auth.admin.listUsers failed — has_password will be null", err);
    }

    // D2: HS coach + counselor associations (only fetch when the sub-tab
    // requested is a type that can participate, or no filter is set).
    const needsCoachJoin =
      !userType || userType === "hs_coach";
    const needsCounselorJoin =
      !userType || userType === "hs_guidance_counselor";

    let coachMap: Record<string, { schoolName: string | null; isHeadCoach: boolean }> = {};
    let counselorMap: Record<string, { schoolName: string | null; isHeadCoach: null }> = {};

    if (needsCoachJoin || needsCounselorJoin) {
      const [coachAssoc, counselorAssoc, programRows] = await Promise.all([
        needsCoachJoin
          ? serviceClient
              .from("hs_coach_schools")
              .select("coach_user_id, hs_program_id, is_head_coach, linked_at")
              .in("coach_user_id", userIds)
          : Promise.resolve({ data: [], error: null }),
        needsCounselorJoin
          ? serviceClient
              .from("hs_counselor_schools")
              .select("counselor_user_id, hs_program_id, linked_at")
              .in("counselor_user_id", userIds)
          : Promise.resolve({ data: [], error: null }),
        serviceClient.from("hs_programs").select("id, school_name"),
      ]);

      if (coachAssoc.error) console.error("admin-read-users: hs_coach_schools", coachAssoc.error);
      if (counselorAssoc.error) console.error("admin-read-users: hs_counselor_schools", counselorAssoc.error);
      if (programRows.error) console.error("admin-read-users: hs_programs", programRows.error);

      coachMap = aggregateHsCoachAssociations(
        coachAssoc.data ?? [],
        programRows.data ?? [],
      );
      counselorMap = aggregateHsCounselorAssociations(
        counselorAssoc.data ?? [],
        programRows.data ?? [],
      );
    }

    // Build profile lookup
    const profilesByUserId = new Map(
      (profilesRows ?? []).map((p) => [p.user_id, p]),
    );

    // Merge: profiles fields first, users fields override (id, created_at),
    // then append D2 derived fields.
    const merged = usersRows.map((u) => {
      const p = profilesByUserId.get(u.user_id) || {};

      const coachAssoc = coachMap[u.user_id];
      const counselorAssoc = counselorMap[u.user_id];
      const assoc = coachAssoc ?? counselorAssoc ?? null;

      return {
        ...p,
        ...u,
        profile_id: p.id || null,
        email: p.email || null,
        name: p.name || null,
        phone: p.phone || null,
        has_password: hasPasswordMap.has(u.user_id)
          ? hasPasswordMap.get(u.user_id)
          : null,
        school_name: assoc ? assoc.schoolName : null,
        is_head_coach: assoc ? assoc.isHeadCoach : null,
      };
    });

    return json({ success: true, users: merged });
  } catch (err) {
    console.error("admin-read-users: unexpected error", err);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});
