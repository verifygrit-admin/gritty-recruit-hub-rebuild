/**
 * gritGuidesCopy.js — Sprint 022 copy module
 *
 * Operator-editable copy for the /grit-guides page:
 *   - Three audience-specific explainer paragraphs (student/coach/counselor)
 *   - Mailto subject + body templates for the request flow
 *
 * Mirrors the shape of shortlistMailtoCopy.js (applyTokens helper +
 * frozen template object + buildMailtoHref helper). Single recipient
 * (chris@grittyfb.com) so no recipient routing.
 */

const REQUEST_RECIPIENT = 'chris@grittyfb.com';

export const studentExplainer =
  "A Grit Guide is a moment-in-time snapshot of your recruiting journey — " +
  "a single document that captures where you stand academically and athletically, " +
  "what programs you're tracking, and the next steps to move you forward. " +
  "We use it to develop strategy with you and your family and to advise toward " +
  "the best possible recruiting outcome. Your guide updates as your journey evolves; " +
  "the version below reflects the latest snapshot we have on file.";

export const coachExplainer =
  "A Grit Guide is a moment-in-time snapshot of a student-athlete's recruiting journey, " +
  "covering academic profile, athletic profile, target programs, and the active " +
  "recruiting strategy. For your roster, the guides below are the working documents " +
  "we use with each student and their family to drive toward optimal recruiting " +
  "outcomes — verbal/written offers at programs that fit academically, athletically, " +
  "and financially. Use the request form below to flag a roster student who needs a guide.";

export const counselorExplainer =
  "A Grit Guide is a moment-in-time snapshot of a student's recruiting journey, " +
  "designed to support selective college matriculation outcomes. For each student " +
  "on your roster, the guide captures academic standing, athletic profile, target " +
  "programs, and the active strategy — giving you a single view of how recruiting " +
  "fits into the broader college process. Use the request form below to flag a " +
  "student who needs a guide.";

export function applyTokens(template, tokens = {}) {
  if (typeof template !== 'string') return '';
  let out = template;
  for (const [key, value] of Object.entries(tokens)) {
    const replacement = value == null ? '' : String(value);
    out = out.split(`{${key}}`).join(replacement);
  }
  return out;
}

const T = {
  // Student-side: I have no guide, I want to request one.
  studentRequest: {
    subject: 'Grit Guide Request — {studentName}',
    body:
      'Hi Chris,\n\n' +
      "I don't see a Grit Guide on file for me yet — could you put one together?\n\n" +
      'Student: {studentName}\n' +
      'Email: {studentEmail}\n' +
      'School: {studentSchool}\n\n' +
      'Thanks,\n' +
      '{studentName}',
  },
  // Coach/counselor-side: I want to request a guide for one of my roster students.
  staffRequest: {
    subject: 'Grit Guide Request — {studentName}',
    body:
      'Hi Chris,\n\n' +
      "Requesting a Grit Guide for one of my students:\n\n" +
      'Student: {studentName}\n' +
      'Student email: {studentEmail}\n' +
      'School: {studentSchool}\n\n' +
      'Requested by: {requesterName} ({requesterRole})\n' +
      'Requester email: {requesterEmail}\n\n' +
      'Thanks,\n' +
      '{requesterName}',
  },
};

export const MAILTO_TEMPLATES = Object.freeze(
  Object.fromEntries(
    Object.entries(T).map(([k, v]) => [k, Object.freeze(v)])
  )
);

/**
 * buildMailtoHref — builds the mailto: URL.
 *
 * @param {object} args
 * @param {'studentRequest'|'staffRequest'} args.kind
 * @param {Record<string,string>} args.tokens
 * @returns {string}
 */
export function buildMailtoHref({ kind, tokens = {} }) {
  const tpl = MAILTO_TEMPLATES[kind];
  if (!tpl) return null;
  const subject = applyTokens(tpl.subject, tokens);
  const body = applyTokens(tpl.body, tokens);
  const qs = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${REQUEST_RECIPIENT}?${qs}`;
}
