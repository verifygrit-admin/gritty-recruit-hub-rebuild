/**
 * @vitest-environment jsdom
 *
 * sprint-005-track-c.test.jsx — Sprint 005 Track C (YOUR SHORTLIST)
 *
 * Covers:
 *   D4 — Alternating row backgrounds on the Shortlist Main View use the
 *        Grit Fit Table View tokens (#F5EFE0 odd / #FFFFFF even).
 *   D5 — Dynamic ranking column updates ranks across all six sort modes
 *        (Name, Date Added, Distance, Degree ROI, Annual Net Cost,
 *        Fastest Payback) and across shortlist composition changes
 *        (add / remove). Stable secondary tie-break by name ASC across
 *        all six modes — including Date Added.
 *   D6 — Recruiting Journey Progress section renders the 15-step task list
 *        beneath the progress bar when expanded; collapsing hides it.
 *
 * D7 (animation envelope) is exercised by tests/unit/slide-out-shell.test.jsx
 * via the existing isOpen visibility tests; the additional animation/reduced-
 * motion behavior is covered as smoke at the end of this file.
 */

import React, { useMemo, useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';

// Mock useIsNarrowViewport so Track C tests don't depend on jsdom layout.
vi.mock('../../src/hooks/useIsNarrowViewport.js', () => ({
  default: () => false,
}));

import ShortlistRow from '../../src/components/ShortlistRow.jsx';
import ShortlistFilters from '../../src/components/ShortlistFilters.jsx';
import ShortlistSlideOut from '../../src/components/ShortlistSlideOut.jsx';
import SlideOutShell from '../../src/components/SlideOutShell.jsx';

afterEach(() => {
  cleanup();
});

// ── Fixtures ───────────────────────────────────────────────────────────────

// Two-school pair sharing every sort metric used by D5. Used to verify the
// stable secondary tie-break by name ASC across all six sort modes.
const TIE_PAIR = [
  {
    id: 't1',
    unitid: 9001,
    school_name: 'Beta College',
    div: 'D3',
    conference: 'NESCAC',
    grit_fit_labels: [],
    added_at: '2026-02-01T12:00:00Z',
    dist: 100,
    droi: 3.0,
    net_cost: 25000,
    break_even: 5.0,
  },
  {
    id: 't2',
    unitid: 9002,
    school_name: 'Alpha College', // alphabetically first
    div: 'D3',
    conference: 'NESCAC',
    grit_fit_labels: [],
    added_at: '2026-02-01T12:00:00Z', // same date as Beta
    dist: 100,                        // same distance as Beta
    droi: 3.0,                        // same droi as Beta
    net_cost: 25000,                  // same net_cost
    break_even: 5.0,                  // same payback
  },
];

const MIXED_FIVE = [
  {
    id: 'm1', unitid: 1001, school_name: 'Carter U', div: 'D2', conference: 'MIAA',
    grit_fit_labels: [], added_at: '2026-01-10T12:00:00Z', dist: 50, droi: 4.0,
    net_cost: 30000, break_even: 8.0,
  },
  {
    id: 'm2', unitid: 1002, school_name: 'Aurora State', div: 'D3', conference: 'NESCAC',
    grit_fit_labels: [], added_at: '2026-03-01T12:00:00Z', dist: 200, droi: 2.5,
    net_cost: 18000, break_even: 12.0,
  },
  {
    id: 'm3', unitid: 1003, school_name: 'Brookside Tech', div: 'FCS', conference: 'Big Sky',
    grit_fit_labels: [], added_at: '2026-02-15T12:00:00Z', dist: 800, droi: 5.5,
    net_cost: 22000, break_even: 4.5,
  },
];

// Mirrors the ShortlistPage sortedItems memo (with D5 stable name tie-break).
function applySort(items, sortBy) {
  const arr = [...items];
  const byName = (a, b) => (a.school_name || '').localeCompare(b.school_name || '');
  const tb = (cmp) => (a, b) => (cmp(a, b) !== 0 ? cmp(a, b) : byName(a, b));
  switch (sortBy) {
    case 'name_asc': arr.sort(byName); break;
    case 'added_newest': arr.sort(tb((a, b) => new Date(b.added_at) - new Date(a.added_at))); break;
    case 'dist_asc': arr.sort(tb((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))); break;
    case 'droi_desc': arr.sort(tb((a, b) => (b.droi ?? -Infinity) - (a.droi ?? -Infinity))); break;
    case 'net_cost_asc': arr.sort(tb((a, b) => (a.net_cost ?? Infinity) - (b.net_cost ?? Infinity))); break;
    case 'payback_asc': arr.sort(tb((a, b) => (a.break_even ?? Infinity) - (b.break_even ?? Infinity))); break;
    default: arr.sort(byName);
  }
  return arr;
}

function Harness({ items = MIXED_FIVE, initialSort = 'name_asc' }) {
  const [sortBy, setSortBy] = useState(initialSort);
  const [allItems, setAllItems] = useState(items);

  const sortedItems = useMemo(() => applySort(allItems, sortBy), [allItems, sortBy]);

  return (
    <div>
      <ShortlistFilters
        items={allItems}
        filters={{ status: '', division: '', conference: '' }}
        sortBy={sortBy}
        onFilterChange={() => {}}
        onSortChange={setSortBy}
        filteredCount={sortedItems.length}
        totalCount={allItems.length}
      />
      {/* Test hooks — let tests programmatically drive composition changes */}
      <button
        data-testid="harness-add"
        onClick={() => setAllItems((prev) => [
          ...prev,
          {
            id: 'added-1', unitid: 1099, school_name: 'Zenith College', div: 'D3',
            conference: 'NESCAC', grit_fit_labels: [], added_at: '2026-04-01T12:00:00Z',
            dist: 10, droi: 6.5, net_cost: 12000, break_even: 2.0,
          },
        ])}
      >
        add
      </button>
      <button
        data-testid="harness-remove-first"
        onClick={() => setAllItems((prev) => prev.slice(1))}
      >
        remove
      </button>
      <div data-testid="rows">
        {sortedItems.map((item, idx) => (
          <ShortlistRow
            key={item.id}
            item={item}
            rank={idx + 1}
            index={idx}
            onClick={() => {}}
          />
        ))}
      </div>
    </div>
  );
}

function getRankTexts(container) {
  return Array.from(container.querySelectorAll('[data-testid="row-rank-text"]'))
    .map((el) => el.textContent);
}

function getRowSchoolNames(container) {
  return Array.from(container.querySelectorAll('[data-testid^="shortlist-row-"]'))
    .map((row) => row.querySelector('[data-testid="row-school-name"]').textContent);
}

// ── D4 — Alternating row backgrounds ──────────────────────────────────────

describe('Sprint 005 D4 — alternating row backgrounds (Grit Fit Table tokens)', () => {
  it('odd-index rows use #F5EFE0; even-index rows use #FFFFFF', () => {
    const { container } = render(<Harness />);
    const rows = Array.from(container.querySelectorAll('[data-testid^="shortlist-row-"]'));
    expect(rows.length).toBe(MIXED_FIVE.length);
    rows.forEach((row, idx) => {
      const expected = idx % 2 === 1 ? 'rgb(245, 239, 224)' : 'rgb(255, 255, 255)';
      expect(row.style.backgroundColor).toBe(expected);
    });
  });

  it('row-parity data attribute is "odd" for index 1, "even" for index 0', () => {
    const { container } = render(<Harness />);
    const rows = Array.from(container.querySelectorAll('[data-testid^="shortlist-row-"]'));
    expect(rows[0].getAttribute('data-row-parity')).toBe('even');
    expect(rows[1].getAttribute('data-row-parity')).toBe('odd');
    expect(rows[2].getAttribute('data-row-parity')).toBe('even');
  });

  it('alternating tokens reuse the Grit Fit Table border value (#E8E8E8)', () => {
    const { container } = render(<Harness />);
    const row = container.querySelector('[data-testid^="shortlist-row-"]');
    // The borderBottom is built as "1px solid #E8E8E8"; jsdom serializes
    // that to lowercase `rgb(232, 232, 232)`.
    expect(row.style.borderBottomColor).toBe('rgb(232, 232, 232)');
    expect(row.style.borderBottomStyle).toBe('solid');
  });
});

// ── D5 — Dynamic ranking column ───────────────────────────────────────────

describe('Sprint 005 D5 — dynamic ranking column across all six sort modes', () => {
  // baseline (name_asc): Aurora, Brookside, Carter
  it('name_asc: ranks reflect alphabetical order', () => {
    const { container } = render(<Harness initialSort="name_asc" />);
    expect(getRowSchoolNames(container)).toEqual([
      'Aurora State', 'Brookside Tech', 'Carter U',
    ]);
    expect(getRankTexts(container)).toEqual(['1', '2', '3']);
  });

  it('added_newest: ranks reflect newest-first chronological order', () => {
    const { container, getByTestId } = render(<Harness />);
    fireEvent.change(getByTestId('sort-by'), { target: { value: 'added_newest' } });
    expect(getRowSchoolNames(container)).toEqual([
      'Aurora State', 'Brookside Tech', 'Carter U',
    ]);
    expect(getRankTexts(container)).toEqual(['1', '2', '3']);
  });

  it('dist_asc: ranks reflect closest-first', () => {
    const { container, getByTestId } = render(<Harness />);
    fireEvent.change(getByTestId('sort-by'), { target: { value: 'dist_asc' } });
    expect(getRowSchoolNames(container)[0]).toBe('Carter U'); // 50 mi
    expect(getRankTexts(container)).toEqual(['1', '2', '3']);
  });

  it('droi_desc: ranks reflect highest-DROI-first', () => {
    const { container, getByTestId } = render(<Harness />);
    fireEvent.change(getByTestId('sort-by'), { target: { value: 'droi_desc' } });
    expect(getRowSchoolNames(container)[0]).toBe('Brookside Tech'); // 5.5
    expect(getRankTexts(container)).toEqual(['1', '2', '3']);
  });

  it('net_cost_asc: ranks reflect lowest-cost-first', () => {
    const { container, getByTestId } = render(<Harness />);
    fireEvent.change(getByTestId('sort-by'), { target: { value: 'net_cost_asc' } });
    expect(getRowSchoolNames(container)[0]).toBe('Aurora State'); // $18k
    expect(getRankTexts(container)).toEqual(['1', '2', '3']);
  });

  it('payback_asc: ranks reflect fastest-payback-first', () => {
    const { container, getByTestId } = render(<Harness />);
    fireEvent.change(getByTestId('sort-by'), { target: { value: 'payback_asc' } });
    expect(getRowSchoolNames(container)[0]).toBe('Brookside Tech'); // 4.5 yr
    expect(getRankTexts(container)).toEqual(['1', '2', '3']);
  });

  it('switching sort selector re-numbers ranks (sequence: name -> dist -> cost)', () => {
    const { container, getByTestId } = render(<Harness />);
    expect(getRankTexts(container)).toEqual(['1', '2', '3']);

    fireEvent.change(getByTestId('sort-by'), { target: { value: 'dist_asc' } });
    expect(getRowSchoolNames(container)).toEqual([
      'Carter U', 'Aurora State', 'Brookside Tech',
    ]);

    fireEvent.change(getByTestId('sort-by'), { target: { value: 'net_cost_asc' } });
    expect(getRowSchoolNames(container)).toEqual([
      'Aurora State', 'Brookside Tech', 'Carter U',
    ]);
    // Ranks always 1, 2, 3 against current order (recompute).
    expect(getRankTexts(container)).toEqual(['1', '2', '3']);
  });

  it('composition change (add school) re-numbers ranks', () => {
    const { container, getByTestId } = render(<Harness />);
    expect(getRankTexts(container)).toEqual(['1', '2', '3']);
    fireEvent.click(getByTestId('harness-add'));
    expect(getRankTexts(container)).toEqual(['1', '2', '3', '4']);
  });

  it('composition change (remove school) re-numbers ranks', () => {
    const { container, getByTestId } = render(<Harness />);
    fireEvent.click(getByTestId('harness-remove-first'));
    expect(getRankTexts(container)).toEqual(['1', '2']);
  });

  describe('stable secondary tie-break by name ASC across all six sort modes', () => {
    // TIE_PAIR shares every metric. Expectation: Alpha College ranks 1
    // (alphabetical first) in every sort mode, including Date Added — per
    // operator decision (do NOT tie-break by timestamp precision).
    const ALL_SORTS = [
      'name_asc',
      'added_newest',
      'dist_asc',
      'droi_desc',
      'net_cost_asc',
      'payback_asc',
    ];
    ALL_SORTS.forEach((mode) => {
      it(`${mode}: Alpha College outranks Beta College on equal metrics`, () => {
        const sorted = applySort(TIE_PAIR, mode);
        expect(sorted[0].school_name).toBe('Alpha College');
        expect(sorted[1].school_name).toBe('Beta College');
      });
    });
  });
});

// ── D6 — 15-step task list under the progress bar ─────────────────────────

const FIFTEEN_STEPS = Array.from({ length: 15 }, (_, i) => ({
  step_id: i + 1,
  label: `Step ${i + 1} label`,
  completed: i < 4, // first 4 complete
  completed_at: i < 4 ? '2026-04-01T12:00:00Z' : null,
}));

const D6_ITEM = {
  id: 1,
  unitid: 5005,
  school_name: 'Journey U',
  conference: 'Big Sky',
  div: 'FCS',
  dist: 250,
  added_at: '2026-03-15T12:00:00Z',
  q_link: null,
  coach_link: null,
  grit_fit_labels: [],
  recruiting_journey_steps: FIFTEEN_STEPS,
  coa: 50000,
  net_cost: 18000,
  droi: 3.5,
  break_even: 5.5,
  offer_status: null,
};

describe('Sprint 005 D6 — Recruiting Journey 15-step task list', () => {
  it('renders all 15 step list items beneath the progress bar when expanded', () => {
    const { container, getByTestId } = render(
      <ShortlistSlideOut isOpen={true} onClose={() => {}} item={D6_ITEM} />
    );
    // Body is rendered (default expanded = !journeyCollapsed).
    expect(getByTestId('sso-journey-body')).toBeTruthy();
    // Progress bar present.
    expect(getByTestId('sso-journey-progress')).toBeTruthy();
    // Task list present with all 15 steps.
    const list = getByTestId('sso-journey-tasklist');
    const items = list.querySelectorAll('[data-testid^="sso-journey-step-"][data-testid$="-1"], [data-testid^="sso-journey-step-"]');
    // Use a precise selector — only the <li> wrappers, not nested icon/label nodes.
    const liNodes = container.querySelectorAll('[data-testid^="sso-journey-step-"]:not([data-testid^="sso-journey-step-icon-"]):not([data-testid^="sso-journey-step-label-"])');
    expect(liNodes.length).toBe(15);
  });

  it('marks completed steps with data-complete="true" and reflects label text', () => {
    const { container, getByTestId } = render(
      <ShortlistSlideOut isOpen={true} onClose={() => {}} item={D6_ITEM} />
    );
    expect(getByTestId('sso-journey-step-1').getAttribute('data-complete')).toBe('true');
    expect(getByTestId('sso-journey-step-4').getAttribute('data-complete')).toBe('true');
    expect(getByTestId('sso-journey-step-5').getAttribute('data-complete')).toBe('false');
    expect(getByTestId('sso-journey-step-15').getAttribute('data-complete')).toBe('false');
    expect(getByTestId('sso-journey-step-label-1').textContent).toBe('Step 1 label');
  });

  it('collapsing the section hides the task list', () => {
    const { queryByTestId, container } = render(
      <ShortlistSlideOut isOpen={true} onClose={() => {}} item={D6_ITEM} />
    );
    // Sanity: visible at start
    expect(queryByTestId('sso-journey-tasklist')).toBeTruthy();

    // Collapse via the title strip (CollapsibleTitleStrip uses element id="sso-journey-strip")
    const strip = container.querySelector('#sso-journey-strip');
    expect(strip).toBeTruthy();
    fireEvent.click(strip);

    expect(queryByTestId('sso-journey-tasklist')).toBeNull();
    expect(queryByTestId('sso-journey-body')).toBeNull();
  });

  it('mobile slide-out renders task list with internal scroll container', () => {
    const { getByTestId } = render(
      <ShortlistSlideOut isOpen={true} onClose={() => {}} item={D6_ITEM} />
    );
    const list = getByTestId('sso-journey-tasklist');
    // The list is its own scroll container; overflowY is set to auto so
    // the list scrolls inside the SlideOutShell panel on narrow viewports.
    expect(list.style.overflowY).toBe('auto');
    expect(list.style.maxHeight).toMatch(/\d+px/);
  });

  it('progress bar count agrees with the 15-step source data', () => {
    const { getByTestId } = render(
      <ShortlistSlideOut isOpen={true} onClose={() => {}} item={D6_ITEM} />
    );
    expect(getByTestId('sso-journey-count').textContent).toBe('4 of 15 steps completed');
  });
});

// ── D6 (revised) — Interactive task-list toggle (Phase 2.5) ───────────────

describe('Sprint 005 D6 (revised) — Interactive task toggle', () => {
  it('clicking an incomplete step invokes onToggleStep with itemId, stepId, true', () => {
    const onToggleStep = vi.fn();
    const { getByTestId } = render(
      <ShortlistSlideOut
        isOpen={true}
        onClose={() => {}}
        item={D6_ITEM}
        onToggleStep={onToggleStep}
      />
    );
    // Step 5 is incomplete in fixture (first 4 are complete).
    fireEvent.click(getByTestId('sso-journey-step-5'));
    expect(onToggleStep).toHaveBeenCalledTimes(1);
    expect(onToggleStep).toHaveBeenCalledWith(D6_ITEM.id, 5, true);
  });

  it('clicking a complete step invokes onToggleStep with completed=false', () => {
    const onToggleStep = vi.fn();
    const { getByTestId } = render(
      <ShortlistSlideOut
        isOpen={true}
        onClose={() => {}}
        item={D6_ITEM}
        onToggleStep={onToggleStep}
      />
    );
    // Step 1 is complete -> click should request completed=false.
    fireEvent.click(getByTestId('sso-journey-step-1'));
    expect(onToggleStep).toHaveBeenCalledWith(D6_ITEM.id, 1, false);
  });

  it('when updatingStepId matches, the <li> is aria-disabled and clicks do not fire', () => {
    const onToggleStep = vi.fn();
    const { getByTestId } = render(
      <ShortlistSlideOut
        isOpen={true}
        onClose={() => {}}
        item={D6_ITEM}
        onToggleStep={onToggleStep}
        updatingStepId={5}
      />
    );
    const li = getByTestId('sso-journey-step-5');
    expect(li.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(li);
    expect(onToggleStep).not.toHaveBeenCalled();
  });

  it('aria-checked reflects completion state on every step', () => {
    const onToggleStep = vi.fn();
    const { getByTestId } = render(
      <ShortlistSlideOut
        isOpen={true}
        onClose={() => {}}
        item={D6_ITEM}
        onToggleStep={onToggleStep}
      />
    );
    expect(getByTestId('sso-journey-step-1').getAttribute('aria-checked')).toBe('true');
    expect(getByTestId('sso-journey-step-4').getAttribute('aria-checked')).toBe('true');
    expect(getByTestId('sso-journey-step-5').getAttribute('aria-checked')).toBe('false');
    expect(getByTestId('sso-journey-step-15').getAttribute('aria-checked')).toBe('false');
  });

  it('keyboard: Enter and Space both invoke onToggleStep', () => {
    const onToggleStep = vi.fn();
    const { getByTestId } = render(
      <ShortlistSlideOut
        isOpen={true}
        onClose={() => {}}
        item={D6_ITEM}
        onToggleStep={onToggleStep}
      />
    );
    const li = getByTestId('sso-journey-step-5');
    fireEvent.keyDown(li, { key: 'Enter' });
    expect(onToggleStep).toHaveBeenCalledWith(D6_ITEM.id, 5, true);
    onToggleStep.mockClear();
    fireEvent.keyDown(li, { key: ' ' });
    expect(onToggleStep).toHaveBeenCalledWith(D6_ITEM.id, 5, true);
  });

  it('interactive <li> has role=button, tabIndex 0, and meets ≥44px tap target', () => {
    const onToggleStep = vi.fn();
    const { getByTestId } = render(
      <ShortlistSlideOut
        isOpen={true}
        onClose={() => {}}
        item={D6_ITEM}
        onToggleStep={onToggleStep}
      />
    );
    const li = getByTestId('sso-journey-step-5');
    expect(li.getAttribute('role')).toBe('button');
    expect(li.getAttribute('tabindex')).toBe('0');
    // minHeight applied via inline style to satisfy 44px tap target.
    expect(li.style.minHeight).toBe('44px');
    expect(li.style.cursor).toBe('pointer');
  });

  it('without onToggleStep wired, <li> falls back to non-interactive (read-only)', () => {
    const { getByTestId } = render(
      <ShortlistSlideOut isOpen={true} onClose={() => {}} item={D6_ITEM} />
    );
    const li = getByTestId('sso-journey-step-5');
    expect(li.getAttribute('role')).toBeNull();
    expect(li.getAttribute('tabindex')).toBeNull();
    expect(li.style.cursor).toBe('default');
  });

  it('re-rendering with a toggled item updates data-complete and the progress count', () => {
    const onToggleStep = vi.fn();
    const initialItem = { ...D6_ITEM };
    const { getByTestId, rerender } = render(
      <ShortlistSlideOut
        isOpen={true}
        onClose={() => {}}
        item={initialItem}
        onToggleStep={onToggleStep}
      />
    );
    // Initial: step 5 incomplete, count "4 of 15".
    expect(getByTestId('sso-journey-step-5').getAttribute('data-complete')).toBe('false');
    expect(getByTestId('sso-journey-count').textContent).toBe('4 of 15 steps completed');

    // Simulate the parent updating the item with step 5 toggled complete.
    const toggledSteps = D6_ITEM.recruiting_journey_steps.map((s) =>
      s.step_id === 5 ? { ...s, completed: true, completed_at: '2026-04-25T00:00:00Z' } : s
    );
    rerender(
      <ShortlistSlideOut
        isOpen={true}
        onClose={() => {}}
        item={{ ...D6_ITEM, recruiting_journey_steps: toggledSteps }}
        onToggleStep={onToggleStep}
      />
    );
    expect(getByTestId('sso-journey-step-5').getAttribute('data-complete')).toBe('true');
    expect(getByTestId('sso-journey-count').textContent).toBe('5 of 15 steps completed');
  });
});

// ── D6 (Phase 2.7) — Write path: stale-snapshot fix + 0-row instrumentation ─

import { performStepToggle } from '../../src/pages/ShortlistPage.jsx';

/**
 * Build a chainable mock for `supabase.from(...).update(...).eq(...).eq(...).select()`.
 * The terminal `.select()` resolves to the supplied result.
 */
function buildSupabaseMock(selectResult) {
  const select = vi.fn().mockResolvedValue(selectResult);
  const eq2 = vi.fn().mockReturnValue({ select });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const update = vi.fn().mockReturnValue({ eq: eq1 });
  const from = vi.fn().mockReturnValue({ update });
  return {
    client: { from },
    spies: { from, update, eq1, eq2, select },
  };
}

describe('Sprint 005 D6 (Phase 2.7) — write path', () => {
  const ITEM_ID = 'sli-1';
  const USER_ID = 'user-abc';
  const STEPS = Array.from({ length: 15 }, (_, i) => ({
    step_id: i + 1,
    label: `Step ${i + 1}`,
    completed: i < 4,
    completed_at: i < 4 ? '2026-04-01T12:00:00Z' : null,
  }));

  function makeItem() {
    return {
      id: ITEM_ID,
      unitid: 5005,
      school_name: 'Journey U',
      recruiting_journey_steps: STEPS.map((s) => ({ ...s })),
    };
  }

  // Captures the latest synchronous state from a setState call. The handler
  // uses functional setState — `setX(prev => next)` — so we replay the
  // updater against a controlled prev to read the next state.
  function makeStateSpy(initial) {
    let current = initial;
    const spy = vi.fn((updater) => {
      current = typeof updater === 'function' ? updater(current) : updater;
    });
    return {
      spy,
      get value() { return current; },
    };
  }

  it('toggle success: setItems AND setActiveShortlistItem both update', async () => {
    const item = makeItem();
    const items = [item];

    // Simulate the parent state: activeShortlistItem is a snapshot that
    // mirrors items[0] at row-click time (this is the real bug surface).
    const activeSnapshot = { ...item, recruiting_journey_steps: item.recruiting_journey_steps.map(s => ({ ...s })) };

    const itemsState = makeStateSpy(items);
    const activeState = makeStateSpy(activeSnapshot);
    const updatingState = makeStateSpy({});

    const showToast = vi.fn();
    const logError = vi.fn();

    // Mock returns rows -> success branch.
    const { client, spies } = buildSupabaseMock({
      data: [{ id: ITEM_ID, recruiting_journey_steps: [] }],
      error: null,
    });

    await performStepToggle({
      itemId: ITEM_ID,
      stepId: 5,
      completed: true,
      items,
      userId: USER_ID,
      supabaseClient: client,
      setUpdatingStep: updatingState.spy,
      setItems: itemsState.spy,
      setActiveShortlistItem: activeState.spy,
      showToast,
      logError,
    });

    // Supabase chain shape exercised end-to-end (including .select()).
    expect(spies.from).toHaveBeenCalledWith('short_list_items');
    expect(spies.update).toHaveBeenCalledTimes(1);
    expect(spies.eq1).toHaveBeenCalledWith('id', ITEM_ID);
    expect(spies.eq2).toHaveBeenCalledWith('user_id', USER_ID);
    expect(spies.select).toHaveBeenCalledTimes(1);

    // No toast / error logged on success.
    expect(showToast).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();

    // setItems updated: step 5 is now complete.
    const newItems = itemsState.value;
    const updatedItem = newItems.find((i) => i.id === ITEM_ID);
    const updatedStep5 = updatedItem.recruiting_journey_steps.find((s) => s.step_id === 5);
    expect(updatedStep5.completed).toBe(true);
    expect(updatedStep5.completed_at).not.toBeNull();

    // setActiveShortlistItem updated: the slide-out snapshot also reflects step 5 complete.
    const newActive = activeState.value;
    expect(newActive.id).toBe(ITEM_ID);
    const activeStep5 = newActive.recruiting_journey_steps.find((s) => s.step_id === 5);
    expect(activeStep5.completed).toBe(true);
    expect(activeStep5.completed_at).not.toBeNull();

    // Render the SlideOut with the new active snapshot — data-complete on
    // step 5 must be "true" so the visual reflects the toggle.
    const { getByTestId } = render(
      <ShortlistSlideOut
        isOpen={true}
        onClose={() => {}}
        item={newActive}
        onToggleStep={() => {}}
      />
    );
    expect(getByTestId('sso-journey-step-5').getAttribute('data-complete')).toBe('true');
  });

  it('toggle error: supabase returns explicit error -> toast + console.error, no state update', async () => {
    const item = makeItem();
    const items = [item];
    const active = { ...item };

    const itemsState = makeStateSpy(items);
    const activeState = makeStateSpy(active);
    const updatingState = makeStateSpy({});
    const showToast = vi.fn();
    const logError = vi.fn();

    const { client } = buildSupabaseMock({
      data: null,
      error: { message: 'connection refused', code: 'PGRST500' },
    });

    await performStepToggle({
      itemId: ITEM_ID,
      stepId: 5,
      completed: true,
      items,
      userId: USER_ID,
      supabaseClient: client,
      setUpdatingStep: updatingState.spy,
      setItems: itemsState.spy,
      setActiveShortlistItem: activeState.spy,
      showToast,
      logError,
    });

    // Failure toast surfaced.
    expect(showToast).toHaveBeenCalledWith(
      'Failed to update step. Please try again.',
      'error'
    );

    // Error logged with header + error object.
    expect(logError).toHaveBeenCalledWith(
      'Step toggle error:',
      expect.objectContaining({ message: 'connection refused' })
    );

    // No state mutation on error path (setItems / setActiveShortlistItem
    // were never invoked).
    expect(itemsState.spy).not.toHaveBeenCalled();
    expect(activeState.spy).not.toHaveBeenCalled();
    expect(itemsState.value).toBe(items);
    expect(activeState.value).toBe(active);
  });

  it('toggle 0-rows: supabase returns success with empty data -> blocked toast + diagnostic log, no state update', async () => {
    const item = makeItem();
    const items = [item];
    const active = { ...item };

    const itemsState = makeStateSpy(items);
    const activeState = makeStateSpy(active);
    const updatingState = makeStateSpy({});
    const showToast = vi.fn();
    const logError = vi.fn();

    // RLS-denial shape: { data: [], error: null }.
    const { client, spies } = buildSupabaseMock({ data: [], error: null });

    await performStepToggle({
      itemId: ITEM_ID,
      stepId: 5,
      completed: true,
      items,
      userId: USER_ID,
      supabaseClient: client,
      setUpdatingStep: updatingState.spy,
      setItems: itemsState.spy,
      setActiveShortlistItem: activeState.spy,
      showToast,
      logError,
    });

    // The .select() call is load-bearing — pin it so a future refactor
    // that drops .select() immediately fails this test.
    expect(spies.select).toHaveBeenCalledTimes(1);

    // 0-rows toast surfaced (permissions-blocked message).
    expect(showToast).toHaveBeenCalledWith(
      'Step update was blocked (no rows affected). Check permissions.',
      'error'
    );

    // Diagnostic context logged.
    expect(logError).toHaveBeenCalledWith(
      'Step toggle: 0 rows updated',
      expect.objectContaining({
        itemId: ITEM_ID,
        stepId: 5,
        userId: USER_ID,
      })
    );

    // No state mutation on the 0-row path.
    expect(itemsState.spy).not.toHaveBeenCalled();
    expect(activeState.spy).not.toHaveBeenCalled();
    expect(itemsState.value).toBe(items);
    expect(activeState.value).toBe(active);
  });
});

// ── D7 — Slide-out animation envelope (smoke) ─────────────────────────────

describe('Sprint 005 D7 — slide-out animation smoke', () => {
  it('panel exposes data-axis="x" on desktop viewports and a transform transition', () => {
    // jsdom default window.innerWidth = 1024 -> not mobile.
    const { getByTestId } = render(
      <SlideOutShell isOpen={true} onClose={() => {}} ariaLabel="Test">
        <p>content</p>
      </SlideOutShell>
    );
    const panel = getByTestId('slide-out-shell-panel');
    expect(panel.getAttribute('data-axis')).toBe('x');
    // Transition value contains "transform" and 240ms.
    expect(panel.style.transition).toContain('240ms');
    expect(panel.style.transition).toContain('transform');
  });

  it('reduced-motion: matchMedia true -> no transform transition string', () => {
    // Stub matchMedia to report reduced motion.
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (q) => ({
      matches: q.includes('prefers-reduced-motion'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    });
    try {
      const { getByTestId } = render(
        <SlideOutShell isOpen={true} onClose={() => {}} ariaLabel="Test">
          <p>content</p>
        </SlideOutShell>
      );
      const panel = getByTestId('slide-out-shell-panel');
      expect(panel.getAttribute('data-reduced-motion')).toBe('true');
      // Transition is set to 'none' in reduced-motion mode.
      expect(panel.style.transition).toBe('none');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
