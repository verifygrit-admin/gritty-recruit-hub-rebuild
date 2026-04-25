/**
 * school-details-card.test.jsx — Sprint 004 Wave 1 SC-4
 *
 * Covers <SchoolDetailsCard> — the read-only content component rendered
 * inside SC-3 <SlideOutShell> for both G5 (map marker click) and G7b (mobile
 * table row tap).
 *
 * Assertions:
 *   a) Renders school name
 *   b) Renders division (type) and conference
 *   c) Renders distance when dist is provided
 *   d) Renders <StatusPill> when statusKey is valid
 *   e) Does NOT render <StatusPill> when statusKey is null
 *   f) Does NOT render <StatusPill> for retired 'not_evaluated' key
 *   g) Does not crash when optional fields are missing
 *   h) Two distinct fixture schools render distinctly (sanity)
 *
 * Vitest runs in node env without jsdom / RTL — following the pattern
 * established by tests/unit/status-pill.test.js, the component is invoked
 * directly as a function and the returned React element tree is traversed
 * for assertions. A small helper `findBy` walks children recursively.
 *
 * Run: npm test -- school-details-card
 */

import { describe, it, expect } from 'vitest';
import SchoolDetailsCard from '../../src/components/SchoolDetailsCard.jsx';
import StatusPill from '../../src/components/StatusPill.jsx';

// ── helpers ──────────────────────────────────────────────────────────────

// Invoke the functional component and return the root React element.
function renderCard(props) {
  return SchoolDetailsCard(props);
}

// Recursively walk the React element tree and collect all nodes matching a
// predicate. Handles arrays of children, single children, and primitive text
// leaves.
function collect(el, predicate, acc = []) {
  if (el == null || typeof el !== 'object') return acc;
  if (predicate(el)) acc.push(el);
  const children = el.props && el.props.children;
  if (children == null) return acc;
  if (Array.isArray(children)) {
    for (const child of children) collect(child, predicate, acc);
  } else {
    collect(children, predicate, acc);
  }
  return acc;
}

// Find the first element whose props['data-testid'] matches.
function findByTestId(el, testId) {
  const matches = collect(el, (n) => n.props && n.props['data-testid'] === testId);
  return matches[0] || null;
}

// Extract the primitive text content of an element (concatenates string /
// number children; ignores element children).
function textOf(el) {
  if (el == null) return '';
  const c = el.props && el.props.children;
  if (c == null) return '';
  if (typeof c === 'string' || typeof c === 'number') return String(c);
  if (Array.isArray(c)) {
    return c
      .map((ch) => (typeof ch === 'string' || typeof ch === 'number' ? String(ch) : ''))
      .join('');
  }
  return '';
}

// Return true if the element tree contains a <StatusPill> component. Since
// SchoolDetailsCard renders <StatusPill /> as a child, the element's `.type`
// is the StatusPill function reference.
function hasStatusPill(el) {
  const hits = collect(el, (n) => n.type === StatusPill);
  return hits.length > 0;
}

// ── fixtures ─────────────────────────────────────────────────────────────

const FIXTURE_A = {
  unitid: 166027,
  school_name: 'Harvard University',
  conference: 'Ivy League',
  type: 'FCS',
  city: 'Cambridge',
  state: 'MA',
  dist: 131,
  school_type: 'Most Selective',
  adltv: 1850000,
  adltv_rank: 3,
  admissions_rate: 0.04,
  graduation_rate: 0.98,
  matchRank: 7,
};

const FIXTURE_B = {
  unitid: 201645,
  school_name: 'Colorado School of Mines',
  conference: 'RMAC',
  type: 'D2',
  city: 'Golden',
  state: 'CO',
  dist: 1850,
  school_type: 'More Selective',
  adltv: 1240000,
  adltv_rank: 47,
  admissions_rate: 0.53,
  graduation_rate: 0.81,
  matchRank: 22,
};

// ── a) renders school name ────────────────────────────────────────────────

describe('SchoolDetailsCard — school name', () => {
  it('renders the school name', () => {
    const el = renderCard({ school: FIXTURE_A });
    const nameEl = findByTestId(el, 'sdc-school-name');
    expect(nameEl).not.toBeNull();
    expect(textOf(nameEl)).toBe('Harvard University');
  });
});

// ── b) renders division and conference ───────────────────────────────────

