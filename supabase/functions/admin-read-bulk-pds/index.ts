// admin-read-bulk-pds Edge Function
// Sprint 026 — EF1 of 4 for the Bulk PDS Approval admin panel.
//
// GET /functions/v1/admin-read-bulk-pds
//   - No query: returns the list of pending batches (grouped by batch_id,
//     sorted submitted_at DESC).
//   - ?batch_id=<uuid>: returns the per-row detail for a single batch with
//     the matching profiles row LEFT JOINed on student_user_id.
//
// Auth gate (verbatim from admin-read-schools/index.ts lines 60-87):
//   1. Extract Bearer token from Authorization header.
//   2. Validate via userClient.auth.getUser(accessToken) — getSession() does
//      NOT work in stateless EF context.
//   3. Reject 401 if no token / invalid; reject 403 if app_metadata.role !== 'admin'.
//   4. Service-role client for the DB read (bypasses RLS).
//
// Response shapes:
//   Pending list (GET, no batch_id):
//     200 { success: true, batches: [{ batch_id, coach_user_id, submitted_at, row_count }] }
//
//   Batch detail (GET ?batch_id=...):
//     200 {
//       success: true,
//       batch_id,
//       coach_user_id,
//       submitted_at,
//       rows: [{ submission: <staging row>, profile: <profiles row or null> }]
//     }
//
//   Errors:
//     400 { success: false, error: 'message' }  — invalid batch_id format / not pending
//     401 { success: false, error: 'message' }
//     403 { success: false, error: 'message' }
//     404 { success: false, error: 'message' }  — batch_id not found
//     500 { success: false, error: 'message' }
//
// Required env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

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

// RFC 4122-ish uuid (any version) format check.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const handler = async (req: Request): Promise<Response> => {
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

  const url = new URL(req.url);
  const batchIdParam = url.searchParams.get("batch_id");

  // Branch 1 — single batch detail with LEFT JOIN to profiles.
  if (batchIdParam) {
    if (!UUID_RE.test(batchIdParam)) {
      return json({ success: false, error: "batch_id must be a uuid" }, 400);
    }

    try {
      const { data: subs, error: subsError } = await serviceClient
        .from("bulk_pds_submissions")
        .select("*")
        .eq("batch_id", batchIdParam)
        .order("submitted_at", { ascending: true });

      if (subsError) {
        console.error("admin-read-bulk-pds: staging SELECT failed", subsError);
        return json({ success: false, error: "Failed to read submissions" }, 500);
      }
      if (!subs || subs.length === 0) {
        return json({ success: false, error: "batch_id not found" }, 404);
      }

      // Look up matching profiles rows in a single query.
      const studentIds = Array.from(
        new Set(subs.map((r: Record<string, unknown>) => r.student_user_id as string)),
      );
      const { data: profiles, error: profilesError } = await serviceClient
        .from("profiles")
        .select("*")
        .in("user_id", studentIds);

      if (profilesError) {
        console.error("admin-read-bulk-pds: profiles SELECT failed", profilesError);
        return json({ success: false, error: "Failed to read profiles" }, 500);
      }

      const profileByUserId = new Map<string, Record<string, unknown>>();
      for (const p of profiles ?? []) {
        profileByUserId.set(p.user_id as string, p);
      }

      const rows = subs.map((submission: Record<string, unknown>) => ({
        submission,
        profile: profileByUserId.get(submission.student_user_id as string) ?? null,
      }));

      const first = subs[0] as Record<string, unknown>;
      return json({
        success: true,
        batch_id: batchIdParam,
        coach_user_id: first.coach_user_id,
        submitted_at: first.submitted_at,
        rows,
      });
    } catch (err) {
      console.error("admin-read-bulk-pds: detail unexpected error", err);
      return json({ success: false, error: "Internal server error" }, 500);
    }
  }

  // Branch 2 — pending batch list (grouped, sorted submitted_at DESC).
  try {
    const { data: pending, error: pendingError } = await serviceClient
      .from("bulk_pds_submissions")
      .select("batch_id, coach_user_id, submitted_at")
      .eq("approval_status", "pending")
      .order("submitted_at", { ascending: false });

    if (pendingError) {
      console.error("admin-read-bulk-pds: pending SELECT failed", pendingError);
      return json({ success: false, error: "Failed to read pending batches" }, 500);
    }

    interface BatchAgg {
      batch_id: string;
      coach_user_id: string;
      submitted_at: string;
      row_count: number;
    }
    const agg = new Map<string, BatchAgg>();
    for (const row of pending ?? []) {
      const bid = row.batch_id as string;
      const existing = agg.get(bid);
      if (existing) {
        existing.row_count += 1;
        // Keep the most recent submitted_at as the batch timestamp.
        if ((row.submitted_at as string) > existing.submitted_at) {
          existing.submitted_at = row.submitted_at as string;
        }
      } else {
        agg.set(bid, {
          batch_id: bid,
          coach_user_id: row.coach_user_id as string,
          submitted_at: row.submitted_at as string,
          row_count: 1,
        });
      }
    }

    const batches = Array.from(agg.values()).sort((a, b) =>
      a.submitted_at < b.submitted_at ? 1 : a.submitted_at > b.submitted_at ? -1 : 0,
    );

    return json({ success: true, batches });
  } catch (err) {
    console.error("admin-read-bulk-pds: list unexpected error", err);
    return json({ success: false, error: "Internal server error" }, 500);
  }
};

// Always register the handler at module load. Supabase Edge Runtime expects
// the Deno.serve() side effect to fire on import. Tests import { handler }
// directly so they do not need to hit the bound port.
Deno.serve(handler);
