// _shared/sendBulkPdsEmail.ts
// Sprint 026 — Single entry point for all Bulk PDS email sends.
//
// Reads RESEND_API_KEY from env. If absent, logs EMAIL_DISABLED with the
// would-be recipient list and returns { sent: false, disabled: true } —
// the caller MUST NOT treat this as an error.
//
// EMAIL_DISABLED log format (parseable, per notificationContract.md):
//   EMAIL_DISABLED: <event_type> to=<email1,email2> subject="<subject>"
//
// Resend FROM address is fixed to noreply@grittyfb.com to match the existing
// send-verification EF.

export interface SendBulkPdsEmailArgs {
  event_type: "submission" | "approval" | "rejection";
  recipient: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendBulkPdsEmailResult {
  sent: boolean;
  disabled: boolean;
  error?: string;
}

const RESEND_FROM = "noreply@grittyfb.com";

export async function sendBulkPdsEmail(
  args: SendBulkPdsEmailArgs,
): Promise<SendBulkPdsEmailResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");

  if (!apiKey) {
    // Graceful degradation per Q4. Log in the parseable format the contract requires.
    console.log(
      `EMAIL_DISABLED: ${args.event_type} to=${args.recipient} subject="${args.subject}"`,
    );
    return { sent: false, disabled: true };
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [args.recipient],
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error(
        `[BULK_PDS_EMAIL] resend_failure event_type=${args.event_type} to=${args.recipient} status=${resp.status} body=${detail}`,
      );
      return { sent: false, disabled: false, error: `resend_status_${resp.status}` };
    }

    return { sent: true, disabled: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[BULK_PDS_EMAIL] resend_exception event_type=${args.event_type} to=${args.recipient} error=${msg}`,
    );
    return { sent: false, disabled: false, error: msg };
  }
}
