/**
 * CMG token substitution engine (skeleton — Phase 5/6 will fill in).
 *
 * Sprint 025 Phase 4 — scaffold only. Real substitution logic lands in
 * Phase 5 (FormPane) and Phase 6 (PreviewPane).
 *
 * Contract (target):
 *   substitute(template: string, ctx: SubstitutionContext) → string
 *
 * SubstitutionContext shape:
 *   {
 *     profile: { name, grad_year, position, high_school, state, gpa,
 *                hudl_url, twitter, height, weight, email },
 *     form:    { school_name, camp_name, camp_location, camp_date,
 *                event_name, event_day_of_week, thank_you_sentence,
 *                position_coach_handle, head_coach_handle,
 *                junior_day_question_text, camp_question_text,
 *                ac_or_rc_last_name, attach_video_note, attach_flyer_note,
 *                coach_handle },
 *     recipient: { last_name },   // pulled from formByRecipient[activeRecipient]
 *     selectedSchool: { unitid, school_name, ... }
 *   }
 *
 * Rules:
 *   - Token strings match SUBSTITUTION_TOKENS keys verbatim, including
 *     punctuation and bracket variants.
 *   - Missing/empty values leave the token intact in the output (so the
 *     preview can wrap them as `<span class="cmg-token-placeholder">` for
 *     visual flagging in PreviewPane).
 *   - Derived tokens ([Abbrev Grad Year], [Abbv Grad Year]) compute from
 *     profile.grad_year as `"'" + last two digits`.
 *   - This is plain-string substitution — no HTML escaping at this layer.
 *     The renderer is responsible for any necessary escaping.
 */

import { SUBSTITUTION_TOKENS } from '../../data/cmgScenarios.ts';

/**
 * Resolve a single token to its string value (or null if unfilled).
 * @param {string} token - The bracketed token string, e.g. "[School Name]".
 * @param {object} ctx - SubstitutionContext (see module JSDoc).
 * @returns {string | null} - Substituted value or null if no value available.
 */
export function resolveToken(token, ctx) {
  // TODO Phase 5: full implementation. Skeleton resolves a few canonical
  // tokens so PreviewPane has a working contract during scaffolding.
  const spec = SUBSTITUTION_TOKENS[token];
  if (!spec) return null;

  if (spec.source === 'profile') {
    const value = ctx?.profile?.[spec.field];
    return value === undefined || value === null || value === '' ? null : String(value);
  }
  if (spec.source === 'derived') {
    if (spec.field === 'grad_year') {
      const year = ctx?.profile?.grad_year;
      if (!year) return null;
      return `'${String(year).slice(-2)}`;
    }
    return null;
  }
  if (spec.source === 'form') {
    const value = ctx?.form?.[spec.field];
    return value === undefined || value === null || value === '' ? null : String(value);
  }
  if (spec.source === 'recipient') {
    const value = ctx?.recipient?.[spec.field];
    return value === undefined || value === null || value === '' ? null : String(value);
  }
  return null;
}

/**
 * Substitute all tokens in a template string.
 * Phase 5 will replace this regex stub with a proper tokenizer that walks
 * the SUBSTITUTION_TOKENS dispatcher and preserves placeholders for unfilled
 * tokens (returning them wrapped by the caller for PreviewPane rendering).
 * @param {string} template - Body or subject template with [Token] placeholders.
 * @param {object} ctx - SubstitutionContext.
 * @returns {string} - Rendered string with substituted values; unfilled tokens
 *                     remain in their bracketed form so the renderer can mark them.
 */
export function substitute(template, ctx) {
  if (!template) return '';
  // TODO Phase 5: rewrite with proper tokenizer + placeholder span emission.
  // The stub below uses a permissive regex that catches every bracketed
  // [...] run. Unfilled tokens are left in-place so the caller can wrap them.
  return template.replace(/\[[^\]]+\]/g, match => {
    const resolved = resolveToken(match, ctx);
    return resolved === null ? match : resolved;
  });
}

/**
 * Render a template into a structured array of segments for PreviewPane.
 * Phase 6 will use this to emit the three placeholder span variants
 * (unfilled / autofilled / plain).
 * @param {string} template
 * @param {object} ctx
 * @returns {Array<{kind: 'text' | 'autofilled' | 'unfilled', value: string}>}
 */
export function substituteToSegments(_template, _ctx) {
  // TODO Phase 6: real segment emission for PreviewPane.
  return [];
}
