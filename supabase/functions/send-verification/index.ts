// send-verification Edge Function
// Creates a verification token in email_verify_tokens and sends the verification
// email via Resend API.
//
// Called by the app after seeding a new user account. The token is a UUID with a
// 24-hour expiry. The email links to the verify-email Edge Function.
//
// Spec reference: patch-schema-auth-spec-v2.md §3.2
// No SAID. user_id is sole identity key.
//
// Required env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY  — needed to write to email_verify_tokens without RLS
//   RESEND_API_KEY             — Resend sending key
//   VERIFY_EMAIL_FUNCTION_URL  — public URL of the verify-email Edge Function
//                                e.g. https://<project>.supabase.co/functions/v1/verify-email

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const VERIFY_EMAIL_FUNCTION_URL = Deno.env.get("VERIFY_EMAIL_FUNCTION_URL")!;

// Token TTL: 24 hours in milliseconds
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// Generates a random UUID token using the Web Crypto API available in Deno.
function generateToken(): string {
  return crypto.randomUUID();
}

interface SendVerificationBody {
  user_id: string;
  email: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: SendVerificationBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { user_id, email } = body;

  if (!user_id || !email) {
    return new Response(
      JSON.stringify({ error: "user_id and email are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Service role client — writes to email_verify_tokens without RLS restrictions.
  // This is correct: the function is called server-side (admin workflow or
  // trusted app logic), not from unauthenticated client browsers.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Step 1: Generate a UUID token and compute 24-hour expiry.
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  // Step 2: Write the token row to email_verify_tokens.
  // A new row is created each time — resend creates a fresh token.
  // Old unused rows expire naturally. Cleanup is a Phase 2 operational task.
  const { error: insertError } = await supabase
    .from("email_verify_tokens")
    .insert({
      user_id,
      token,
      expires_at: expiresAt,
      // used_at: NULL — not set until verify-email marks it consumed
    });

  if (insertError) {
    console.error("send-verification: failed to insert token", insertError);
    return new Response(
      JSON.stringify({ error: "Failed to create verification token" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Step 3: Build the verification link that the email will contain.
  const verifyLink = `${VERIFY_EMAIL_FUNCTION_URL}?token=${token}`;

  // Step 4: Send the email via Resend.
  const emailPayload = {
    from: "noreply@grittyfb.com",
    to: [email],
    subject: "Verify your GrittyFB account",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your GrittyFB account</title>
  <style>
    body { font-family: sans-serif; background: #f9f9f9; margin: 0; padding: 40px 0; }
    .container { max-width: 480px; margin: 0 auto; background: #fff;
                 border: 1px solid #e8e8e8; border-radius: 8px;
                 padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    h1 { color: #8b3a3a; font-size: 1.4rem; margin-bottom: 16px; }
    p { color: #444; line-height: 1.6; margin-bottom: 16px; }
    .button { display: inline-block; background: #8b3a3a; color: #fff;
              text-decoration: none; padding: 12px 28px; border-radius: 4px;
              font-weight: bold; font-size: 1rem; margin: 8px 0; }
    .footer { margin-top: 32px; font-size: 0.85rem; color: #888; }
    .link-fallback { word-break: break-all; color: #8b3a3a; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Verify your GrittyFB account</h1>
    <p>Click the button below to verify your email address and complete your
       GrittyFB account setup.</p>
    <p>
      <a class="button" href="${verifyLink}">Verify Email Address</a>
    </p>
    <p>This link expires in 24 hours.</p>
    <p>If you did not create a GrittyFB account, you can safely ignore this email.</p>
    <div class="footer">
      <p>If the button above does not work, copy and paste this link into your browser:</p>
      <p class="link-fallback">${verifyLink}</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailPayload),
  });

  if (!resendResponse.ok) {
    const resendError = await resendResponse.text();
    console.error("send-verification: Resend API error", resendError);
    // Token was already written — we do not roll it back. The caller can
    // retry; a new token row will be created. The orphaned token will
    // expire naturally after 24 hours.
    return new Response(
      JSON.stringify({ error: "Failed to send verification email" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, message: "Verification email sent" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
