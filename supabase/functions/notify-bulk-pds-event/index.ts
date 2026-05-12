// notify-bulk-pds-event Edge Function
// Sprint 026 — EF4 of 4. Single dispatcher for the three Bulk PDS email
// notification events (submission / approval / rejection).
//
// Conforms to src/lib/bulkPds/notificationContract.md (request + response shapes).
//
// POST /functions/v1/notify-bulk-pds-event
//
// Auth gate accepts THREE caller classes:
//   - hs_coach user JWT: may only fire event_type='submission'
//   - admin user JWT:    may fire event_type='approval' or 'rejection'
//   - service-role JWT:  may fire any event_type (used by approve/reject EFs)
//
// Mismatched (caller, event_type) returns 403.
//
// Lifecycle never blocks on email failure. If RESEND_API_KEY is absent the
// shared helper logs EMAIL_DISABLED and returns success.
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Optional env: RESEND_API_KEY (absent → emails_disabled=true).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendBulkPdsEmail } from "../_shared/sendBulkPdsEmail.ts";
import { findStaffByUserId } from "../_shared/schoolStaff.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = Deno.env.get("BULK_PDS_ADMIN_EMAIL") ?? "chris@grittyfb.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

type EventType = "submission" | "approval" | "rejection";

const VALID_EVENTS: EventType[] = ["submission", "approval", "rejection"];

// Field labels for the approval delta block.
const FIELD_LABELS: Record<string, string> = {
  height: "Height",
  weight: "Weight",
  speed_40: "40-yard dash",
  time_5_10_5: "Pro Agility (5-10-5)",
  time_l_drill: "L-Drill",
  bench_press: "Bench press",
  squat: "Squat",
  clean: "Clean",
};
const WRITETHRU_FIELDS = Object.keys(FIELD_LABELS);

// ── auth helpers ──────────────────────────────────────────────────────────────

interface CallerInfo {
  kind: "service" | "user";
  role: string | null;          // app_metadata.role for user, 'service_role' for service
  user_id: string | null;
}

async function resolveCaller(accessToken: string): Promise<CallerInfo | null> {
  // If the token IS the service role key, treat as service caller.
  if (accessToken === SUPABASE_SERVICE_ROLE_KEY) {
    return { kind: "service", role: "service_role", user_id: null };
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await userClient.auth.getUser(accessToken);
  if (error || !data?.user) return null;

  // Best-effort role from app_metadata (admin) OR public.users.user_type (coach).
  const adminRole = data.user.app_metadata?.role;
  if (adminRole === "admin") {
    return { kind: "user", role: "admin", user_id: data.user.id };
  }

  // Look up user_type in public.users to detect hs_coach.
  const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: pub } = await svc
    .from("users")
    .select("user_type")
    .eq("user_id", data.user.id)
    .maybeSingle();

  return { kind: "user", role: pub?.user_type ?? null, user_id: data.user.id };
}

function authorizeCaller(caller: CallerInfo, eventType: EventType): boolean {
  if (caller.kind === "service") return true;
  if (caller.role === "admin") {
    return eventType === "approval" || eventType === "rejection";
  }
  if (caller.role === "hs_coach") {
    return eventType === "submission";
  }
  return false;
}

// ── email composition ────────────────────────────────────────────────────────

interface ComposedEmail {
  recipient: string;
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#222;">
<div style="max-width:520px;margin:0 auto;padding:24px;">
<h2 style="color:#8b3a3a;margin:0 0 12px;">${escapeHtml(title)}</h2>
${body}
<p style="margin-top:32px;font-size:0.85rem;color:#888;">— GrittyFB Bulk PDS</p>
</div></body></html>`;
}

function buildSubmissionEmail(
  coachName: string,
  studentCount: number,
  submittedAt: string,
): ComposedEmail {
  const subject = `[Bulk PDS] New submission from ${coachName} — ${studentCount} player(s)`;
  const intro = `Coach <strong>${escapeHtml(coachName)}</strong> submitted bulk player data for ${studentCount} player(s) at ${escapeHtml(submittedAt)}.`;
  const cta = `Review the batch at <a href="https://app.grittyfb.com/admin/bulk-pds">/admin/bulk-pds</a>.`;
  const html = wrap("New Bulk PDS submission", `<p>${intro}</p><p>${cta}</p>`);
  const text = `New Bulk PDS submission\n\nCoach: ${coachName}\nPlayers: ${studentCount}\nSubmitted: ${submittedAt}\n\nReview: https://app.grittyfb.com/admin/bulk-pds`;
  return { recipient: ADMIN_EMAIL, subject, html, text };
}

