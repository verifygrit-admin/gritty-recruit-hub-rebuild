/**
 * @vitest-environment jsdom
 *
 * g7b-mobile-row-slide-out.test.jsx — Sprint 004 G7b
 *
 * Mobile-only row (card) tap opens SC-3 SlideOutShell containing SC-4
 * SchoolDetailsCard. Desktop row click is unchanged. Coexistence guard: G7a
 * sort-control taps do NOT open the slide-out.
 *
 * Assertions:
 *  (a) Mobile rows carry an onClick tap handler.
 *  (b) Tapping a row opens the slide-out with the correct school.
 *  (c) Desktop row click does NOT open the slide-out (desktop branch unchanged).
 *  (d) Close button, backdrop, and Escape all close the slide-out.
 *  (e) Status pill renders when school yields a valid status.
 *  (f) Empty-status case: zero labels -> null statusKey -> no pill (A-2).
 *  (g) Sort control tap does NOT open the slide-out.
 *  (h) After open+close, sort controls remain functional.
 *
 * useIsDesktop is mocked with the same pattern as g7a-mobile-sort.test.jsx.
 * computeGritFitStatuses is mocked per test so we can drive the label output
 * deterministically (topTier/recruitReach plumbing is exercised by GritFitPage,
 * not here).
 */

import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';

// Mutable hook mock — reset per test.
let mockIsDesktop = false;
vi.mock('../../src/hooks/useIsDesktop.js', () => ({
  default: () => mockIsDesktop,
}));

// Mutable status mock — lets each test drive the label array returned for
// the selected school without needing to hand-roll a realistic scoredSchool.
let mockStatusLabels = ['currently_recommended'];
vi.mock('../../src/lib/gritFitStatus.js', () => ({
  computeGritFitStatuses: () => mockStatusLabels,
}));

import GritFitTableView from '../../src/components/GritFitTableView.jsx';

afterEach(() => {
  cleanup();
  // Be polite to SlideOutShell's body-scroll-lock effect.
  document.body.style.overflow = '';
  document.body.classList.remove('slide-out-shell-scroll-lock');
});

beforeEach(() => {
  mockIsDesktop = false;
  mockStatusLabels = ['currently_recommended'];
});

const fixtureSchools = [
  { unitid: 1, school_name: 'Alpha U',   type: 'D3', conference: 'NESCAC', state: 'MA',
    matchRank: 3, dist: 120, adltv: 50000, netCost: 22000 },
  { unitid: 2, school_name: 'Bravo U',   type: 'D3', conference: 'NESCAC', state: 'CT',
    matchRank: 1, dist: 300, adltv: 10000, netCost: 8000  },
  { unitid: 3, school_name: 'Charlie U', type: 'D2', conference: 'CCAA',   state: 'CA',
    matchRank: 2, dist: 45,  adltv: 95000, netCost: 31000 },
  { unitid: 4, school_name: 'Delta U',   type: 'FCS',conference: 'Ivy',    state: 'NY',
    matchRank: 4, dist: 220, adltv: 30000, netCost: 15000 },
];

function renderView(extraProps = {}) {
  return render(
    <GritFitTableView
      results={fixtureSchools}
      shortlistIds={new Set()}
      onAddToShortlist={() => {}}
      {...extraProps}
    />
  );
}