describe('SchoolDetailsCard — division + conference meta', () => {
  it('renders division and conference in the meta line', () => {
    const el = renderCard({ school: FIXTURE_A });
    const metaEl = findByTestId(el, 'sdc-school-meta');
    expect(metaEl).not.toBeNull();
    const t = textOf(metaEl);
    expect(t).toContain('FCS');
    expect(t).toContain('Ivy League');
  });

  it('renders only what is provided when conference is missing', () => {
    const el = renderCard({ school: { ...FIXTURE_A, conference: null } });
    const metaEl = findByTestId(el, 'sdc-school-meta');
    expect(metaEl).not.toBeNull();
    expect(textOf(metaEl)).toBe('FCS');
  });
});

// ── c) renders distance when dist is provided ────────────────────────────

describe('SchoolDetailsCard — distance', () => {
  it('renders distance in miles when dist is provided', () => {
    const el = renderCard({ school: FIXTURE_A });
    const distEl = findByTestId(el, 'sdc-distance');
    expect(distEl).not.toBeNull();
    expect(textOf(distEl)).toBe('131 miles');
  });

  it('does not render a distance row when dist is missing', () => {
    const el = renderCard({ school: { ...FIXTURE_A, dist: null } });
    const distEl = findByTestId(el, 'sdc-distance');
    expect(distEl).toBeNull();
  });
});

// ── d) renders StatusPill when statusKey is valid ────────────────────────

describe('SchoolDetailsCard — status pill (valid key)', () => {
  it('renders a <StatusPill> when statusKey is a valid key', () => {
    const el = renderCard({ school: FIXTURE_A, statusKey: 'currently_recommended' });
    expect(hasStatusPill(el)).toBe(true);
    // Status slot wrapper is also present (geometry guard).
    expect(findByTestId(el, 'sdc-status-slot')).not.toBeNull();
  });

  it('passes the statusKey straight through to <StatusPill>', () => {
    const el = renderCard({ school: FIXTURE_A, statusKey: 'academic_stretch_is_invalid_but_pill_guards' });
    // Even for an unknown key the wrapper renders (we gate on truthy, not on
    // config lookup) — but the pill itself renders null inside. This keeps
    // SC-4's behavior predictable and moves the "is this a real status" call
    // into one place (SC-2).
    const pill = collect(el, (n) => n.type === StatusPill)[0];
    expect(pill).toBeDefined();
    expect(pill.props.status).toBe('academic_stretch_is_invalid_but_pill_guards');
  });
});

// ── e) does NOT render StatusPill when statusKey is null ─────────────────

describe('SchoolDetailsCard — status pill (null)', () => {
  it('does not render a <StatusPill> when statusKey is null', () => {
    const el = renderCard({ school: FIXTURE_A, statusKey: null });
    expect(hasStatusPill(el)).toBe(false);
    expect(findByTestId(el, 'sdc-status-slot')).toBeNull();
  });

  it('does not render a <StatusPill> when statusKey is undefined', () => {
    const el = renderCard({ school: FIXTURE_A });
    expect(hasStatusPill(el)).toBe(false);
    expect(findByTestId(el, 'sdc-status-slot')).toBeNull();
  });

  it('does not render a <StatusPill> when statusKey is the empty string', () => {
    const el = renderCard({ school: FIXTURE_A, statusKey: '' });
    expect(hasStatusPill(el)).toBe(false);
  });
});

// ── f) regression guard — does NOT render for 'not_evaluated' ────────────

describe('SchoolDetailsCard — not_evaluated regression guard', () => {
  it('does not render any pill content for the retired "not_evaluated" key', () => {
    // SC-4 still emits the wrapper (because the key is truthy), but the pill
    // itself must render null per SC-2 A-2. Verify no DOM-visible pill output
    // makes it into the tree.
    const el = renderCard({ school: FIXTURE_A, statusKey: 'not_evaluated' });
    const pills = collect(el, (n) => n.type === StatusPill);
    expect(pills).toHaveLength(1);
    // The functional component, invoked, returns null for this key.
    expect(pills[0].type({ status: 'not_evaluated' })).toBeNull();
  });
});

// ── g) tolerates missing optional fields ─────────────────────────────────

describe('SchoolDetailsCard — missing optional fields', () => {
  it('does not crash when adltv, adltv_rank, admissions_rate, graduation_rate are all missing', () => {
    const sparse = {
      unitid: 999999,
      school_name: 'Sparse University',
      type: 'D3',
      conference: 'NESCAC',
      city: 'Nowhere',
      state: 'VT',
      dist: 50,
    };
    expect(() => renderCard({ school: sparse })).not.toThrow();
    const el = renderCard({ school: sparse });
    const metrics = findByTestId(el, 'sdc-metrics');
    expect(metrics).not.toBeNull();
  });

  it('does not crash when school record is almost empty', () => {
    expect(() => renderCard({ school: { unitid: 1, school_name: 'Bare' } }))
      .not.toThrow();
  });

  it('returns null when school prop is missing', () => {
    expect(renderCard({ school: null })).toBeNull();
    expect(renderCard({})).toBeNull();
  });

  it('does not render a match-rank line when matchRank is absent', () => {
    const el = renderCard({ school: { ...FIXTURE_A, matchRank: null } });
    expect(findByTestId(el, 'sdc-match-rank')).toBeNull();
  });
});

