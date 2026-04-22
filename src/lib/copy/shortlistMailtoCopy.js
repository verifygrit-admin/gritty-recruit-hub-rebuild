/**
 * shortlistMailtoCopy.js — Sprint 004 Wave 4 S3
 *
 * Subject + body templates for the Pre-Read document request mailto actions
 * on the Shortlist slide-out. Each document row (Section 9) renders an
 * "Email (Head) Coach" and "Email Counselor" button whose href is built from
 * these templates via buildMailtoHref().
 *
 * Context: these emails are sent from a high-school student to their HS head
 * football coach or HS guidance counselor, requesting they submit a
 * Pre-Read document (transcript, test scores, course list, etc.) to a
 * specific college coaching staff the student has shortlisted.
 *
 * Substitution tokens: {studentFirstName}, {studentLastName}, {schoolName},
 *                       {documentType}, {documentStatus}
 *
 * TODO(copy-qa): Operator to finalize mailto copy post-Sprint 004. The
 * strings below are first-draft and will be edited after stakeholder review.
 * Copy is intentionally short (3-4 lines) to work well on mobile Gmail /
 * Apple Mail default compose windows.
 */

export const COACH_MAILTO_TEMPLATE = Object.freeze({
  subject: 'Pre-Read request: {documentType} for {schoolName}',
  body:
    'Coach,\n\n' +
    "I'm working through the pre-read process with {schoolName} and still need the {documentType} submitted. Current status: {documentStatus}.\n\n" +
    'Would you be able to send it directly to their recruiting coordinator when you get a chance? Happy to forward the contact.\n\n' +
    'Thanks,\n' +
    '{studentFirstName} {studentLastName}',
});

export const COUNSELOR_MAILTO_TEMPLATE = Object.freeze({
  subject: 'Pre-Read request: {documentType} for {schoolName}',
  body:
    'Hi,\n\n' +
    "I'm applying through the recruiting pre-read process with {schoolName} and they still need my {documentType}. Current status: {documentStatus}.\n\n" +
    'Could you submit it on my behalf when you have a moment? Let me know if you need anything from me to move it forward.\n\n' +
    'Thank you,\n' +
    '{studentFirstName} {studentLastName}',
});

/**
 * Substitute tokens in a template string. Unknown tokens are left as-is.
 * @param {string} template
 * @param {Record<string, string>} tokens
 * @returns {string}
 */
export function applyTokens(template, tokens = {}) {
  if (typeof template !== 'string') return '';
  let out = template;
  for (const [key, value] of Object.entries(tokens)) {
    const replacement = value == null ? '' : String(value);
    out = out.split(`{${key}}`).join(replacement);
  }
  return out;
}

/**
 * Build a mailto: href for a Pre-Read document request email.
 *
 * @param {object} args
 * @param {'coach'|'counselor'} args.recipient
 * @param {string|null|undefined} args.email - if falsy, returns null (caller disables button)
 * @param {object} args.tokens - { studentFirstName, studentLastName, schoolName, documentType, documentStatus }
 * @returns {string|null}
 */
export function buildMailtoHref({ recipient, email, tokens = {} }) {
  if (!email) return null;
  const tpl = recipient === 'counselor' ? COUNSELOR_MAILTO_TEMPLATE : COACH_MAILTO_TEMPLATE;
  const subject = applyTokens(tpl.subject, tokens);
  const body = applyTokens(tpl.body, tokens);
  const qs = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${email}?${qs}`;
}
