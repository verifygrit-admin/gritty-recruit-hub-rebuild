/**
 * @vitest-environment jsdom
 *
 * s3-shortlist-slide-out.test.jsx — Sprint 004 Wave 4 S3
 *
 * Covers ShortlistSlideOut — the terminal UI slide-out that opens when a
 * student clicks a row on ShortlistPage. Nine-section composition (close X
 * is owned by SlideOutShell, not tested here):
 *   2. School header (name + subline + added date)
 *   3. Italic context line with {First} {Last}
 *   4. Primary actions (Recruiting Questionnaire / Coaching Staff)
 *   5. Offer chips (Verbal / Committable / Commitment)
 *   6. StatusPills (SC-2) — with not_evaluated regression guard
 *   7. Financial strip (COA / Net Cost / DROI / Fastest Payback)
 *   8. Recruiting Journey Progress (collapsible)
 *   9. Pre-Read Documents — submission pill + Email Coach / Email Counselor
 *
 * useIsNarrowViewport is mocked via vi.mock so tests can flip the 400px-
 * threshold decision without touching window.innerWidth.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';

// Viewport hook mock — module-scoped flag flipped per-test via setNarrow().
let _isNarrow = false;
export function setNarrow(v) { _isNarrow = v; }

vi.mock('../../src/hooks/useIsNarrowViewport.js', () => ({
  default: () => _isNarrow,
}));

import ShortlistSlideOut from '../../src/components/ShortlistSlideOut.jsx';

// ── Fixtures ───────────────────────────────────────────────────────────────

const BASE_ITEM = {
  id: 99,
  unitid: 123456,
  school_name: 'Maroon State University',
  conference: 'Big Sky',
  div: 'FCS',
  dist: 420,
  added_at: '2026-03-15T12:00:00Z',
  q_link: 'https://example.edu/questionnaire',
  coach_link: 'https://example.edu/staff',
  grit_fit_labels: ['currently_recommended'],
  recruiting_journey_steps: [
    { step_id: 1,  label: 'Added to shortlist',                completed: true },
    { step_id: 2,  label: 'Completed recruiting questionnaire', completed: true },
    { step_id: 3,  label: 'Completed admissions info form',     completed: true },
    { step_id: 4,  label: 'Assistant coach contacted',          completed: false },
    { step_id: 5,  label: 'Contacted coach via email',          completed: false },
    { step_id: 6,  label: 'Contacted coach via social media',   completed: false },
    { step_id: 7,  label: 'Received junior day invite',         completed: false },
    { step_id: 8,  label: 'Tour / Visit Confirmed',             completed: false },
    { step_id: 9,  label: 'Received prospect camp invite',      completed: false },
    { step_id: 10, label: 'Coach contacted via text',           completed: false },
    { step_id: 11, label: 'Head coach contacted student',       completed: false },
    { step_id: 12, label: 'Admissions Pre-Read Requested',      completed: false },
    { step_id: 13, label: 'Financial Aid Pre-Read Submitted',   completed: false },
    { step_id: 14, label: 'Received verbal offer',              completed: false },
    { step_id: 15, label: 'Received written offer',             completed: false },
  ],
  coa: 72500,
  net_cost: 28400,
  droi: 3.7,
  break_even: 8.2,
  offer_status: null,
};

// Sprint 007 R5 — Email Coach button now targets the college head coach,
// not the HS head coach. Sprint 007 R4 — counselor + coach names added for
// {coachName} / {counselorName} token resolution.
const CONTACTS_BOTH = {
  hs_head_coach_email:        'hscoach@hs.org',          // deprecated post-R5; left here so the deprecated field is still represented in the test fixture
  hs_guidance_counselor_email:'counselor@school.org',
  hs_guidance_counselor_name: 'Mr. Jones',
  college_head_coach_email:   'headcoach@maroonstate.edu',
  college_head_coach_name:    'Coach Reynolds',
};

const STUDENT_PROFILE = {
  name: 'Alex Rivera',
  grad_year: 2027,
  position: 'WR',
  high_school: 'Bridgewater-Raynham',
};

function renderSlideOut(overrides = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    item: BASE_ITEM,
    userFirstName: 'Alex',
    userLastName: 'Rivera',
    contacts: CONTACTS_BOTH,
    studentProfile: STUDENT_PROFILE,
    files: [],
    ...overrides,
  };
  return { ...render(<ShortlistSlideOut {...props} />), props };
}

beforeEach(() => {
  setNarrow(false);
});

afterEach(() => {
  cleanup();
});

// ── a) Section 2: school name renders ─────────────────────────────────────
describe('S3 ShortlistSlideOut — Section 2 header', () => {
  it('a) renders the school name', () => {
    const { getByTestId } = renderSlideOut();
    expect(getByTestId('sso-school-name').textContent).toBe('Maroon State University');
  });

  it('b) renders the conference | division | miles subline', () => {
    const { getByTestId } = renderSlideOut();
    const subline = getByTestId('sso-subline').textContent;
    expect(subline).toContain('BIG SKY');
    expect(subline).toContain('FCS');
    expect(subline).toContain('420 MILES');
  });
});

// ── c) Section 3 context line ─────────────────────────────────────────────
describe('S3 ShortlistSlideOut — Section 3 context', () => {
  it('c) renders italic context with First Last', () => {
    const { getByTestId } = renderSlideOut();
    const el = getByTestId('sso-context-line');
    expect(el.textContent).toContain("Alex Rivera");
    expect(el.textContent.toLowerCase()).toContain('progress with this school');
    expect(el.style.fontStyle).toBe('italic');
  });
});

// ── d-f) Section 4 primary actions ────────────────────────────────────────
describe('S3 ShortlistSlideOut — Section 4 primary actions', () => {
  it('d) questionnaire button rendered with correct href', () => {
    const { getByTestId } = renderSlideOut();
    const btn = getByTestId('sso-btn-questionnaire');
    expect(btn.tagName).toBe('A');
    expect(btn.getAttribute('href')).toBe('https://example.edu/questionnaire');
    expect(btn.getAttribute('target')).toBe('_blank');
  });

  it('e) coaching-staff button rendered with correct href', () => {
    const { getByTestId } = renderSlideOut();
    const btn = getByTestId('sso-btn-coaching-staff');
    expect(btn.tagName).toBe('A');
    expect(btn.getAttribute('href')).toBe('https://example.edu/staff');
  });

  it('f) button disabled when link missing + title tooltip', () => {
    const { getByTestId } = renderSlideOut({ item: { ...BASE_ITEM, q_link: null } });
    const btn = getByTestId('sso-btn-questionnaire');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('title')).toBe('Link not available');
  });
});

// ── g-i) Section 5 offer chips ────────────────────────────────────────────
describe('S3 ShortlistSlideOut — Section 5 offer chips', () => {
  it('g) all three chips render with HF-4 labels (Verbal / Written / Commitment)', () => {
    // HF-4 — committable_offer chip slot was relabelled "Written Offer" and
    // its data source switched from the phantom offer_status column to
    // recruiting_journey_steps step_id 15. The chip key
    // (sso-offer-committable_offer) is preserved so existing test scaffolding
    // still resolves; only the label text changed.
    const { getByTestId } = renderSlideOut();
    expect(getByTestId('sso-offer-verbal_offer').textContent).toBe('Verbal Offer');
    expect(getByTestId('sso-offer-committable_offer').textContent).toBe('Written Offer');
    expect(getByTestId('sso-offer-commitment').textContent).toBe('Commitment');
  });

  it('h) chips are inactive when no journey steps are complete', () => {
    // HF-4 — chips now read recruiting_journey_steps step 14 / 15 instead of
    // the phantom offer_status column. With BASE_ITEM's default empty steps,
    // all three chips render inactive.
    const { getByTestId } = renderSlideOut();
    expect(getByTestId('sso-offer-verbal_offer').getAttribute('data-active')).toBe('false');
    expect(getByTestId('sso-offer-committable_offer').getAttribute('data-active')).toBe('false');
    expect(getByTestId('sso-offer-commitment').getAttribute('data-active')).toBe('false');
  });

  it('i) Verbal Offer chip activates when recruiting_journey_steps step 14 is complete', () => {
    // HF-4 — verbal activation source switched from offer_status array to
    // step_id 14 ("Received verbal offer") on the JSONB. The chip's DOM key
    // (sso-offer-verbal_offer) is unchanged — only the underlying read changed.
    const { getByTestId } = renderSlideOut({
      item: {
        ...BASE_ITEM,
        recruiting_journey_steps: [{ step_id: 14, completed: true }],
      },
    });
    expect(getByTestId('sso-offer-verbal_offer').getAttribute('data-active')).toBe('true');
    expect(getByTestId('sso-offer-committable_offer').getAttribute('data-active')).toBe('false');
  });

  it('i2) Written Offer chip activates when recruiting_journey_steps step 15 is complete', () => {
    // HF-4 — parallel wiring on step 15. Locks both halves of the rewire.
    const { getByTestId } = renderSlideOut({
      item: {
        ...BASE_ITEM,
        recruiting_journey_steps: [{ step_id: 15, completed: true }],
      },
    });
    expect(getByTestId('sso-offer-verbal_offer').getAttribute('data-active')).toBe('false');
    expect(getByTestId('sso-offer-committable_offer').getAttribute('data-active')).toBe('true');
  });
});

// ── j-l) Section 6 StatusPills ────────────────────────────────────────────
describe('S3 ShortlistSlideOut — Section 6 status pills', () => {
  it('j) renders one pill per grit_fit_labels key', () => {
    const { getAllByTestId } = renderSlideOut({
      item: { ...BASE_ITEM, grit_fit_labels: ['currently_recommended', 'outside_geographic_reach'] },
    });
    const pills = getAllByTestId('status-pill');
    expect(pills.length).toBe(2);
  });

  it('k) single-label case renders one pill', () => {
    const { getAllByTestId } = renderSlideOut();
    const pills = getAllByTestId('status-pill');
    expect(pills.length).toBe(1);
    expect(pills[0].getAttribute('data-status')).toBe('currently_recommended');
  });

  it('l) not_evaluated regression guard — passes no pill through', () => {
    const { queryAllByTestId } = renderSlideOut({
      item: { ...BASE_ITEM, grit_fit_labels: ['not_evaluated'] },
    });
    const pills = queryAllByTestId('status-pill');
    expect(pills.length).toBe(0);
  });
});

// ── m-p) Section 7 financial strip ────────────────────────────────────────
describe('S3 ShortlistSlideOut — Section 7 financial strip', () => {
  it('m) COA renders with currency format', () => {
    const { getByTestId } = renderSlideOut();
    expect(getByTestId('sso-metric-coa-value').textContent).toBe('$72,500');
  });

  it('n) net cost renders with currency format', () => {
    const { getByTestId } = renderSlideOut();
    expect(getByTestId('sso-metric-net-cost-value').textContent).toBe('$28,400');
  });

  it('o) DROI renders as ratio', () => {
    const { getByTestId } = renderSlideOut();
    expect(getByTestId('sso-metric-droi-value').textContent).toBe('3.7x');
  });

  it('p) fastest payback renders as years (falls back to break_even)', () => {
    const { getByTestId } = renderSlideOut();
    expect(getByTestId('sso-metric-payback-value').textContent).toBe('8.2 yrs');
  });
});

// ── q-r) Section 8 journey progress ───────────────────────────────────────
describe('S3 ShortlistSlideOut — Section 8 journey progress', () => {
  it('q) progress bar reflects completed count (3 of 15)', () => {
    const { getByTestId } = renderSlideOut();
    expect(getByTestId('sso-journey-count').textContent).toBe('3 of 15 steps completed');
    const fill = getByTestId('sso-journey-progress-fill');
    // 3/15 = 20%
    expect(fill.style.width).toBe('20%');
    const bar = getByTestId('sso-journey-progress');
    expect(bar.getAttribute('aria-valuenow')).toBe('3');
    expect(bar.getAttribute('aria-valuemax')).toBe('15');
  });

  it('r) collapse toggle hides and re-shows the body', () => {
    const { getByTestId, queryByTestId } = renderSlideOut();
    expect(getByTestId('sso-journey-body')).toBeTruthy();
    fireEvent.click(getByTestId('collapsible-title-strip'));
    expect(queryByTestId('sso-journey-body')).toBeNull();
    fireEvent.click(getByTestId('collapsible-title-strip'));
    expect(queryByTestId('sso-journey-body')).toBeTruthy();
  });
});

// ── s-aa) Section 9 Pre-Read documents ────────────────────────────────────
describe('S3 ShortlistSlideOut — Section 9 Pre-Read documents', () => {
  it('s) renders one row per expected doc type (7)', () => {
    const { getAllByTestId } = renderSlideOut();
    // doc-row ids sso-doc-row-<key> — use a regex-ish approach via individual gets
    const expectedKeys = [
      'transcript', 'senior_course_list', 'writing_example', 'student_resume',
      'school_profile_pdf', 'sat_act_scores', 'financial_aid_info',
    ];
    for (const key of expectedKeys) {
      expect(getAllByTestId(`sso-doc-row-${key}`).length).toBe(1);
    }
  });

  it('t) SUBMITTED pill when a file exists for that doc_type', () => {
    const { getByTestId } = renderSlideOut({
      files: [{ document_type: 'transcript', id: 'f1' }],
    });
    expect(getByTestId('sso-doc-status-transcript').getAttribute('data-submitted')).toBe('true');
    expect(getByTestId('sso-doc-status-transcript').textContent).toBe('SUBMITTED');
    expect(getByTestId('sso-doc-status-student_resume').getAttribute('data-submitted')).toBe('false');
    expect(getByTestId('sso-doc-status-student_resume').textContent).toBe('NOT SUBMITTED');
  });

  it('u) narrow viewport: coach button shows "Email Coach"', () => {
    setNarrow(true);
    const { getByTestId } = renderSlideOut();
    expect(getByTestId('sso-doc-email-coach-transcript').textContent).toBe('Email Coach');
  });

  it('v) wide viewport: coach button shows "Email (Head) Coach"', () => {
    setNarrow(false);
    const { getByTestId } = renderSlideOut();
    expect(getByTestId('sso-doc-email-coach-transcript').textContent).toBe('Email (Head) Coach');
  });

  it('w) coach aria-label stays "Email Head Coach" at both viewports', () => {
    setNarrow(true);
    const { getByTestId, rerender } = renderSlideOut();
    expect(getByTestId('sso-doc-email-coach-transcript').getAttribute('aria-label')).toBe('Email Head Coach');
    setNarrow(false);
    rerender(
      <ShortlistSlideOut
        isOpen
        onClose={() => {}}
        item={BASE_ITEM}
        userFirstName="Alex"
        userLastName="Rivera"
        contacts={CONTACTS_BOTH}
        studentProfile={STUDENT_PROFILE}
        files={[]}
      />,
    );
    expect(getByTestId('sso-doc-email-coach-transcript').getAttribute('aria-label')).toBe('Email Head Coach');
  });

  it('x) counselor aria-label = "Email Guidance Counselor"', () => {
    const { getByTestId } = renderSlideOut();
    expect(getByTestId('sso-doc-email-counselor-transcript').getAttribute('aria-label'))
      .toBe('Email Guidance Counselor');
  });

  it('y) mailto href contains the college head coach email + encoded subject + body (Sprint 007 R5 redirect)', () => {
    const { getByTestId } = renderSlideOut();
    const href = getByTestId('sso-doc-email-coach-transcript').getAttribute('href');
    // R5: button targets college_head_coach_email, NOT hs_head_coach_email
    expect(href).toMatch(/^mailto:headcoach@maroonstate\.edu\?/);
    expect(href).toContain('subject=');
    expect(href).toContain('body=');
    // school name encoded
    expect(href).toContain(encodeURIComponent('Maroon State University'));
    // document type encoded
    expect(href).toContain(encodeURIComponent('Transcript'));
    // student name encoded in body
    expect(href).toContain(encodeURIComponent('Alex Rivera'));
    // R4: coach name resolved into greeting
    expect(href).toContain(encodeURIComponent('Coach Reynolds'));
    // R4: subject uses colon separator (not em-dash)
    expect(href).toContain(encodeURIComponent('Maroon State University pre-read: Transcript'));
  });

  it('z) Sprint 007 R5 — no head coach record — button disabled + "No head coach on file" tooltip', () => {
    const { getByTestId } = renderSlideOut({
      contacts: {
        ...CONTACTS_BOTH,
        college_head_coach_email: null,
        college_head_coach_name:  null, // null name === no record found
      },
    });
    const btn = getByTestId('sso-doc-email-coach-transcript');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('title')).toContain('No head coach on file');
    expect(btn.getAttribute('title')).toContain('Maroon State University');
  });

  it('z2) Sprint 007 R5 — head coach record but no email — button disabled + record-exists tooltip', () => {
    const { getByTestId } = renderSlideOut({
      contacts: {
        ...CONTACTS_BOTH,
        college_head_coach_email: null,
        college_head_coach_name:  'Coach Reynolds', // record exists, email missing
      },
    });
    const btn = getByTestId('sso-doc-email-coach-transcript');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('title')).toContain('Head coach record on file');
    expect(btn.getAttribute('title')).toContain('has no email');
  });

  it('aa) missing counselor email — button disabled + tooltip', () => {
    const { getByTestId } = renderSlideOut({
      contacts: { ...CONTACTS_BOTH, hs_guidance_counselor_email: null },
    });
    const btn = getByTestId('sso-doc-email-counselor-transcript');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('title')).toBe('No counselor email on file — add to your Student Profile');
  });

  it('ab) Sprint 007 R4 — counselor template uses {counselorName} fallback "Hello" when name missing', () => {
    const { getByTestId } = renderSlideOut({
      contacts: { ...CONTACTS_BOTH, hs_guidance_counselor_name: null },
    });
    const href = getByTestId('sso-doc-email-counselor-transcript').getAttribute('href');
    // No name → greeting falls back to "Hello,"
    expect(href).toContain(encodeURIComponent('Hello,'));
  });
});

// ── bb-dd) Shell integration ──────────────────────────────────────────────
describe('S3 ShortlistSlideOut — SlideOutShell integration', () => {
  it('bb) close X button dismisses', () => {
    const onClose = vi.fn();
    const { getByTestId } = renderSlideOut({ onClose });
    fireEvent.click(getByTestId('slide-out-shell-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cc) Escape key dismisses', () => {
    const onClose = vi.fn();
    renderSlideOut({ onClose });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dd) backdrop click dismisses', () => {
    const onClose = vi.fn();
    const { getByTestId } = renderSlideOut({ onClose });
    fireEvent.click(getByTestId('slide-out-shell-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── ee-ff) Viewport rendering choices ─────────────────────────────────────
describe('S3 ShortlistSlideOut — viewport rendering choices', () => {
  it('ee) narrow (375px-equivalent): financial strip uses 2-col grid', () => {
    setNarrow(true);
    const { getByTestId } = renderSlideOut();
    const strip = getByTestId('sso-financial-strip');
    expect(strip.style.gridTemplateColumns).toBe('1fr 1fr');
  });

  it('ff) wide (1440px-equivalent): financial strip uses 4-col grid', () => {
    setNarrow(false);
    const { getByTestId } = renderSlideOut();
    const strip = getByTestId('sso-financial-strip');
    // computed grid-template-columns style is "repeat(4, 1fr)" as authored
    expect(strip.style.gridTemplateColumns).toBe('repeat(4, 1fr)');
  });
});
