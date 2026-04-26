/**
 * shortlist-mailto-templates.test.js — Sprint 007 B.2 §6.5
 *
 * Asserts the 14-template lookup is complete and well-formed:
 *   - Every PRE_READ_DOC_TYPES key has both a coach and counselor template
 *   - Every template carries a non-empty subject and body string
 *   - Token resolution + buildMailtoHref produce a valid mailto: URL with
 *     the expected encoded subject + body
 *   - Token fallbacks (Coach / Hello / class label / position / HS / Junior)
 *     resolve correctly when source fields are missing
 *
 * Pure-data test — no DOM, no network.
 */

import { describe, it, expect } from 'vitest';
import {
  applyTokens,
  classLabelFromGradYear,
  resolveTemplateTokens,
  getTemplate,
  buildMailtoHref,
  MAILTO_TEMPLATES,
} from '../../src/lib/copy/shortlistMailtoCopy.js';

// Mirrors PRE_READ_DOC_TYPES in src/components/ShortlistSlideOut.jsx.
const PRE_READ_DOC_TYPE_KEYS = Object.freeze([
  'transcript',
  'senior_course_list',
  'writing_example',
  'student_resume',
  'school_profile_pdf',
  'sat_act_scores',
  'financial_aid_info',
]);

const RECIPIENTS = Object.freeze(['coach', 'counselor']);

describe('Sprint 007 R4 — 14-template lookup completeness', () => {
  it('every PRE_READ_DOC_TYPES key has both coach + counselor templates', () => {
    for (const key of PRE_READ_DOC_TYPE_KEYS) {
      for (const recipient of RECIPIENTS) {
        const tpl = getTemplate(recipient, key);
        expect(tpl, `${recipient} template for ${key}`).toBeTruthy();
        expect(typeof tpl.subject).toBe('string');
        expect(tpl.subject.length).toBeGreaterThan(0);
        expect(typeof tpl.body).toBe('string');
        expect(tpl.body.length).toBeGreaterThan(0);
      }
    }
  });

  it('exposes exactly 14 (recipient × doc type) template entries', () => {
    let count = 0;
    for (const key of Object.keys(MAILTO_TEMPLATES)) {
      for (const recipient of RECIPIENTS) {
        if (MAILTO_TEMPLATES[key][recipient]) count += 1;
      }
    }
    expect(count).toBe(14);
  });

  it('all coach subjects use the colon separator (Sprint 007 §5.9)', () => {
    for (const key of PRE_READ_DOC_TYPE_KEYS) {
      const tpl = getTemplate('coach', key);
      expect(tpl.subject).toMatch(/pre-read:/);
      expect(tpl.subject).not.toMatch(/pre-read —/);
    }
  });

  it('all counselor subjects end with " request" (Sprint 007 T3)', () => {
    for (const key of PRE_READ_DOC_TYPE_KEYS) {
      const tpl = getTemplate('counselor', key);
      expect(tpl.subject).toMatch(/ request$/);
    }
  });

  it('returns null for unknown recipient', () => {
    expect(getTemplate('admissions', 'transcript')).toBeNull();
    expect(getTemplate(null, 'transcript')).toBeNull();
  });

  it('returns null for unknown doc type', () => {
    expect(getTemplate('coach', 'made_up_doc_type')).toBeNull();
  });
});

describe('Sprint 007 R4 — applyTokens stays pure (T2)', () => {
  it('leaves unknown tokens as-is so the missing-data case is visible upstream', () => {
    const out = applyTokens('Hi {studentFirstName}, {unresolvedToken} works.', {
      studentFirstName: 'Alex',
    });
    expect(out).toBe('Hi Alex, {unresolvedToken} works.');
  });

  it('substitutes empty strings for null/undefined token values', () => {
    const out = applyTokens('A{x}B', { x: null });
    expect(out).toBe('AB');
  });
});

describe('Sprint 007 R4 — classLabelFromGradYear (§5.4)', () => {
  it('maps grad_year to "Senior" / "Junior" / "Soph" / "Freshman" via getClassLabel rule', () => {
    // Today is 2026-04-26 per session context; getClassLabel uses sept-1
    // as the academic-year boundary. Senior = upcoming grad year.
    // Compute the seniorGradYear here to keep this test stable across runs.
    const today = new Date();
    const sept1 = new Date(today.getFullYear(), 8, 1);
    const upcoming = today < sept1 ? today.getFullYear() : today.getFullYear() + 1;
    const seniorGrad = upcoming + 1;

    expect(classLabelFromGradYear(seniorGrad)).toBe('Senior');
    expect(classLabelFromGradYear(seniorGrad + 1)).toBe('Junior');
    expect(classLabelFromGradYear(seniorGrad + 2)).toBe('Soph');
    expect(classLabelFromGradYear(seniorGrad + 3)).toBe('Freshman');
  });

  it('falls back to "high school" when grad_year is missing or unparseable', () => {
    expect(classLabelFromGradYear(null)).toBe('high school');
    expect(classLabelFromGradYear('')).toBe('high school');
    expect(classLabelFromGradYear('not-a-year')).toBe('high school');
  });
});