// ── Sprint 005 D3a — multi-badge display ─────────────────────────────────

describe('SchoolDetailsCard — multi-badge display (Sprint 005 D3a)', () => {
  it('renders all badges when statusKeys array is provided', () => {
    const el = renderCard({
      school: FIXTURE_A,
      statusKeys: ['currently_recommended', 'below_athletic_fit', 'out_of_academic_reach'],
    });
    const pills = collect(el, (n) => n.type === StatusPill);
    expect(pills).toHaveLength(3);
    const statuses = pills.map(p => p.props.status);
    expect(statuses).toContain('currently_recommended');
    expect(statuses).toContain('below_athletic_fit');
    expect(statuses).toContain('out_of_academic_reach');
  });

  it('renders all six Fit Categories without overflow when supplied', () => {
    const el = renderCard({
      school: FIXTURE_A,
      statusKeys: [
        'currently_recommended',
        'out_of_academic_reach',
        'out_of_athletic_reach',
        'below_academic_fit',
        'below_athletic_fit',
        'outside_geographic_reach',
      ],
    });
    const pills = collect(el, (n) => n.type === StatusPill);
    expect(pills).toHaveLength(6);
    // Wrapper must use flex-wrap so the six pills can flow onto multiple
    // rows on narrow viewports without overflow.
    const slot = findByTestId(el, 'sdc-status-slot');
    expect(slot).not.toBeNull();
    expect(slot.props.style.display).toBe('flex');
    expect(slot.props.style.flexWrap).toBe('wrap');
  });

  it('preserves the order supplied in statusKeys', () => {
    const order = ['below_athletic_fit', 'currently_recommended', 'outside_geographic_reach'];
    const el = renderCard({ school: FIXTURE_A, statusKeys: order });
    const pills = collect(el, (n) => n.type === StatusPill);
    expect(pills.map(p => p.props.status)).toEqual(order);
  });

  it('treats statusKeys as the source of truth when both statusKey and statusKeys are passed', () => {
    const el = renderCard({
      school: FIXTURE_A,
      statusKey: 'currently_recommended',
      statusKeys: ['below_academic_fit', 'outside_geographic_reach'],
    });
    const pills = collect(el, (n) => n.type === StatusPill);
    expect(pills).toHaveLength(2);
    expect(pills.map(p => p.props.status)).toEqual([
      'below_academic_fit',
      'outside_geographic_reach',
    ]);
  });

  it('renders no pill slot when statusKeys is empty', () => {
    const el = renderCard({ school: FIXTURE_A, statusKeys: [] });
    expect(findByTestId(el, 'sdc-status-slot')).toBeNull();
    expect(collect(el, (n) => n.type === StatusPill)).toHaveLength(0);
  });

  it('falls back to legacy statusKey path for backward compat', () => {
    const el = renderCard({ school: FIXTURE_A, statusKey: 'currently_recommended' });
    const pills = collect(el, (n) => n.type === StatusPill);
    expect(pills).toHaveLength(1);
    expect(pills[0].props.status).toBe('currently_recommended');
  });
});

// ── h) two fixture schools render distinctly ─────────────────────────────

describe('SchoolDetailsCard — fixture distinctness', () => {
  it('renders fixture A and fixture B with distinct names and divisions', () => {
    const elA = renderCard({ school: FIXTURE_A });
    const elB = renderCard({ school: FIXTURE_B });

    expect(textOf(findByTestId(elA, 'sdc-school-name'))).toBe('Harvard University');
    expect(textOf(findByTestId(elB, 'sdc-school-name'))).toBe('Colorado School of Mines');

    const metaA = textOf(findByTestId(elA, 'sdc-school-meta'));
    const metaB = textOf(findByTestId(elB, 'sdc-school-meta'));
    expect(metaA).not.toBe(metaB);
    expect(metaA).toContain('FCS');
    expect(metaB).toContain('D2');

    // Distance values differ.
    expect(textOf(findByTestId(elA, 'sdc-distance'))).toBe('131 miles');
    expect(textOf(findByTestId(elB, 'sdc-distance'))).toBe('1850 miles');

    // testid uses unitid — must differ between the two renders.
    expect(elA.props['data-testid']).toBe('school-details-card-166027');
    expect(elB.props['data-testid']).toBe('school-details-card-201645');
  });
});
