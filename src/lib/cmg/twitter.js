/**
 * CMG Twitter/X URL normalizer.
 *
 * Sprint 025 hotfix (2026-05-12). `public.profiles.twitter` is stored as
 * either a bare handle (most common), an "@"-prefixed handle, or — defensively
 * — a full URL. The CMG renders this value as an `href` and as in-body text
 * across multiple surfaces (Phase4Profile auto-fill pane, PreviewPane body,
 * email signature, copy-to-clipboard, mailto:, cmg_message_log). When the
 * value flowed through as a bare handle, the browser resolved it as a
 * relative path (e.g. `https://app.grittyfb.com/JesseBargar27`). This
 * normalizer collapses every accepted shape to the canonical
 * `https://x.com/{handle}` form before render.
 *
 * Ground truth (Supabase sample, 2026-05-12): 7/8 values are bare handles
 * (e.g. "ElijahDonnalson"), 1/8 is "@"-prefixed (e.g. "@JesseBargar27").
 * Underscores must be preserved ("Luke_kell7" is a valid handle).
 *
 * Compare and contrast: `src/lib/recruits/utils.js` `normalizeTwitter` strips
 * down to a bare handle for storage/display in RecruitCard. This module
 * builds the full URL for href + text surfaces in the CMG. They are paired
 * but not interchangeable.
 */

/**
 * Normalize a profiles.twitter value to a full https://x.com/{handle} URL.
 *
 * Accepts:
 *   - bare handle: "AydenWatkins27" → "https://x.com/AydenWatkins27"
 *   - @-prefixed handle: "@AydenWatkins27" → "https://x.com/AydenWatkins27"
 *   - x.com URL: "https://x.com/foo" → unchanged
 *   - twitter.com URL: "https://twitter.com/foo" → "https://x.com/foo"
 *   - http variants → canonicalize to https
 *   - URL with trailing slash, query, fragment → strip down to handle, rebuild canonical
 *   - null / undefined / empty / whitespace-only → null
 *   - "@" alone, or any input that yields no usable handle → null
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeTwitterUrl(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;

  // Already a URL — canonicalize twitter.com → x.com, http → https.
  // Extract the handle segment and rebuild so trailing slash, query, and
  // fragment are stripped.
  if (/^https?:\/\//i.test(trimmed)) {
    const match = trimmed.match(
      /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([^/?#]+)/i,
    );
    if (match) {
      const handle = match[1].replace(/^@+/, '');
      return handle ? `https://x.com/${handle}` : null;
    }
    return null;
  }

  // Bare or @-prefixed handle. Strip leading @s, trailing slashes.
  const handle = trimmed.replace(/^@+/, '').replace(/\/+$/, '');
  if (!handle) return null;
  return `https://x.com/${handle}`;
}