describe('Sprint 007 R4 — resolveTemplateTokens fallbacks', () => {
  it('resolves "Coach" when coachName is null (§5.7)', () => {
    const t = resolveTemplateTokens({
      profile: { name: 'Alex Rivera' },
      schoolName: 'Maroon State',
      documentType: 'Transcript',
      coachName: null,
      counselorName: 'Mr. Jones',
    });
    expect(t.coachName).toBe('Coach');
    expect(t.counselorName).toBe('Mr. Jones');
  });

  it('resolves "Hello" when counselorName is null (§5.8)', () => {
    const t = resolveTemplateTokens({
      profile: { name: 'Alex Rivera' },
      schoolName: 'Maroon State',
      documentType: 'Transcript',
      coachName: 'Coach Smith',
      counselorName: null,
    });
    expect(t.counselorName).toBe('Hello');
    expect(t.coachName).toBe('Coach Smith');
  });

  it('resolves position fallback "football player" when profile.position missing', () => {
    const t = resolveTemplateTokens({
      profile: { name: 'Alex Rivera' },
      schoolName: 'Maroon State',
      documentType: 'Transcript',
    });
    expect(t.studentPosition).toBe('football player');
  });

  it('resolves high_school fallback "my high school" when profile.high_school missing', () => {
    const t = resolveTemplateTokens({
      profile: { name: 'Alex Rivera' },
      schoolName: 'Maroon State',
      documentType: 'Transcript',
    });
    expect(t.studentHighSchool).toBe('my high school');
  });

  it('marks documentStatus from documentSubmitted boolean', () => {
    const submitted = resolveTemplateTokens({
      profile: { name: 'Alex Rivera' },
      schoolName: 'Maroon State',
      documentType: 'Transcript',
      documentSubmitted: true,
    });
    const notSubmitted = resolveTemplateTokens({
      profile: { name: 'Alex Rivera' },
      schoolName: 'Maroon State',
      documentType: 'Transcript',
      documentSubmitted: false,
    });
    expect(submitted.documentStatus).toBe('SUBMITTED');
    expect(notSubmitted.documentStatus).toBe('NOT SUBMITTED');
  });

  it('splits profile.name into first + last on whitespace', () => {
    const t = resolveTemplateTokens({
      profile: { name: 'Alex Q. Rivera' },
      schoolName: 'Maroon State',
      documentType: 'Transcript',
    });
    expect(t.studentFirstName).toBe('Alex');
    expect(t.studentLastName).toBe('Q. Rivera');
  });
});

describe('Sprint 007 R4 — buildMailtoHref', () => {
  const baseTokens = resolveTemplateTokens({
    profile: { name: 'Alex Rivera', grad_year: 2027, position: 'WR', high_school: 'Bridgewater-Raynham' },
    schoolName: 'Maroon State University',
    documentType: 'Transcript',
    documentSubmitted: false,
    coachName: 'Coach Reynolds',
    counselorName: 'Mr. Jones',
  });

  it('constructs a mailto URL with encoded subject + body for the coach side', () => {
    const href = buildMailtoHref({
      recipient: 'coach',
      email: 'headcoach@maroonstate.edu',
      documentTypeKey: 'transcript',
      tokens: baseTokens,
    });
    expect(href).toMatch(/^mailto:headcoach@maroonstate\.edu\?/);
    expect(href).toContain('subject=');
    expect(href).toContain('body=');
    expect(href).toContain(encodeURIComponent('Maroon State University pre-read: Transcript'));
    expect(href).toContain(encodeURIComponent('Coach Reynolds,'));
    expect(href).toContain(encodeURIComponent('Bridgewater-Raynham'));
  });

  it('constructs a mailto URL with " request" subject for the counselor side', () => {
    const href = buildMailtoHref({
      recipient: 'counselor',
      email: 'counselor@school.org',
      documentTypeKey: 'transcript',
      tokens: baseTokens,
    });
    expect(href).toMatch(/^mailto:counselor@school\.org\?/);
    expect(href).toContain(encodeURIComponent('Maroon State University pre-read: Transcript request'));
    expect(href).toContain(encodeURIComponent('Mr. Jones,'));
  });

  it('returns null when email is null (caller should disable button)', () => {
    const href = buildMailtoHref({
      recipient: 'coach',
      email: null,
      documentTypeKey: 'transcript',
      tokens: baseTokens,
    });
    expect(href).toBeNull();
  });

  it('returns null for an unknown documentTypeKey', () => {
    const href = buildMailtoHref({
      recipient: 'coach',
      email: 'a@b.org',
      documentTypeKey: 'made_up',
      tokens: baseTokens,
    });
    expect(href).toBeNull();
  });
});

describe('Sprint 007 R4 — template body content checks', () => {
  it('SAT/ACT counselor template references "releasing" scores via College Board / ACT (Revision A)', () => {
    const tpl = getTemplate('counselor', 'sat_act_scores');
    expect(tpl.body).toMatch(/releasing my official SAT\/ACT scores/);
    expect(tpl.body).toMatch(/College Board \/ ACT/);
    // Asks for confirmation/timing, not for the counselor to "send the report"
    expect(tpl.body).toMatch(/confirm with their admissions office/);
  });

  it('Financial Aid coach template asks for redirection to FA contact (Revision B)', () => {
    const tpl = getTemplate('coach', 'financial_aid_info');
    expect(tpl.body).toMatch(/may not be the right contact/);
    expect(tpl.body).toMatch(/handles FA pre-read/);
  });

  it('Senior Course List coach template uses no-attachment phrasing (§5.5)', () => {
    const tpl = getTemplate('coach', 'senior_course_list');
    expect(tpl.body).toMatch(/I can send the full course list/);
    expect(tpl.body).not.toMatch(/attached\/below/);
  });
});
