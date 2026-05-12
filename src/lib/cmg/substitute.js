/**
 * CMG token substitution engine.
 *
 * Sprint 025 Phase 5 — full implementation. Replaces the Phase 4 skeleton.
 *
 * Contract:
 *   resolveToken(token, ctx) → string | null
 *   substitute(template, ctx) → string
 *   substituteToSegments(template, ctx) → Array<{kind, value}>
 *   renderSegments(segments) → string
 *   getRequiredFieldsFilled(scenario, ctx) → boolean
 *   tokenize(template) → Array<{kind, value, token}>   (internal helper, exported for tests)
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
 * Rules (SPEC_FOR_CODE Step 5):
 *   - Token strings match SUBSTITUTION_TOKENS keys verbatim, including
 *     punctuation and bracket variants. Longer tokens take precedence over
 *     shorter ones that share a prefix.
 *   - Missing/empty values in plain substitute() leave the bracketed token
 *     intact in the output so the renderer can wrap it as a placeholder.
 *   - Derived tokens ([Abbrev Grad Year], [Abbv Grad Year]) compute from
 *     profile.grad_year as `"'" + last two digits`.
 *   - substituteToSegments returns three segment kinds:
 *       "text"       — plain literal text + form/recipient-filled values
 *       "autofilled" — profile/derived resolved values (sand-tinted span)
 *       "unfilled"   — bracketed tokens that resolved to null (burnt-orange
 *                      dotted underline)
 *   - This module is plain-string. No HTML escaping. Renderer handles that.
 */

import { SUBSTITUTION_TOKENS } from '../../data/cmgScenarios.ts';

// ---------------------------------------------------------------------------
// Token list — sorted by length descending so longer multi-word tokens match
// before shorter overlapping ones (e.g. "[Last Name of the Assistant Coach...]"
// must beat "[Last Name]"). Cached at module load — SUBSTITUTION_TOKENS is a
// static dispatcher; no need to recompute per call.
// ---------------------------------------------------------------------------

const TOKEN_KEYS_BY_LENGTH_DESC = Object.keys(SUBSTITUTION_TOKENS).sort(
  (a, b) => b.length - a.length,
);

// ---------------------------------------------------------------------------
// resolveToken — single-token dispatch
// ---------------------------------------------------------------------------

/**
 * Resolve a single token to its string value (or null if unfilled).
 * @param {string} token - The bracketed token string, e.g. "[School Name]".
 * @param {object} ctx - SubstitutionContext.
 * @returns {string | null} - Substituted value or null if no value available.
 */
