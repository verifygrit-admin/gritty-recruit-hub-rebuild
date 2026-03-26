// verify-email Edge Function
// Receives ?token= query param, validates against email_verify_tokens,
// marks token used, sets public.users.email_verified = true.
// Uses SERVICE ROLE KEY — required to write to public.users and email_verify_tokens
// without RLS interference.
//
// Spec reference: patch-schema-auth-spec-v2.md §3.2
// No SAID. user_id is sole identity key.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// HTML response helpers — returns a simple page so users see a readable result
// in the browser after clicking the email link.

function successPage(): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Verified — GrittyFB</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0;
           background: #f9f9f9; }
    .card { background: #fff; border: 1px solid #e8e8e8; border-radius: 8px;
            padding: 48px 40px; max-width: 420px; width: 90vw;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
    h1 { color: #8b3a3a; margin-bottom: 12px; font-size: 1.5rem; }
    p { color: #444; line-height: 1.6; }
    a { color: #8b3a3a; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Email Verified</h1>
    <p>Your email address has been verified successfully.</p>
    <p>Your account is currently pending admin activation.
       You will receive an email when your account is ready to use.</p>
    <p><a href="/">Return to GrittyFB</a></p>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function errorPage(message: string, status = 400): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verification Failed — GrittyFB</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0;
           background: #f9f9f9; }
    .card { background: #fff; border: 1px solid #e8e8e8; border-radius: 8px;
            padding: 48px 40px; max-width: 420px; width: 90vw;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
    h1 { color: #8b3a3a; margin-bottom: 12px; font-size: 1.5rem; }
    p { color: #444; line-height: 1.6; }
    a { color: #8b3a3a; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Verification Failed</h1>
    <p>${message}</p>
    <p>If you need a new verification link, please contact support or
       request a new email from the app.</p>
    <p><a href="/">Return to GrittyFB</a></p>
  </div>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Only GET requests are valid for email verification links.
  if (req.method !== "GET") {
    return errorPage("Method not allowed.", 405);
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token || token.trim() === "") {
    return errorPage("No verification token provided.");
  }

  // Service role client — bypasses RLS, required for writing to
  // email_verify_tokens and public.users from an unauthenticated request.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Step 1: Look up the token. Must be unused and not expired.
  const { data: tokenRow, error: tokenError } = await supabase
    .from("email_verify_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token", token)
    .single();

  if (tokenError || !tokenRow) {
    return errorPage("This verification link is invalid or does not exist.");
  }

  if (tokenRow.used_at !== null) {
    return errorPage("This verification link has already been used.");
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return errorPage(
      "This verification link has expired. Please request a new one."
    );
  }

  const userId: string = tokenRow.user_id;

  // Step 2: Mark the token as used. Preserves the audit trail — we never delete rows.
  const { error: markError } = await supabase
    .from("email_verify_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  if (markError) {
    console.error("verify-email: failed to mark token used", markError);
    return errorPage(
      "An error occurred while processing your verification. Please try again.",
      500
    );
  }

  // Step 3: Set email_verified = true on public.users.
  // account_status remains 'pending' — admin activation is a separate step per spec §3.2.
  const { error: userError } = await supabase
    .from("users")
    .update({ email_verified: true })
    .eq("user_id", userId);

  if (userError) {
    console.error("verify-email: failed to set email_verified", userError);
    return errorPage(
      "Verification recorded but we could not update your account. Please contact support.",
      500
    );
  }

  return successPage();
});
