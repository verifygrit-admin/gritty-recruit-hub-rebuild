/**
 * shortlistMailtoCopy.js — Sprint 007 B.2 (R4 templates).
 *
 * Mailto template lookup for the Shortlist slide-out's per-doc Email buttons.
 * 14 templates total: 7 Pre-Read doc types × 2 recipients (head coach +
 * guidance counselor).
 *
 * Recipient routing (R5):
 *   - 'coach'     -> college head coach for the slide-out's school. Selected
 *                    server-side via college_coaches.is_head_coach=true for
 *                    the school's unitid. NOT the HS head coach (R5 redirect).
 *   - 'counselor' -> the student's HS guidance counselor (unchanged).
 *
 * Token substitution:
 *   applyTokens() stays pure — leaves unknown tokens as `{token}` in the
 *   output. Fallback resolution happens at the slide-out call site before
 *   tokens are passed in (per T2). See resolveTemplateTokens() below for the
 *   helper that builds the token object with fallbacks.
 *
 * See docs/specs/sprint-007/r4_template_review.md for the full review record.
 */

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Substitute tokens in a template string. Unknown tokens are left as-is.
 * Pure: no fallback resolution. Callers resolve fallbacks before invoking.
 *
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
 * Convert a profiles.grad_year to a class label using the same rule as
 * src/lib/scoring.js getClassLabel(). Inlined here to keep this module
 * dependency-free for tests.
 *
 * Sprint 007 §5.4 — used to resolve `{studentClassYear}`.
 *
 * @param {number|string|null|undefined} gradYear
 * @returns {string} 'Senior' | 'Junior' | 'Soph' | 'Freshman' | 'high school'
 */
export function classLabelFromGradYear(gradYear) {
  if (gradYear == null || gradYear === '') return 'high school';
  const yr = Number(gradYear);
  if (!Number.isFinite(yr)) return 'high school';
  const today = new Date();
  const sept1ThisYear = new Date(today.getFullYear(), 8, 1);
  const upcomingSept1Year = today < sept1ThisYear ? today.getFullYear() : today.getFullYear() + 1;
  const seniorGradYear = upcomingSept1Year + 1;
  const diff = yr - seniorGradYear;
  if (diff <= 0) return 'Senior';
  if (diff === 1) return 'Junior';
  if (diff === 2) return 'Soph';
  if (diff === 3) return 'Freshman';
  return 'Freshman';
}

/**
 * Resolve the token object with fallbacks for a slide-out mailto button.
 * Call this at the slide-out before passing tokens to applyTokens().
 *
 * @param {object} args
 * @param {object} args.profile         — { name, grad_year, position, high_school }
 * @param {string} args.schoolName
 * @param {string} args.documentType
 * @param {boolean} args.documentSubmitted
 * @param {string|null} args.coachName        — college_coaches.name for is_head_coach row
 * @param {string|null} args.counselorName    — HS counselor profiles.name
 * @returns {Record<string, string>}
 */
export function resolveTemplateTokens({
  profile = {},
  schoolName = '',
  documentType = '',
  documentSubmitted = false,
  coachName = null,
  counselorName = null,
}) {
  const fullName = (profile.name || '').trim();
  const nameParts = fullName ? fullName.split(/\s+/) : [];
  const studentFirstName = nameParts[0] || '';
  const studentLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  const studentClassYear = classLabelFromGradYear(profile.grad_year);
  const studentPosition = profile.position || 'football player';
  const studentHighSchool = profile.high_school || 'my high school';

  return {
    studentFirstName,
    studentLastName,
    studentClassYear,
    studentPosition,
    studentHighSchool,
    schoolName,
    documentType,
    documentStatus: documentSubmitted ? 'SUBMITTED' : 'NOT SUBMITTED',
    coachName: coachName && coachName.trim() ? coachName.trim() : 'Coach',
    counselorName: counselorName && counselorName.trim() ? counselorName.trim() : 'Hello',
  };
}

// ── Templates ────────────────────────────────────────────────────────────
//
// Lookup is by (recipient, documentType). Document type values match
// PRE_READ_DOC_TYPES[].label in ShortlistSlideOut.jsx.

