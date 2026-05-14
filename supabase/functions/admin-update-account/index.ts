// admin-update-account Edge Function — Sprint 027 Phase 2.
//
// Generalized admin-broad UPDATE for the 7 Sprint 027 entities. Stays
// SEPARATE from admin-update-school (legacy 3-col path; do not extend).
// Two EFs touch public.schools intentionally per Phase 1 Issue 4.
//
// AUTH (DEC 016-C WT-B): userClient.auth.getUser(accessToken) →
// app_metadata.role === 'admin'. Service-role client for DB ops.
//
// REQUEST: PUT /functions/v1/admin-update-account
//   Body: { entity, batch: [{ row_id, diff, updated_at_check? }], admin_email }
//
// For hs_coaches / counselors, diff is nested:
//   { users: { full_name: ... }, hs_coach_schools: { is_head_coach: ... } }
// For all other entities, diff is a flat field → value map.
//
// WHITELIST: every key validated against per-entity registry. Unknown → 400.
// TRANSACTION: deferred — Supabase JS lacks a multi-statement transaction
//   primitive, so we run updates sequentially per row and rollback nothing
//   on partial failure (mirrors admin-update-school behavior). Audit rows
//   write only on successful row update. (See note for production scaling.)
// CONFLICT: for entities with updated_at, compare updated_at_check to
//   live value before write; mismatch → 409.
// AUDIT: one row per field changed (Q7 LOCKED). uses admin_audit_log.field
//   column added by 0051.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "PUT, OPTIONS",
};

// ---------- entity registry (server-side mirror) ----------

type EntityKey =
  | "students" | "hs_coaches" | "counselors" | "high_schools"
  | "colleges" | "college_coaches" | "recruiting_events";

type EntityConfig = {
  table: string;
  pk: string;
  pk_type: "uuid" | "integer";
  user_type_filter?: string;
  update_whitelist?: readonly string[];
  update_whitelist_users?: readonly string[];
  update_whitelist_link?: readonly string[];
  link_table?: string;
  link_fk_to_user?: string;
  has_link_table: boolean;
  has_updated_at: boolean;
  updated_at_col?: string; // defaults to 'updated_at' if has_updated_at and not set
};

const STUDENTS_UPDATE = ["name","phone","twitter","parent_guardian_email","high_school","grad_year","state","hs_lat","hs_lng","position","height","weight","speed_40","gpa","sat","time_5_10_5","time_l_drill","bench_press","squat","clean","expected_starter","captain","all_conference","all_state","agi","dependents","status","hudl_url","avatar_storage_path"] as const;
const HS_COACHES_USERS = ["account_status","email_verified","activated_by","activated_at","payment_status","trial_started_at","full_name"] as const;
const HS_COACHES_LINK = ["is_head_coach","hs_program_id"] as const;
const COUNSELORS_USERS = HS_COACHES_USERS;
const COUNSELORS_LINK = ["hs_program_id"] as const;
const HIGH_SCHOOLS_UPDATE = ["school_name","address","city","state","zip","conference","division","state_athletic_association"] as const;
const COLLEGES_UPDATE = ["school_name","state","city","control","school_type","type","ncaa_division","conference","latitude","longitude","coa_out_of_state","est_avg_merit","avg_merit_award","share_stu_any_aid","share_stu_need_aid","need_blind_school","dltv","adltv","adltv_rank","admissions_rate","acad_rigor_senior","acad_rigor_junior","acad_rigor_soph","acad_rigor_freshman","acad_rigor_test_opt_senior","acad_rigor_test_opt_junior","acad_rigor_test_opt_soph","acad_rigor_test_opt_freshman","is_test_optional","graduation_rate","avg_gpa","avg_sat","recruiting_q_link","coach_link","prospect_camp_link","field_level_questionnaire","athletics_phone","athletics_email"] as const;
const COLLEGE_COACHES_UPDATE = ["unitid","name","title","email","photo_url","twitter_handle","is_head_coach","profile_url"] as const;
const RECRUITING_EVENTS_UPDATE = ["unitid","event_type","event_name","event_date","end_date","registration_deadline","location","cost_dollars","registration_url","status","description"] as const;

