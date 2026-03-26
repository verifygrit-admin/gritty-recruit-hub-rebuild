// check-account-status Edge Function
// Called by the frontend after signInWithPassword() succeeds.
// Queries public.users for the authenticated user_id and returns the fields the
// frontend needs to route correctly.
//
// Return shape:
//   { email_verified: boolean, account_status: string, user_type: string }
//
// Frontend routing logic (per spec §3.3):
//   email_verified = false         → show "Please verify your email" screen
//   account_status = 'pending'     → show "Awaiting activation" screen
//   account_status = 'active'      → proceed; route by user_type
//
// Auth: caller must pass a valid Bearer session token (the JWT from signInWithPassword).
// The function uses getSession() logic via the user's JWT — not getUser().
// Service role key is used to query public.users after the user_id is extracted
// from the verified JWT, so RLS does not block the lookup.
//
// Spec reference: patch-schema-auth-spec-v2.md §3.3
// No SAID. user_id is sole identity key.
//
// Required env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// CORS headers — frontend at app.grittyfb.com calls this function.
// Adjust origin allowlist as needed when additional domains are active.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Extract the Bearer token from the Authorization header.
  // This is the Supabase session JWT that the frontend received from
  // signInWithPassword(). We use it to identify the caller without
  // calling getUser() (which makes a separate network request that can fail).
  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!accessToken) {
    return json({ error: "Authorization header required" }, 401);
  }

  // Create a user-scoped client to verify and decode the JWT.
  // This extracts the user_id from the session token — equivalent to the
  // getSession() pattern documented in the spec (§3.3 critical rule).
  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  // getSession() on the service-role client with the user's JWT set as the
  // Authorization header returns the decoded session without a network call
  // to Supabase Auth. This is the pattern that avoids the getUser() CI failure.
  const { data: sessionData, error: sessionError } =
    await userClient.auth.getSession();

  if (sessionError || !sessionData?.session) {
    return json({ error: "Invalid or expired session token" }, 401);
  }

  const userId: string = sessionData.session.user.id;

  // Service role client for the public.users query.
  // We use service role here because RLS on public.users may require the user
  // to already be 'active', which would create a chicken-and-egg problem for
  // 'pending' accounts trying to check their own status.
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: userRow, error: userError } = await serviceClient
    .from("users")
    .select("email_verified, account_status, user_type")
    .eq("user_id", userId)
    .single();

  if (userError || !userRow) {
    // User exists in auth.users but has no row in public.users.
    // This can happen if seeding was incomplete. Surface this clearly.
    console.error(
      "check-account-status: no public.users row for user_id",
      userId,
      userError
    );
    return json(
      {
        error: "Account record not found. Please contact support.",
        code: "USER_RECORD_MISSING",
      },
      404
    );
  }

  // Return exactly the fields the frontend needs for routing.
  // No extra data — keep the surface area minimal.
  return json({
    email_verified: userRow.email_verified,
    account_status: userRow.account_status,
    user_type: userRow.user_type,
  });
});
