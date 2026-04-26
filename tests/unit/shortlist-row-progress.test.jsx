/**
 * @vitest-environment jsdom
 *
 * shortlist-row-progress.test.jsx — Sprint 007 hotfix HF-5
 *
 * Locks the per-school Recruiting Journey progress bar added to
 * ShortlistRow. Covers:
 *   - Bar renders for every shortlist row
 *   - Fill percentage matches completed_steps / 15
 *   - Edge cases: 0 completed and 15 completed render correctly
 *   - countCompletedSteps helper is null-safe on missing JSONB
 *   - Label text reads "{completed}/15"
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import ShortlistRow, {
  countCompletedSteps,
  JOURNEY_STEP_TOTAL,
} from '../../src/components/ShortlistRow.jsx';

afterEach(cleanup);

function makeSteps(completedCount) {
  return Array.from({ length: 15 }, (_, i) => ({
    step_id: i + 1,
    label: `step ${i + 1}`,
    completed: i < completedCount,
  }));
}

function makeItem(unitid, school_name, completedCount, extras = {}) {
  return {
    unitid,
    school_name,
    div: 'D3',
    conference: 'NESCAC',
    grit_fit_status: 'grit_fit',
    grit_fit_labels: ['grit_fit'],
    recruiting_journey_steps: makeSteps(completedCount),
    ...extras,
  };
}

// ── Helper ────────────────────────────────────────────────────────────────

describe('Sprint 007 HF-5 — countCompletedSteps helper', () => {
  it('JOURNEY_STEP_TOTAL is 15 (post-0037 structure)', () => {
    expect(JOURNEY_STEP_TOTAL).toBe(15);
  });

  it('counts completed=true entries across the JSONB', () => {
    expect(countCompletedSteps(makeItem(1, 'X', 0))).toBe(0);
    expect(countCompletedSteps(makeItem(1, 'X', 1))).toBe(1);
    expect(countCompletedSteps(makeItem(1, 'X', 7))).toBe(7);
    expect(countCompletedSteps(makeItem(1, 'X', 15))).toBe(15);
  });

  it('is null-safe on missing or malformed JSONB', () => {
    expect(countCompletedSteps(null)).toBe(0);
    expect(countCompletedSteps(undefined)).toBe(0);
    expect(countCompletedSteps({})).toBe(0);
    expect(countCompletedSteps({ recruiting_journey_steps: null })).toBe(0);
    expect(countCompletedSteps({ recruiting_journey_steps: 'not an array' })).toBe(0);
  });

  it('treats non-strict-true completed values as not-completed', () => {
    const item = {
      recruiting_journey_steps: [
        { step_id: 1, completed: true },
        { step_id: 2, completed: 'true' },   // string truthy — not counted
        { step_id: 3, completed: 1 },          // numeric truthy — not counted
        { step_id: 4, completed: false },
        { step_id: 5, completed: null },
      ],
    };
    expect(countCompletedSteps(item)).toBe(1);
  });
});

// ── Render: bar presence + fill + label ──────────────────────────────────

describe('Sprint 007 HF-5 — ShortlistRow progress bar render', () => {
  it('renders the progress bar for a row with completed steps', () => {
    const item = makeItem(130697, 'Wesleyan', 7);
    const { getByTestId } = render(<ShortlistRow item={item} rank={1} index={0} />);
    expect(getByTestId(`row-progress-${item.unitid}`)).toBeTruthy();
    expect(getByTestId('row-progress-fill')).toBeTruthy();
    expect(getByTestId('row-progress-label').textContent).toBe('7/15');
  });

  it('renders the bar at 0% width when zero steps are complete (empty state visible)', () => {
    const item = makeItem(161253, 'Maine', 0);
    const { getByTestId } = render(<ShortlistRow item={item} rank={1} index={0} />);
    const fill = getByTestId('row-progress-fill');
    expect(fill).toBeTruthy();
    expect(fill.getAttribute('data-progress-pct')).toBe('0.00');
    expect(getByTestId('row-progress-label').textContent).toBe('0/15');
  });

  it('renders the bar at 100% when all 15 steps are complete', () => {
    const item = makeItem(194824, 'RPI', 15);
    const { getByTestId } = render(<ShortlistRow item={item} rank={1} index={0} />);
    const fill = getByTestId('row-progress-fill');
    expect(fill.getAttribute('data-progress-pct')).toBe('100.00');
    expect(getByTestId('row-progress-label').textContent).toBe('15/15');
  });

  it('renders the bar at 6.67% for the default-shortlist 1/15 case', () => {
    const item = makeItem(183044, 'UNH', 1);
    const { getByTestId } = render(<ShortlistRow item={item} rank={1} index={0} />);
    const fill = getByTestId('row-progress-fill');
    // 1/15 * 100 = 6.6666... -> .toFixed(2) -> '6.67'
    expect(fill.getAttribute('data-progress-pct')).toBe('6.67');
  });

  it('aria-label communicates the n-of-15 ratio for screen readers', () => {
    const item = makeItem(130697, 'Wesleyan', 4);
    const { getByTestId } = render(<ShortlistRow item={item} rank={1} index={0} />);
    const slot = getByTestId(`row-progress-${item.unitid}`);
    expect(slot.getAttribute('aria-label')).toBe(
      'Recruiting journey progress: 4 of 15 steps complete',
    );
  });

  it('still renders for an item with no recruiting_journey_steps JSONB at all', () => {
    const item = {
      unitid: 999999,
      school_name: 'No Steps U',
      div: 'D3',
      grit_fit_status: 'grit_fit',
      grit_fit_labels: [],
      // no recruiting_journey_steps key
    };
    const { getByTestId } = render(<ShortlistRow item={item} rank={1} index={0} />);
    const fill = getByTestId('row-progress-fill');
    expect(fill.getAttribute('data-progress-pct')).toBe('0.00');
    expect(getByTestId('row-progress-label').textContent).toBe('0/15');
  });
});