const REGISTRY: Record<EntityKey, EntityConfig> = {
  students: { table: "profiles", pk: "id", pk_type: "uuid", update_whitelist: STUDENTS_UPDATE, has_link_table: false, has_updated_at: true },
  hs_coaches: { table: "users", pk: "id", pk_type: "uuid", user_type_filter: "hs_coach", update_whitelist_users: HS_COACHES_USERS, update_whitelist_link: HS_COACHES_LINK, link_table: "hs_coach_schools", link_fk_to_user: "coach_user_id", has_link_table: true, has_updated_at: false },
  counselors: { table: "users", pk: "id", pk_type: "uuid", user_type_filter: "hs_guidance_counselor", update_whitelist_users: COUNSELORS_USERS, update_whitelist_link: COUNSELORS_LINK, link_table: "hs_counselor_schools", link_fk_to_user: "counselor_user_id", has_link_table: true, has_updated_at: false },
  high_schools: { table: "hs_programs", pk: "id", pk_type: "uuid", update_whitelist: HIGH_SCHOOLS_UPDATE, has_link_table: false, has_updated_at: false },
  colleges: { table: "schools", pk: "unitid", pk_type: "integer", update_whitelist: COLLEGES_UPDATE, has_link_table: false, has_updated_at: true, updated_at_col: "last_updated" },
  college_coaches: { table: "college_coaches", pk: "id", pk_type: "uuid", update_whitelist: COLLEGE_COACHES_UPDATE, has_link_table: false, has_updated_at: true },
  recruiting_events: { table: "recruiting_events", pk: "id", pk_type: "uuid", update_whitelist: RECRUITING_EVENTS_UPDATE, has_link_table: false, has_updated_at: true },
};