export function resolveToken(token, ctx) {
  const spec = SUBSTITUTION_TOKENS[token];
  if (!spec) return null;

  if (spec.source === 'profile') {
    const value = ctx?.profile?.[spec.field];
    return value === undefined || value === null || value === '' ? null : String(value);
  }
  if (spec.source === 'derived') {
    if (spec.field === 'grad_year') {
      const year = ctx?.profile?.grad_year;
      if (year === undefined || year === null || year === '') return null;
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

// ---------------------------------------------------------------------------
// tokenize — explicit-walk tokenizer
// ---------------------------------------------------------------------------
//
// Strategy: walk the template index-by-index. At each '[' boundary, try every
// known SUBSTITUTION_TOKENS key (longest-first) to find a match at the current
// position. If a token matches, emit a "token" entry and advance past it. If
// nothing matches (the bracketed run is not a known token, e.g. mismatched
// punctuation or a malformed placeholder), the '[' is consumed as plain text.
// Adjacent text characters are accumulated into a single text entry.
//
// Why not regex: a permissive `/\[[^\]]+\]/g` would catch malformed brackets
// and (worse) capture unknown tokens as if they were known, leading to
// silently-broken renders. The explicit walk + dispatcher lookup guarantees
// that every emitted "token" entry maps to a real SUBSTITUTION_TOKENS key.

/**
 * Split a template into a sequence of text and token entries.
 * @param {string} template
 * @returns {Array<{kind: 'text' | 'token', value: string, token: string | null}>}
 */
export function tokenize(template) {
  if (!template) return [];
  const out = [];
  let buf = '';
  let i = 0;
  const len = template.length;

  const flushText = () => {
    if (buf.length > 0) {
      out.push({ kind: 'text', value: buf, token: null });
      buf = '';
    }
  };

  while (i < len) {
    const ch = template[i];
    if (ch === '[') {
      // Try to match a known token at this position (longest-first).
      let matched = null;
      for (const key of TOKEN_KEYS_BY_LENGTH_DESC) {
        if (template.startsWith(key, i)) {
          matched = key;
          break;
        }
      }
      if (matched) {
        flushText();
        out.push({ kind: 'token', value: matched, token: matched });
        i += matched.length;
        continue;
      }
    }
    buf += ch;
    i += 1;
  }
  flushText();
  return out;
}

// ---------------------------------------------------------------------------
// substitute — plain-text substitution
// ---------------------------------------------------------------------------

/**
 * Substitute all tokens in a template string.
 * Unfilled tokens are left as their bracketed form so the renderer can wrap
 * them as placeholders.
 * @param {string} template
 * @param {object} ctx
 * @returns {string}
 */
export function substitute(template, ctx) {
  if (!template) return '';
  const entries = tokenize(template);
  let out = '';
  for (const entry of entries) {
    if (entry.kind === 'text') {
      out += entry.value;
    } else {
      const resolved = resolveToken(entry.token, ctx);
      out += resolved === null ? entry.value : resolved;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// substituteToSegments — structured output for PreviewPane
// ---------------------------------------------------------------------------

/**
 * Render a template into a structured array of segments for PreviewPane.
 *
 *   "text"       — plain literal text + form/recipient-filled values
 *   "autofilled" — profile/derived resolved values (sand-tinted span)
 *   "unfilled"   — bracketed tokens that resolved to null (burnt-orange
 *                  dotted underline)
 *
 * Adjacent text segments are merged into a single segment.
 *
 * @param {string} template
 * @param {object} ctx
 * @returns {Array<{kind: 'text' | 'autofilled' | 'unfilled', value: string}>}
 */
export function substituteToSegments(template, ctx) {
  if (!template) return [];
  const entries = tokenize(template);
  const segments = [];

  const pushSegment = (kind, value) => {
    if (value === '') return;
    const last = segments[segments.length - 1];
    if (kind === 'text' && last && last.kind === 'text') {
      last.value += value;
      return;
    }
    segments.push({ kind, value });
  };

  for (const entry of entries) {
    if (entry.kind === 'text') {
      pushSegment('text', entry.value);
      continue;
    }
    const spec = SUBSTITUTION_TOKENS[entry.token];
    const resolved = resolveToken(entry.token, ctx);
    if (resolved === null) {
      pushSegment('unfilled', entry.token);
    } else if (spec && (spec.source === 'profile' || spec.source === 'derived')) {
      pushSegment('autofilled', resolved);
    } else {
      // form / recipient sources resolved to a value — student-entered text,
      // render plain so it merges with surrounding literal text.
      pushSegment('text', resolved);
    }
  }
  return segments;
}

// ---------------------------------------------------------------------------
// renderSegments — segment array back to plain string
// ---------------------------------------------------------------------------

/**
 * Join segments back into a plain-text string. Unfilled segments render as
 * their bracketed form. Used by Copy and Email-to-Self actions.
 * @param {Array<{kind: string, value: string}>} segments
 * @returns {string}
 */
export function renderSegments(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return '';
  let out = '';
  for (const seg of segments) {
    out += seg.value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// getRequiredFieldsFilled — phase-advance gate
// ---------------------------------------------------------------------------

/**
 * Returns true iff every entry in scenario.required_form_fields resolves to a
 * non-null value in ctx.form OR ctx.recipient. Used by FormPane's progressive
 * reveal to gate phase advancement.
 *
 * Resolution order: for each required field, check ctx.form[field] first, then
 * ctx.recipient[field]. Treat undefined / null / empty-string as unfilled.
 *
 * @param {{required_form_fields: string[]}} scenario
 * @param {{form?: object, recipient?: object}} ctx
 * @returns {boolean}
 */
export function getRequiredFieldsFilled(scenario, ctx) {
  if (!scenario || !Array.isArray(scenario.required_form_fields)) return false;
  if (scenario.required_form_fields.length === 0) return true;
  const form = ctx?.form ?? {};
  const recipient = ctx?.recipient ?? {};
  for (const field of scenario.required_form_fields) {
    const formVal = form[field];
    const recipientVal = recipient[field];
    const filled =
      (formVal !== undefined && formVal !== null && formVal !== '') ||
      (recipientVal !== undefined && recipientVal !== null && recipientVal !== '');
    if (!filled) return false;
  }
  return true;
}
