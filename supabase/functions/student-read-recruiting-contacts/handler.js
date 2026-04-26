// supabase/functions/student-read-recruiting-contacts/handler.js
//
// Sprint 004 — Deliverable S3 (Track C) — Shortlist slide-out
// "Email Head Coach" / "Email Counselor" mailto buttons.
//
// Pure handler for the student-read-recruiting-contacts Edge Function.
// Split out as plain .js so both:
//   - Deno.serve (index.ts) can import and wire it into the EF runtime.
//   - Vitest (tests/unit/student-read-recruiting-contacts.test.js) can import
//     and exercise it with a mocked supabase client — no network, no Deno.
//
// Auth contract:
//   - Bearer JWT required (Authorization: Bearer <accessToken>).
//   - supabase.auth.getUser(accessToken) — stateless, NOT getSession()
//     (DEC 016-C WT-B — getSession returns null in Deno EF context).
//   - user.app_metadata.role must be 'student_athlete' OR 'admin'.
//     'admin' is for testing/debug; 'student_athlete' is the production caller.
//
// Access scoping:
//   - role='student_athlete': student_user_id is forced to the authed user.id.
//       If a ?student_user_id query param is passed and does NOT match, 403.
//   - role='admin': may pass ?student_user_id=<uuid>. Defaults to own id.
//
// Query logic:
//   - hs_coach_students WHERE student_user_id = target → coach_user_id
//   - hs_counselor_students WHERE student_user_id = target → counselor_user_id
//   - For each resolved user_id, read profiles.email. If the profiles row is
//     missing, fall back to auth.admin.getUserById(id).email when available.
//     If neither yields an email, that slot returns null.
//
// Response shape:
//   200 { success: true, contacts: {
//     hs_head_coach_email,
//     hs_guidance_counselor_email,
//     hs_head_coach_name,            // Sprint 007 B.2 — added
//     hs_guidance_counselor_name,    // Sprint 007 B.2 — added (for {counselorName} token)
//   }}
//   401 { success: false, error: string }  — missing / invalid token
//   403 { success: false, error: string }  — role or scope mismatch
//   405 { success: false, error: string }  — non-GET method
//   500 { success: false, error: string }  — read failure / unexpected
//
// No broad RLS changes. No raw email exposure to other roles.
// Sprint 007 R5 redirected the slide-out's Email Coach button to the COLLEGE
// head coach (per-school via college_coaches.is_head_coach=true). That data
// is fetched client-side in ShortlistPage as a bulk query — not in this EF.
// hs_head_coach_email is kept on the response shape (deprecated post-R5) so
// existing consumers do not break.

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

/**
 * Build the handler closure. Tests inject `createClient`; the Deno entry
 * imports a real one from esm.sh.
 *
 * @param {{
 *   createClient: (url: string, key: string, opts?: unknown) => any,
 *   supabaseUrl: string,
 *   serviceRoleKey: string,
 * }} deps
 */
export function createHandler({ createClient, supabaseUrl, serviceRoleKey }) {
  return async function handler(req) {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    // --- AUTH GATE ---

    const authHeader = req.headers.get("authorization") ?? "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!accessToken) {
      return jsonResponse(
        { success: false, error: "Authorization header required" },
        401,
      );
    }

    const userClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: userData, error: userError } =
      await userClient.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      return jsonResponse(
        { success: false, error: "Invalid or expired session token" },
        401,
      );
    }

    const role = userData.user.app_metadata?.role;
    if (role !== "student_athlete" && role !== "admin") {
      return jsonResponse({ success: false, error: "Forbidden" }, 403);
    }

    const authedUserId = userData.user.id;

    // --- RESOLVE TARGET student_user_id ---

    let url;
    try {
      url = new URL(req.url);
    } catch {
      return jsonResponse({ success: false, error: "Invalid request URL" }, 400);
    }
    const requestedId = url.searchParams.get("student_user_id");

    let targetStudentId;
    if (role === "admin") {
      targetStudentId = requestedId || authedUserId;
    } else {
      // student_athlete
      if (requestedId && requestedId !== authedUserId) {
        return jsonResponse(
          { success: false, error: "Forbidden — student may only read own contacts" },
          403,
        );
      }
      targetStudentId = authedUserId;
    }

    // --- DATABASE READS (service_role) ---

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    try {
      // 1) coach link
      const coachLink = await serviceClient
        .from("hs_coach_students")
        .select("coach_user_id")
        .eq("student_user_id", targetStudentId)
        .limit(1)
        .maybeSingle();

      if (coachLink.error) {
        console.error(
          "student-read-recruiting-contacts: hs_coach_students SELECT failed",
          coachLink.error,
        );
        return jsonResponse(
          { success: false, error: "Failed to read coach link" },
          500,
        );
      }

      // 2) counselor link
      const counselorLink = await serviceClient
        .from("hs_counselor_students")
        .select("counselor_user_id")
        .eq("student_user_id", targetStudentId)
        .limit(1)
        .maybeSingle();

      if (counselorLink.error) {
        console.error(
          "student-read-recruiting-contacts: hs_counselor_students SELECT failed",
          counselorLink.error,
        );
        return jsonResponse(
          { success: false, error: "Failed to read counselor link" },
          500,
        );
      }

      const coachUserId = coachLink.data?.coach_user_id ?? null;
      const counselorUserId = counselorLink.data?.counselor_user_id ?? null;

      const coach = await resolveProfile(serviceClient, coachUserId);
      const counselor = await resolveProfile(serviceClient, counselorUserId);

      return jsonResponse({
        success: true,
        contacts: {
          hs_head_coach_email: coach.email,
          hs_guidance_counselor_email: counselor.email,
          hs_head_coach_name: coach.name,
          hs_guidance_counselor_name: counselor.name,
        },
      });
    } catch (err) {
      console.error(
        "student-read-recruiting-contacts: unexpected error",
        err,
      );
      return jsonResponse(
        { success: false, error: "Internal server error" },
        500,
      );
    }
  };
}

/**
 * Sprint 007 B.2 — resolve email AND name in one profiles read.
 * Returns { email, name } with either field nullable.
 */
async function resolveProfile(serviceClient, userId) {
  if (!userId) return { email: null, name: null };

  const profileLookup = await serviceClient
    .from("profiles")
    .select("email, name")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  let email = null;
  let name = null;
  if (!profileLookup.error && profileLookup.data) {
    email = profileLookup.data.email ?? null;
    name = profileLookup.data.name ?? null;
  }

  if (email) return { email, name };

  // Fallback: auth.users via admin API if present on the injected client.
  try {
    if (
      serviceClient.auth &&
      serviceClient.auth.admin &&
      typeof serviceClient.auth.admin.getUserById === "function"
    ) {
      const adminLookup = await serviceClient.auth.admin.getUserById(userId);
      const fallbackEmail = adminLookup?.data?.user?.email ?? null;
      if (fallbackEmail) return { email: fallbackEmail, name };
    }
  } catch (err) {
    console.error(
      "student-read-recruiting-contacts: auth.admin.getUserById failed",
      err,
    );
  }

  return { email: null, name };
}