function buildApprovalCoachEmail(
  coachName: string,
  coachEmail: string,
  studentSummaries: Array<{ studentName: string; deltas: string[] }>,
): ComposedEmail {
  const subject = `[Bulk PDS] Your player updates were approved`;
  const list = studentSummaries
    .map(
      (s) =>
        `<li><strong>${escapeHtml(s.studentName)}</strong>${
          s.deltas.length > 0
            ? `<ul>${s.deltas.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
            : ""
        }</li>`,
    )
    .join("");
  const html = wrap(
    "Player updates approved",
    `<p>Hi ${escapeHtml(coachName)},</p>
<p>The following player updates you submitted were approved and applied to player profiles:</p>
<ul>${list}</ul>
<p>No further action needed.</p>`,
  );
  const textList = studentSummaries
    .map(
      (s) =>
        `- ${s.studentName}${s.deltas.length ? "\n  " + s.deltas.join("\n  ") : ""}`,
    )
    .join("\n");
  const text =
    `Hi ${coachName},\n\nYour player updates were approved:\n\n${textList}\n\nNo further action needed.`;
  return { recipient: coachEmail, subject, html, text };
}

function buildApprovalStudentEmail(
  studentName: string,
  studentEmail: string,
  deltas: string[],
): ComposedEmail {
  const subject = `[GrittyFB] Your profile measurables were updated`;
  const deltaList = deltas.length
    ? `<ul>${deltas.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
    : `<p>(no field changes)</p>`;
  const html = wrap(
    "Your profile measurables were updated",
    `<p>Hi ${escapeHtml(studentName)},</p>
<p>Your coach submitted performance data for you, and an admin reviewed and applied it to your GrittyFB profile.</p>
${deltaList}
<p>You can view your profile at <a href="https://app.grittyfb.com/profile">/profile</a>.</p>`,
  );
  const text =
    `Hi ${studentName},\n\nYour coach submitted performance data for you and an admin applied it to your profile.\n\n${
      deltas.map((d) => "- " + d).join("\n")
    }\n\nView: https://app.grittyfb.com/profile`;
  return { recipient: studentEmail, subject, html, text };
}

function buildRejectionEmail(
  coachName: string,
  coachEmail: string,
  reason: string,
): ComposedEmail {
  const subject = `[Bulk PDS] Your player update submission was returned`;
  const html = wrap(
    "Your Bulk PDS submission was returned",
    `<p>Hi ${escapeHtml(coachName)},</p>
<p>An admin returned your recent Bulk PDS submission with the following note:</p>
<blockquote style="border-left:3px solid #8b3a3a;padding-left:12px;color:#444;">${escapeHtml(reason)}</blockquote>
<p>Please re-submit the corrected data at <a href="https://app.grittyfb.com/coach/player-updates">/coach/player-updates</a>.</p>`,
  );
  const text =
    `Hi ${coachName},\n\nAn admin returned your recent Bulk PDS submission:\n\n"${reason}"\n\nResubmit at: https://app.grittyfb.com/coach/player-updates`;
  return { recipient: coachEmail, subject, html, text };
}

function computeDeltas(
  staging: Record<string, unknown>,
  profileBefore: Record<string, unknown> | null,
): string[] {
  const out: string[] = [];
  for (const f of WRITETHRU_FIELDS) {
    const stagingVal = staging[f];
    const profileVal = profileBefore?.[f] ?? null;
    if (stagingVal === null || stagingVal === undefined) continue;
    const sStr = String(stagingVal);
    const pStr = profileVal === null || profileVal === undefined ? "—" : String(profileVal);
    if (sStr !== pStr) {
      out.push(`${FIELD_LABELS[f]}: ${pStr} → ${sStr}`);
    }
  }
  return out;
}

// ── handler ──────────────────────────────────────────────────────────────────

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return json({ success: false, error: "Authorization header required" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const eventType = body.event_type as EventType;
  if (!VALID_EVENTS.includes(eventType)) {
    return json({ success: false, error: "Invalid event_type" }, 400);
  }

  const caller = await resolveCaller(accessToken);
  if (!caller) {
    return json({ success: false, error: "Invalid or expired session token" }, 401);
  }
  if (!authorizeCaller(caller, eventType)) {
    return json({ success: false, error: "Forbidden for this event_type" }, 403);
  }

  const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const composed: ComposedEmail[] = [];

  try {
    if (eventType === "submission") {
      const coachUserId = body.coach_user_id as string;
      const submittedAt = (body.submitted_at as string) ?? new Date().toISOString();
      const studentCount = Number(body.student_count ?? 0);

      const staff = findStaffByUserId(coachUserId);
      const coachName = staff?.name ?? "A coach";

      composed.push(buildSubmissionEmail(coachName, studentCount, submittedAt));
    } else if (eventType === "approval") {
      const submissionIds = (body.submission_ids as string[]) ?? [];
      if (submissionIds.length === 0) {
        return json({ success: false, error: "submission_ids required" }, 400);
      }

      // Load staging rows.
      const { data: stagingRows, error: stagingError } = await svc
        .from("bulk_pds_submissions")
        .select("*")
        .in("id", submissionIds);
      if (stagingError) {
        console.error("notify-bulk-pds-event: staging read failed", stagingError);
        return json({ success: false, error: "Failed to read submissions" }, 500);
      }

      // Profiles map for delta computation (current state — already updated by approve EF).
      const studentIds = Array.from(
        new Set((stagingRows ?? []).map((r) => r.student_user_id as string)),
      );
      const { data: profiles } = await svc
        .from("profiles")
        .select("user_id, name, email, " + WRITETHRU_FIELDS.join(", "))
        .in("user_id", studentIds);
      const profileById = new Map<string, Record<string, unknown>>();
      for (const p of profiles ?? []) profileById.set(p.user_id as string, p);

      // Group by coach.
      const byCoach = new Map<
        string,
        Array<{ studentName: string; deltas: string[] }>
      >();
      // Student emails (one per student-athlete).
      const studentEmails: ComposedEmail[] = [];

      for (const row of (stagingRows ?? []) as Record<string, unknown>[]) {
        const profile = profileById.get(row.student_user_id as string) ?? null;
        const studentName =
          (row.student_name_snapshot as string) ??
          (profile?.name as string) ??
          "Player";
        const studentEmail =
          (row.student_email_snapshot as string) ??
          (profile?.email as string) ??
          null;
        // Deltas are best computed against pre-update profile values — those are no longer
        // available here. As a pragmatic substitute, list the staged values as the new state.
        const deltas = WRITETHRU_FIELDS
          .filter((f) => row[f] !== null && row[f] !== undefined)
          .map((f) => `${FIELD_LABELS[f]}: ${row[f]}`);

        const coachId = row.coach_user_id as string;
        const arr = byCoach.get(coachId) ?? [];
        arr.push({ studentName, deltas });
        byCoach.set(coachId, arr);

        if (studentEmail) {
          studentEmails.push(
            buildApprovalStudentEmail(studentName, studentEmail, deltas),
          );
        }
      }

      for (const [coachId, summaries] of byCoach.entries()) {
        const staff = findStaffByUserId(coachId);
        if (!staff?.email) {
          console.warn(
            `[BULK_PDS_NOTIFY] approval skip — no staff record for coach ${coachId}`,
          );
          continue;
        }
        composed.push(
          buildApprovalCoachEmail(staff.name, staff.email, summaries),
        );
      }
      composed.push(...studentEmails);
    } else if (eventType === "rejection") {
      const submissionIds = (body.submission_ids as string[]) ?? [];
      const reason = (body.rejection_reason as string) ?? "";
      if (submissionIds.length === 0) {
        return json({ success: false, error: "submission_ids required" }, 400);
      }
      if (!reason.trim()) {
        return json({ success: false, error: "rejection_reason required" }, 400);
      }

      const { data: stagingRows, error: stagingError } = await svc
        .from("bulk_pds_submissions")
        .select("coach_user_id")
        .in("id", submissionIds);
      if (stagingError) {
        console.error("notify-bulk-pds-event: staging read failed", stagingError);
        return json({ success: false, error: "Failed to read submissions" }, 500);
      }

      const coachIds = Array.from(
        new Set((stagingRows ?? []).map((r) => r.coach_user_id as string)),
      );
      for (const cid of coachIds) {
        const staff = findStaffByUserId(cid);
        if (!staff?.email) {
          console.warn(
            `[BULK_PDS_NOTIFY] rejection skip — no staff record for coach ${cid}`,
          );
          continue;
        }
        composed.push(buildRejectionEmail(staff.name, staff.email, reason));
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[BULK_PDS_NOTIFY] compose_failed event=${eventType} error=${msg}`);
    return json({ success: false, error: "Failed to compose notifications" }, 500);
  }

  // --- SEND (best-effort, never blocks) ---
  let sent = 0;
  let disabled = false;
  for (const email of composed) {
    const result = await sendBulkPdsEmail({
      event_type: eventType,
      recipient: email.recipient,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (result.sent) sent += 1;
    if (result.disabled) disabled = true;
  }

  return json({
    success: true,
    event_type: eventType,
    emails_attempted: composed.length,
    emails_sent: sent,
    emails_disabled: disabled && sent === 0,
  });
};

Deno.serve(handler);