const T = {
  transcript: {
    coach: {
      subject: '{schoolName} pre-read: Transcript',
      body:
        '{coachName},\n\n' +
        "I'm a {studentClassYear} {studentPosition} at {studentHighSchool} working through the pre-read process with {schoolName}. I wanted to make sure your admissions team has my official transcript on file for the academic review.\n\n" +
        'Happy to provide anything else your staff needs to move forward — please let me know.\n\n' +
        'Thanks,\n' +
        '{studentFirstName} {studentLastName}',
    },
    counselor: {
      subject: '{schoolName} pre-read: Transcript request',
      body:
        '{counselorName},\n\n' +
        "I'm working through the recruiting pre-read process with {schoolName} and their admissions team needs my official transcript. Current status on my end: {documentStatus}. Could you send it directly to them when you have a moment?\n\n" +
        'Let me know if you need anything from me to get it out.\n\n' +
        'Thank you,\n' +
        '{studentFirstName} {studentLastName}',
    },
  },

  senior_course_list: {
    coach: {
      subject: '{schoolName} pre-read: Senior Course List',
      body:
        '{coachName},\n\n' +
        "I wanted to share my senior year course list for {schoolName}'s admissions pre-read. {studentClassYear} at {studentHighSchool} — I can send the full course list and any teacher recommendations your team would want to see.\n\n" +
        'Let me know if your team would prefer a different format or any additional context.\n\n' +
        'Thanks,\n' +
        '{studentFirstName} {studentLastName}',
    },
    counselor: {
      subject: '{schoolName} pre-read: Senior Course List request',
      body:
        '{counselorName},\n\n' +
        "I'm doing the recruiting pre-read with {schoolName} and they're asking for my senior course list. Current status: {documentStatus}. Could you confirm or send the official version directly to their admissions team?\n\n" +
        'Happy to fill in anything you need from my side.\n\n' +
        'Thank you,\n' +
        '{studentFirstName} {studentLastName}',
    },
  },

  writing_example: {
    coach: {
      subject: '{schoolName} pre-read: Writing Example',
      body:
        '{coachName},\n\n' +
        "Sharing a writing example for {schoolName}'s admissions pre-read. I'm a {studentClassYear} {studentPosition} at {studentHighSchool} and wanted to make sure your team has everything they need on the academic side.\n\n" +
        'Let me know if a different sample would be more useful for your review.\n\n' +
        'Thanks,\n' +
        '{studentFirstName} {studentLastName}',
    },
    counselor: {
      subject: '{schoolName} pre-read: Writing Example request',
      body:
        '{counselorName},\n\n' +
        '{schoolName} is asking for a writing sample as part of their pre-read. Current status: {documentStatus}. If you have one on file from a recent class, could you send it to their admissions team — or let me know which piece you would recommend?\n\n' +
        "Glad to send something specific if that's easier.\n\n" +
        'Thank you,\n' +
        '{studentFirstName} {studentLastName}',
    },
  },

  student_resume: {
    coach: {
      subject: '{schoolName} pre-read: Student Resume',
      body:
        '{coachName},\n\n' +
        "Sending my student resume for {schoolName}'s pre-read. Covers academics, athletics, leadership, and service in one place — should give your team the full picture without bouncing between docs.\n\n" +
        'Happy to walk through anything specific your staff wants more detail on.\n\n' +
        'Thanks,\n' +
        '{studentFirstName} {studentLastName}',
    },
    counselor: {
      subject: '{schoolName} pre-read: Student Resume request',
      body:
        '{counselorName},\n\n' +
        "I'm in the pre-read process with {schoolName} and they're looking for my student resume. Current status: {documentStatus}. Could you send the latest version on file directly to them?\n\n" +
        "Let me know if you'd like me to send you an updated copy first.\n\n" +
        'Thank you,\n' +
        '{studentFirstName} {studentLastName}',
    },
  },

  school_profile_pdf: {
    coach: {
      subject: '{schoolName} pre-read: {studentHighSchool} School Profile',
      body:
        '{coachName},\n\n' +
        "Sharing {studentHighSchool}'s school profile PDF for {schoolName}'s pre-read review. Wanted to make sure your admissions team has the grading scale and curriculum context they need to evaluate my transcript fairly.\n\n" +
        'Let me know if your team needs anything else from {studentHighSchool}.\n\n' +
        'Thanks,\n' +
        '{studentFirstName} {studentLastName}',
    },
    counselor: {
      subject: '{schoolName} pre-read: School Profile request',
      body:
        '{counselorName},\n\n' +
        "{schoolName}'s admissions office is asking for {studentHighSchool}'s school profile PDF as part of the pre-read. Current status: {documentStatus}. Could you send the most recent version directly to them?\n\n" +
        "Thanks for handling — let me know if anything's needed from my side.\n\n" +
        'Thank you,\n' +
        '{studentFirstName} {studentLastName}',
    },
  },

  sat_act_scores: {
    coach: {
      subject: '{schoolName} pre-read: SAT/ACT Scores',
      body:
        '{coachName},\n\n' +
        "Sharing my official SAT/ACT scores for {schoolName}'s academic pre-read. Want to make sure your admissions team has the report they need to run the eligibility check on their side.\n\n" +
        "Let me know if there's a preferred format or specific contact for the report.\n\n" +
        'Thanks,\n' +
        '{studentFirstName} {studentLastName}',
    },
    counselor: {
      subject: '{schoolName} pre-read: SAT/ACT Score Report request',
      body:
        '{counselorName},\n\n' +
        "I'm releasing my official SAT/ACT scores to {schoolName}'s admissions office through College Board / ACT for the pre-read. Current status on my end: {documentStatus}. Could you confirm with their admissions office that the scores arrive on their side, or coordinate timing if they have a preferred window?\n\n" +
        'Let me know if you need anything from me first.\n\n' +
        'Thank you,\n' +
        '{studentFirstName} {studentLastName}',
    },
  },

  financial_aid_info: {
    coach: {
      subject: '{schoolName} pre-read: Financial Aid Info',
      body:
        '{coachName},\n\n' +
        "I'm working through the financial aid pre-read with {schoolName} and figured you may not be the right contact for that piece — could you point me to the staffer or admissions officer who handles FA pre-read? Happy to take it from there once I know where to send it.\n\n" +
        'Thanks for the assist.\n\n' +
        'Thanks,\n' +
        '{studentFirstName} {studentLastName}',
    },
    counselor: {
      subject: '{schoolName} pre-read: Financial Aid Info request',
      body:
        '{counselorName},\n\n' +
        "I'm doing the financial aid pre-read with {schoolName}. Current status: {documentStatus}. Could you walk me through what they need from my family and where to send it — or send what's on file directly to their financial aid office if that's the right path?\n\n" +
        'Appreciate the help making sure this goes to the right place.\n\n' +
        'Thank you,\n' +
        '{studentFirstName} {studentLastName}',
    },
  },
};