const ENTITY_KEYS = Object.keys(REGISTRY) as EntityKey[];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function castPk(value: unknown, pkType: "uuid" | "integer"): string | number | null {
  if (pkType === "integer") {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  return typeof value === "string" && value.length > 0 ? value : null;
}

function validateFlatDiff(diff: Record<string, unknown>, whitelist: readonly string[]): string | null {
  for (const k of Object.keys(diff)) {
    if (!whitelist.includes(k)) return `Invalid column for entity: '${k}'`;
  }
  return null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "PUT") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

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

  const entity = body?.entity as EntityKey;
  const batch = body?.batch;
  const admin_email = body?.admin_email;

  if (!entity || !ENTITY_KEYS.includes(entity)) {
    return json({ success: false, error: `entity must be one of: ${ENTITY_KEYS.join(", ")}` }, 400);
  }
  if (!Array.isArray(batch) || batch.length === 0) {
    return json({ success: false, error: "batch must be a non-empty array" }, 400);
  }
  if (batch.length > 10) {
    return json({ success: false, error: "batch exceeds 10-row cap (Q6)" }, 400);
  }
  if (typeof admin_email !== "string" || !admin_email) {
    return json({ success: false, error: "admin_email is required" }, 400);
  }

  const cfg = REGISTRY[entity];
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const updatedRows: Record<string, unknown>[] = [];
  const conflicts: Array<{ row_id: string | number; current_updated_at: string; sent_updated_at: string }> = [];
  let auditCount = 0;

  try {
    for (const row of batch) {
      const rowId = castPk(row?.row_id, cfg.pk_type);
      if (rowId === null) {
        return json({ success: false, error: `Invalid row_id for entity ${entity}` }, 400);
      }

      // Validate diff shape per entity
      const diff = row?.diff;
      if (!diff || typeof diff !== "object") {
        return json({ success: false, error: "diff must be an object" }, 400);
      }

      let usersDiff: Record<string, unknown> = {};
      let linkDiff: Record<string, unknown> = {};
      let flatDiff: Record<string, unknown> = {};

      if (cfg.has_link_table) {
        // Nested shape required
        usersDiff = (diff as any).users ?? {};
        linkDiff = (diff as any)[cfg.link_table!] ?? {};
        const usersErr = validateFlatDiff(usersDiff, cfg.update_whitelist_users!);
        if (usersErr) return json({ success: false, error: usersErr }, 400);
        const linkErr = validateFlatDiff(linkDiff, cfg.update_whitelist_link!);
        if (linkErr) return json({ success: false, error: linkErr }, 400);
        if (Object.keys(usersDiff).length === 0 && Object.keys(linkDiff).length === 0) {
          continue; // nothing to do for this row
        }
      } else {
        flatDiff = diff as Record<string, unknown>;
        const err = validateFlatDiff(flatDiff, cfg.update_whitelist!);
        if (err) return json({ success: false, error: err }, 400);
        if (Object.keys(flatDiff).length === 0) continue;
      }

      // --- READ pre-image (for audit + 409) ---
      const preReadResp = await db.from(cfg.table).select("*").eq(cfg.pk, rowId).maybeSingle();
      if (preReadResp.error || !preReadResp.data) {
        return json({ success: false, error: `Row not found: ${cfg.table}.${cfg.pk} = ${rowId}` }, 404);
      }
      const preRow = preReadResp.data as Record<string, any>;

      // --- 409 conflict check ---
      if (cfg.has_updated_at && row?.updated_at_check) {
        const ts_col = cfg.updated_at_col ?? "updated_at";
        const dbTs = preRow[ts_col];
        if (dbTs && row.updated_at_check && new Date(dbTs).getTime() !== new Date(row.updated_at_check).getTime()) {
          conflicts.push({ row_id: rowId, current_updated_at: dbTs, sent_updated_at: row.updated_at_check });
          continue; // collect all conflicts; return 409 at end if any
        }
      }

      // If we have any conflicts already, skip writes (return them at end)
      if (conflicts.length > 0) continue;

      // --- WRITE primary table ---
      let updatedPrimary: Record<string, any> | null = null;
      if (cfg.has_link_table) {
        if (Object.keys(usersDiff).length > 0) {
          const upd = await db.from(cfg.table).update(usersDiff).eq(cfg.pk, rowId).select("*").maybeSingle();
          if (upd.error) {
            console.error("primary update failed", upd.error);
            return json({ success: false, error: `Update failed for ${cfg.table}: ${upd.error.message}` }, 500);
          }
          updatedPrimary = upd.data;
        } else {
          updatedPrimary = preRow;
        }
      } else {
        const upd = await db.from(cfg.table).update(flatDiff).eq(cfg.pk, rowId).select("*").maybeSingle();
        if (upd.error) {
          console.error("primary update failed", upd.error);
          return json({ success: false, error: `Update failed for ${cfg.table}: ${upd.error.message}` }, 500);
        }
        updatedPrimary = upd.data;
      }

      // --- WRITE link table (hs_coaches / counselors only) ---
      let preLinkRow: Record<string, any> | null = null;
      let updatedLink: Record<string, any> | null = null;
      if (cfg.has_link_table && Object.keys(linkDiff).length > 0) {
        // Find link row by FK to user_id (preRow.user_id)
        const userUuid = preRow.user_id;
        if (!userUuid) {
          return json({ success: false, error: `Row ${cfg.table}.${cfg.pk}=${rowId} missing user_id; cannot resolve link table` }, 500);
        }
        const linkResp = await db.from(cfg.link_table!).select("*").eq(cfg.link_fk_to_user!, userUuid).maybeSingle();
        if (linkResp.error) {
          console.error("link read failed", linkResp.error);
          return json({ success: false, error: `Link read failed: ${linkResp.error.message}` }, 500);
        }
        if (linkResp.data) {
          preLinkRow = linkResp.data;
          const linkUpd = await db.from(cfg.link_table!).update(linkDiff).eq("id", preLinkRow!.id).select("*").maybeSingle();
          if (linkUpd.error) {
            console.error("link update failed", linkUpd.error);
            return json({ success: false, error: `Link update failed: ${linkUpd.error.message}` }, 500);
          }
          updatedLink = linkUpd.data;
        } else {
          // No existing link row — INSERT new (admin-create new link)
          const insertPayload = { ...linkDiff, [cfg.link_fk_to_user!]: userUuid };
          const linkIns = await db.from(cfg.link_table!).insert(insertPayload).select("*").maybeSingle();
          if (linkIns.error) {
            console.error("link insert failed", linkIns.error);
            return json({ success: false, error: `Link insert failed: ${linkIns.error.message}` }, 500);
          }
          updatedLink = linkIns.data;
        }
      }

      // --- AUDIT WRITES (one row per field changed, Q7) ---
      const auditRows: any[] = [];
      const primaryFields = cfg.has_link_table ? Object.keys(usersDiff) : Object.keys(flatDiff);
      for (const f of primaryFields) {
        auditRows.push({
          admin_email,
          action: "UPDATE",
          table_name: cfg.table,
          row_id: String(rowId),
          field: f,
          old_value: { [f]: preRow[f] ?? null },
          new_value: { [f]: updatedPrimary?.[f] ?? null },
        });
      }
      if (cfg.has_link_table && updatedLink) {
        for (const f of Object.keys(linkDiff)) {
          auditRows.push({
            admin_email,
            action: "UPDATE",
            table_name: cfg.link_table!,
            row_id: String(updatedLink.id),
            field: f,
            old_value: { [f]: preLinkRow?.[f] ?? null },
            new_value: { [f]: updatedLink[f] ?? null },
          });
        }
      }
      if (auditRows.length > 0) {
        const auditIns = await db.from("admin_audit_log").insert(auditRows);
        if (auditIns.error) {
          // Non-fatal — log but continue (mirrors admin-update-school audit failure handling)
          console.error("audit insert failed:", auditIns.error);
        } else {
          auditCount += auditRows.length;
        }
      }

      // Compose merged row for response (primary + link join shape)
      const mergedRow: Record<string, any> = { ...updatedPrimary };
      if (updatedLink) {
        mergedRow.link = updatedLink;
        mergedRow.hs_program_id = updatedLink.hs_program_id ?? null;
        if ("is_head_coach" in updatedLink) mergedRow.is_head_coach = updatedLink.is_head_coach;
      }
      updatedRows.push(mergedRow);
    }

    if (conflicts.length > 0) {
      return json({ success: false, error: "Conflict", conflicts }, 409);
    }

    return json({ success: true, updated_count: updatedRows.length, audit_count: auditCount, updated_rows: updatedRows });
  } catch (err) {
    console.error("admin-update-account: unexpected error", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return json({ success: false, error: msg }, 500);
  }
});