describe('G7b — mobile row tap opens SchoolDetailsCard in SlideOutShell', () => {
  it('(a) mobile rows carry an onClick handler (role=button)', () => {
    mockIsDesktop = false;
    const { getByTestId } = renderView();
    const card = getByTestId('result-card-1'); // Bravo U, matchRank 1
    expect(card.getAttribute('role')).toBe('button');
  });

  it('(b) tapping a mobile row opens the slide-out with the correct school', () => {
    mockIsDesktop = false;
    const { getByTestId, queryByTestId } = renderView();

    // Closed by default.
    expect(queryByTestId('slide-out-shell-panel')).toBeNull();

    // Tap Bravo U card (matchRank 1).
    fireEvent.click(getByTestId('result-card-1'));

    // SC-3 panel rendered.
    expect(queryByTestId('slide-out-shell-panel')).toBeTruthy();
    // SC-4 school name reflects Bravo U.
    expect(getByTestId('sdc-school-name').textContent).toBe('Bravo U');
  });

  it('(c) desktop row click does NOT open the slide-out', () => {
    mockIsDesktop = true;
    const { queryAllByTestId, queryByTestId } = renderView();

    // Desktop renders <tr> rows.
    const rows = queryAllByTestId(/^result-row-/);
    expect(rows.length).toBeGreaterThan(0);
    // Click the first row. Desktop has no slide-out wiring — panel stays absent.
    fireEvent.click(rows[0]);
    expect(queryByTestId('slide-out-shell-panel')).toBeNull();
  });

  it('(d) close button, backdrop, and Escape all close the slide-out', () => {
    mockIsDesktop = false;
    // Sprint 005 D7 — close path now keeps the panel mounted for the 240ms
    // exit animation. Use fake timers to advance past the unmount delay so
    // the existing close-contract assertions still hold.
    vi.useFakeTimers();
    try {
      const { getByTestId, queryByTestId } = renderView();

      // Open via tap.
      fireEvent.click(getByTestId('result-card-1'));
      expect(queryByTestId('slide-out-shell-panel')).toBeTruthy();

      // Close button.
      fireEvent.click(getByTestId('slide-out-shell-close'));
      act(() => { vi.advanceTimersByTime(260); }); // > 240ms exit animation
      expect(queryByTestId('slide-out-shell-panel')).toBeNull();

      // Open again, close via backdrop.
      fireEvent.click(getByTestId('result-card-1'));
      expect(queryByTestId('slide-out-shell-panel')).toBeTruthy();
      fireEvent.click(getByTestId('slide-out-shell-backdrop'));
      act(() => { vi.advanceTimersByTime(260); });
      expect(queryByTestId('slide-out-shell-panel')).toBeNull();

      // Open again, close via Escape.
      fireEvent.click(getByTestId('result-card-1'));
      expect(queryByTestId('slide-out-shell-panel')).toBeTruthy();
      fireEvent.keyDown(window, { key: 'Escape' });
      act(() => { vi.advanceTimersByTime(260); });
      expect(queryByTestId('slide-out-shell-panel')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('(e) status pill renders inside SC-4 when school yields a valid status', () => {
    mockIsDesktop = false;
    mockStatusLabels = ['currently_recommended'];
    const { getByTestId, queryByTestId } = renderView();

    fireEvent.click(getByTestId('result-card-1'));
    // SchoolDetailsCard renders sdc-status-slot when statusKey is truthy.
    expect(queryByTestId('sdc-status-slot')).toBeTruthy();
  });

  it('(f) empty-status case: zero labels -> null statusKey -> no pill (A-2 guard)', () => {
    mockIsDesktop = false;
    mockStatusLabels = []; // empty -> null statusKey
    const { getByTestId, queryByTestId } = renderView();

    fireEvent.click(getByTestId('result-card-1'));
    // Slide-out still opens with the school.
    expect(queryByTestId('slide-out-shell-panel')).toBeTruthy();
    expect(getByTestId('sdc-school-name').textContent).toBe('Bravo U');
    // No status slot rendered.
    expect(queryByTestId('sdc-status-slot')).toBeNull();
  });

  it('(g) tapping a mobile sort control does NOT open the slide-out', () => {
    mockIsDesktop = false;
    const { getByTestId, queryByTestId } = renderView();

    // Sanity — panel closed.
    expect(queryByTestId('slide-out-shell-panel')).toBeNull();

    // Tap every sort control in turn; none should open the slide-out.
    fireEvent.click(getByTestId('mobile-sort-rank'));
    expect(queryByTestId('slide-out-shell-panel')).toBeNull();
    fireEvent.click(getByTestId('mobile-sort-distance'));
    expect(queryByTestId('slide-out-shell-panel')).toBeNull();
    fireEvent.click(getByTestId('mobile-sort-adltv'));
    expect(queryByTestId('slide-out-shell-panel')).toBeNull();
    fireEvent.click(getByTestId('mobile-sort-annualCost'));
    expect(queryByTestId('slide-out-shell-panel')).toBeNull();
  });

  it('(h) after open+close, sort controls remain functional', () => {
    mockIsDesktop = false;
    // Sprint 005 D7 — fake timers cover the 240ms exit animation.
    vi.useFakeTimers();
    try {
      const { container, getByTestId, queryByTestId } = renderView();

      // Default rank order: 1, 2, 3, 4.
      const initialOrder = Array.from(
        container.querySelectorAll('[data-testid^="result-card-"]')
      ).map(el => el.getAttribute('data-testid'));
      expect(initialOrder).toEqual([
        'result-card-1', 'result-card-2', 'result-card-3', 'result-card-4',
      ]);

      // Open slide-out, then close it.
      fireEvent.click(getByTestId('result-card-1'));
      expect(queryByTestId('slide-out-shell-panel')).toBeTruthy();
      fireEvent.click(getByTestId('slide-out-shell-close'));
      act(() => { vi.advanceTimersByTime(260); });
      expect(queryByTestId('slide-out-shell-panel')).toBeNull();

      // Distance ascending — Charlie (45), Alpha (120), Delta (220), Bravo (300).
      // matchRanks: 2, 3, 4, 1
      fireEvent.click(getByTestId('mobile-sort-distance'));
      const postSortOrder = Array.from(
        container.querySelectorAll('[data-testid^="result-card-"]')
      ).map(el => el.getAttribute('data-testid'));
      expect(postSortOrder).toEqual([
        'result-card-2', 'result-card-3', 'result-card-4', 'result-card-1',
      ]);
    } finally {
      vi.useRealTimers();
    }
  });
});
