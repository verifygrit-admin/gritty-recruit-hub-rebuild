/**
 * mailto: URL builder — Sprint 025 Phase 7.
 *
 * Wired by PreviewPane's "Email to Myself" action. Builds a `mailto:` URL
 * with subject + body (body and signature joined by `\n\n`) and exposes a
 * `isLong` flag so the caller can surface the advisory toast for messages
 * that may exceed mail-client URL limits.
 *
 * Per SPEC_FOR_CODE Step 7:
 *   const params = new URLSearchParams();
 *   params.set('subject', output.subject ?? '');
 *   params.set('body', `${output.body}\n\n${output.signature}`);
 *   window.location.href = `mailto:${encodeURIComponent(studentEmail)}?${params.toString()}`;
 *
 * Twitter channel does NOT use mailto — copy-only.
 *
 * Disable handling: button must be disabled if profiles.email is empty;
 *   the caller is responsible for that check. The empty/whitespace email
 *   throw here is a safety net for direct callers.
 * Long-body advisory: if body length > 2000 chars, surface a non-blocking
 *   note via Toast — "Long message — if your mail client doesn't open, use
 *   Copy instead."
 */

const LONG_BODY_THRESHOLD = 2000;

/**
 * Build the mailto: URL for an Email-to-Self action.
 * @param {object} args
 * @param {string} args.email - The student's email (URI-encoded by caller).
 * @param {string | null} args.subject - Email subject, or null/empty if scenario has none.
 * @param {string} args.body - Body text (already substituted, plain text).
 * @param {string} args.signature - Email signature (already substituted, plain text).
 * @returns {{ url: string, isLong: boolean }} - The mailto URL and a long-body flag.
 */
export function buildMailto({ email, subject, body, signature }) {
  if (email === null || email === undefined || String(email).trim() === '') {
    throw new Error('buildMailto: email is required');
  }
  const params = new URLSearchParams();
  params.set('subject', subject ?? '');
  const bodyStr = body ?? '';
  const sigStr = signature ?? '';
  const bodyWithSig = sigStr ? `${bodyStr}\n\n${sigStr}` : bodyStr;
  params.set('body', bodyWithSig);
  return {
    url: `mailto:${encodeURIComponent(email)}?${params.toString()}`,
    isLong: bodyWithSig.length > LONG_BODY_THRESHOLD,
  };
}

/**
 * Open the mailto: URL. Wrapper exists so tests can mock the navigation.
 * @param {string} url - The mailto: URL built by buildMailto.
 */
export function openMailto(url) {
  // Real navigation. Wrapper exists so unit tests can stub navigation without
  // jumping the test runner's location. Set `window.location.href` directly —
  // browsers route `mailto:` URLs to the registered mail-client handler
  // without changing page navigation state.
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
}