/** Frozen at module-load so consumers cannot mutate. */
export const MAILTO_TEMPLATES = Object.freeze(
  Object.fromEntries(
    Object.entries(T).map(([k, v]) => [
      k,
      Object.freeze({
        coach: Object.freeze(v.coach),
        counselor: Object.freeze(v.counselor),
      }),
    ]),
  ),
);

/**
 * Map a Pre-Read doc-type key (PRE_READ_DOC_TYPES[].key) to the template key.
 * 1:1 today; lives here so that future divergence (e.g. consolidating multiple
 * doc types onto one template) is one swap.
 */
const DOC_KEY_TO_TEMPLATE_KEY = Object.freeze({
  transcript:         'transcript',
  senior_course_list: 'senior_course_list',
  writing_example:    'writing_example',
  student_resume:     'student_resume',
  school_profile_pdf: 'school_profile_pdf',
  sat_act_scores:     'sat_act_scores',
  financial_aid_info: 'financial_aid_info',
});

export function getTemplate(recipient, docTypeKey) {
  if (recipient !== 'coach' && recipient !== 'counselor') return null;
  const templateKey = DOC_KEY_TO_TEMPLATE_KEY[docTypeKey];
  if (!templateKey) return null;
  return MAILTO_TEMPLATES[templateKey][recipient] || null;
}

/**
 * Build a mailto: href for a Pre-Read document request email.
 *
 * @param {object} args
 * @param {'coach'|'counselor'} args.recipient
 * @param {string|null|undefined} args.email — if falsy, returns null (caller disables button)
 * @param {string} args.documentTypeKey — PRE_READ_DOC_TYPES[].key
 * @param {object} args.tokens — output of resolveTemplateTokens()
 * @returns {string|null}
 */
export function buildMailtoHref({ recipient, email, documentTypeKey, tokens = {} }) {
  if (!email) return null;
  const tpl = getTemplate(recipient, documentTypeKey);
  if (!tpl) return null;
  const subject = applyTokens(tpl.subject, tokens);
  const body = applyTokens(tpl.body, tokens);
  const qs = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${email}?${qs}`;
}

// ── Deprecated exports ───────────────────────────────────────────────────
//
// COACH_MAILTO_TEMPLATE / COUNSELOR_MAILTO_TEMPLATE were the single-template
// constants used pre-Sprint 007. They are intentionally NOT re-exported.
// Any consumer that imports them will fail at build time, surfacing the
// migration path to the new (recipient, documentType) lookup.
