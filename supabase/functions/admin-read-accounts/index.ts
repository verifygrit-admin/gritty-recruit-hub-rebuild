// admin-read-accounts Edge Function — Sprint 027 Phase 2.
//
// Paginated read of any of the 7 Sprint 027 entities for the Account Updates
// admin tab. Single EF dispatches by `entity` query param.
//
// AUTH (DEC 016-C WT-B): userClient.auth.getUser(accessToken) →
// app_metadata.role === 'admin'. Service-role client for DB reads.
//
// REQUEST
//   GET /functions/v1/admin-read-accounts?entity=<key>&page=<n>&page_size=<n>&sort=<col>&dir=<asc|desc>
//   Authorization: Bearer <admin JWT>
//
// ENTITY KEYS: students | hs_coaches | counselors | high_schools | colleges
//              | college_coaches | recruiting_events
//
// RESPONSE 200: { success, rows, total, page, page_size, entity }
//
// JOINS:
//   students: profiles LEFT JOIN users on user_id
//   hs_coaches: users LEFT JOIN hs_coach_schools LEFT JOIN hs_programs
//   counselors: users LEFT JOIN hs_counselor_schools LEFT JOIN hs_programs
//   others: single-table
//
// SOFT-DELETE: 0052 added deleted_at to college_coaches and recruiting_events.
// Read filters WHERE deleted_at IS NULL for those two.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const ENTITY_KEYS = [
  "students","hs_coaches","counselors","high_schools",
  "colleges","college_coaches","recruiting_events",
] as const;
type EntityKey = (typeof ENTITY_KEYS)[number];

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

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

  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return json({ success: false, error: "Invalid or expired session token" }, 401);
  }
  const role = userData.user.app_metadata?.role;
  if (role !== "admin") {
    return json({ success: false, error: "Forbidden" }, 403);
  }

  // --- REQUEST PARSING ---
  const url = new URL(req.url);
  const entity = url.searchParams.get("entity") as EntityKey | null;
  if (!entity || !ENTITY_KEYS.includes(entity)) {
    return json({ success: false, error: `entity must be one of: ${ENTITY_KEYS.join(", ")}` }, 400);
  }

  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const requestedPageSize = parseInt(url.searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE), 10);
  const page_size = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.isFinite(requestedPageSize) ? requestedPageSize : DEFAULT_PAGE_SIZE));
  const sort = url.searchParams.get("sort"); // optional, validated per-entity below
  const dir = (url.searchParams.get("dir") ?? "asc").toLowerCase() === "desc" ? "desc" : "asc";
  const offset = (page - 1) * page_size;

  // --- DB CLIENT (service role) ---
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    let rows: Record<string, unknown>[] = [];
    let total = 0;

    if (entity === "students") {
      // profiles LEFT JOIN users on user_id
      // Supabase JS uses embedded select via PostgREST foreign-table joining.
      // public.users.user_id matches profiles.user_id (both FK to auth.users.id) but
      // there is no FK between profiles and users — so we run two queries and merge.
      const sortCol = sort ?? "name";
      const profilesResp = await db
        .from("profiles")
        .select("*", { count: "exact" })
        .order(sortCol, { ascending: dir === "asc" })
        .range(offset, offset + page_size - 1);
      if (profilesResp.error) throw profilesResp.error;
      total = profilesResp.count ?? 0;
      const profileRows = profilesResp.data ?? [];
      const userIds = profileRows.map((r: any) => r.user_id).filter(Boolean);
      const usersById: Record<string, any> = {};
      if (userIds.length > 0) {
        const usersResp = await db
          .from("users")
          .select("user_id, account_status, payment_status, email_verified")
          .in("user_id", userIds);
        if (usersResp.error) throw usersResp.error;
        for (const u of usersResp.data ?? []) usersById[u.user_id] = u;
      }
      rows = profileRows.map((r: any) => ({
        ...r,
        users_account_status: usersById[r.user_id]?.account_status ?? null,
        users_payment_status: usersById[r.user_id]?.payment_status ?? null,
        users_email_verified: usersById[r.user_id]?.email_verified ?? null,
      }));
    } else if (entity === "hs_coaches" || entity === "counselors") {
      const userTypeFilter = entity === "hs_coaches" ? "hs_coach" : "hs_guidance_counselor";
      const linkTable = entity === "hs_coaches" ? "hs_coach_schools" : "hs_counselor_schools";
      const linkFk = entity === "hs_coaches" ? "coach_user_id" : "counselor_user_id";
      const sortCol = sort ?? "full_name";

      const usersResp = await db
        .from("users")
        .select("*", { count: "exact" })
        .eq("user_type", userTypeFilter)
        .order(sortCol, { ascending: dir === "asc", nullsFirst: false })
        .range(offset, offset + page_size - 1);
      if (usersResp.error) throw usersResp.error;
      total = usersResp.count ?? 0;
      const userRows = usersResp.data ?? [];
      const userUuids = userRows.map((u: any) => u.user_id).filter(Boolean);

      let linkRowsByUserId: Record<string, any> = {};
      const programsById: Record<string, any> = {};
      if (userUuids.length > 0) {
        const linkResp = await db
          .from(linkTable)
          .select("*")
          .in(linkFk, userUuids);
        if (linkResp.error) throw linkResp.error;
        const linkRows = linkResp.data ?? [];
        for (const l of linkRows) linkRowsByUserId[l[linkFk]] = l;
        const programIds = linkRows.map((l: any) => l.hs_program_id).filter(Boolean);
        if (programIds.length > 0) {
          const progResp = await db
            .from("hs_programs")
            .select("id, school_name")
            .in("id", programIds);
          if (progResp.error) throw progResp.error;
          for (const p of progResp.data ?? []) programsById[p.id] = p;
        }
      }

      // Resolve auth email via admin API for each user
      const emailByUserId: Record<string, string> = {};
      for (const u of userRows) {
        if (!u.user_id) continue;
        const { data: authUserData } = await db.auth.admin.getUserById(u.user_id);
        if (authUserData?.user?.email) emailByUserId[u.user_id] = authUserData.user.email;
      }

      rows = userRows.map((u: any) => {
        const link = linkRowsByUserId[u.user_id];
        const prog = link?.hs_program_id ? programsById[link.hs_program_id] : null;
        return {
          ...u,
          email: emailByUserId[u.user_id] ?? null, // RO display from auth.users
          hs_program_id: link?.hs_program_id ?? null,
          hs_program_name: prog?.school_name ?? null,
          ...(entity === "hs_coaches" ? { is_head_coach: link?.is_head_coach ?? null } : {}),
        };
      });
    } else if (entity === "high_schools") {
      const sortCol = sort ?? "school_name";
      const resp = await db
        .from("hs_programs")
        .select("*", { count: "exact" })
        .order(sortCol, { ascending: dir === "asc" })
        .range(offset, offset + page_size - 1);
      if (resp.error) throw resp.error;
      total = resp.count ?? 0;
      rows = resp.data ?? [];
    } else if (entity === "colleges") {
      const sortCol = sort ?? "school_name";
      const resp = await db
        .from("schools")
        .select("*", { count: "exact" })
        .order(sortCol, { ascending: dir === "asc" })
        .range(offset, offset + page_size - 1);
      if (resp.error) throw resp.error;
      total = resp.count ?? 0;
      rows = resp.data ?? [];
    } else if (entity === "college_coaches") {
      const sortCol = sort ?? "name";
      const resp = await db
        .from("college_coaches")
        .select("*", { count: "exact" })
        .is("deleted_at", null) // soft-delete filter (0052)
        .order(sortCol, { ascending: dir === "asc" })
        .range(offset, offset + page_size - 1);
      if (resp.error) throw resp.error;
      total = resp.count ?? 0;
      rows = resp.data ?? [];
    } else if (entity === "recruiting_events") {
      const sortCol = sort ?? "event_date";
      const resp = await db
        .from("recruiting_events")
        .select("*", { count: "exact" })
        .is("deleted_at", null)
        .order(sortCol, { ascending: dir === "asc" })
        .range(offset, offset + page_size - 1);
      if (resp.error) throw resp.error;
      total = resp.count ?? 0;
      rows = resp.data ?? [];
    }

    return json({ success: true, rows, total, page, page_size, entity });
  } catch (err) {
    console.error("admin-read-accounts:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return json({ success: false, error: msg }, 500);
  }
});
