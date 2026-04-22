/**
 * @vitest-environment jsdom
 *
 * g6-map-status-filter.test.jsx — Sprint 004 Wave 3b G6.
 *
 * Verifies:
 *   (a) Status multi-select renders exactly 6 options (SC-2 taxonomy)
 *   (b) Each option shows the STATUS_LABELS label
 *   (c) Default state = all 6 selected
 *   (d) Deselecting a status filters out schools whose ONLY label is that key
 *   (e) A school with multiple labels passes if ANY label is selected
 *   (f) Deselecting all statuses => 0 schools pass
 *   (g) Selecting all statuses => all schools pass (baseline)
 *   (h) Schools with zero computed labels PASS by default (ruling A-2)
 *   (i) Regression guard — the Conferences filter is NOT rendered
 */

import React, { useState } from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';

import { GritFitMapFilters } from '../../src/pages/GritFitPage.jsx';
import { filterByStatus } from '../../src/lib/map/statusFilter.js';
import { STATUS_LABELS, STATUS_ORDER } from '../../src/lib/statusLabels.js';
import { computeGritFitStatuses } from '../../src/lib/gritFitStatus.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Silence the diagnostic warn emitted by computeGritFitStatuses() when a
// scored school yields zero labels — that branch is exercised on purpose in
// the empty-label tests below (ruling A-2).
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

/** Harness that wires GritFitMapFilters to local state so toggles work. */
function Harness({ initialFilters, initialStatuses, onStatusesChange }) {
  const [filters, setFilters] = useState(initialFilters ?? {
    division: '', state: '', search: '', recruitingList: 'all',
  });
  const [selectedStatuses, setSelectedStatuses] = useState(
    initialStatuses ?? STATUS_ORDER.slice()
  );
  const handleChange = (next) => {
    setSelectedStatuses(next);
    if (onStatusesChange) onStatusesChange(next);
  };
  return (
    <GritFitMapFilters
      results={[]}
      allSchools={[]}
      filters={filters}
      onFilterChange={setFilters}
      selectedStatuses={selectedStatuses}
      onSelectedStatusesChange={handleChange}
      onRecalculate={() => {}}
      recalculating={false}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────
// UI tests — GritFitMapFilters sub-component
// ──────────────────────────────────────────────────────────────────────────
describe('GritFitMapFilters — Status multi-select UI', () => {
  it('(a) renders exactly 6 status filter options', () => {
    const { container } = render(<Harness />);
    const group = container.querySelector('[data-testid="filter-status-group"]');
    expect(group).not.toBeNull();
    const buttons = group.querySelectorAll('button[data-status-key]');
    expect(buttons.length).toBe(6);
  });

  it('(b) each option displays the label from STATUS_LABELS', () => {
    const { container } = render(<Harness />);
    for (const key of STATUS_ORDER) {
      const btn = container.querySelector(`[data-testid="filter-status-${key}"]`);
      expect(btn, `button missing for ${key}`).not.toBeNull();
      expect(btn.textContent).toContain(STATUS_LABELS[key].label);
    }
  });

  it('(c) default state — all 6 statuses are selected', () => {
    const { container } = render(<Harness />);
    for (const key of STATUS_ORDER) {
      const btn = container.querySelector(`[data-testid="filter-status-${key}"]`);
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(btn.getAttribute('data-selected')).toBe('true');
    }
  });

  it('toggles a status off when clicked, then back on', () => {
    const captured = [];
    const { container } = render(<Harness onStatusesChange={(n) => captured.push(n)} />);
    const btn = container.querySelector('[data-testid="filter-status-currently_recommended"]');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(captured.at(-1)).not.toContain('currently_recommended');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(captured.at(-1)).toContain('currently_recommended');
  });

  it('(i) regression guard — Conferences filter is NOT rendered', () => {
    const { container, queryByTestId } = render(<Harness />);
    // Old testid from GritFitActionBar must be absent on this filter bar.
    expect(queryByTestId('filter-conference')).toBeNull();
    // Also confirm no user-visible "Conferences" text in the filter bar.
    expect(container.textContent).not.toMatch(/All Conferences/);
    expect(container.textContent).not.toMatch(/\bConference\b/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Predicate tests — filterByStatus pure logic
// ──────────────────────────────────────────────────────────────────────────
//
// computeGritFitStatuses() is a pure function — we feed synthetic scored
// school fixtures that deterministically land in one / two / zero label sets.

// Fixtures using the TIER_ORDER so label math resolves predictably.
// TIER_ORDER = ['D3','D2','FCS','G6','Power 4'] (index 0..4; higher = more elite).
// topTier = 'G6' => matching tier => no above/below athletic label.
const topTier = 'G6';
const recruitReach = 500;

// School 1 — CR only: eligible + matchRank<=50 + same tier + within reach +
// schoolRigor === athleteAcad (no academic labels) => labels = ['currently_recommended'].
const schoolCROnly = {
  unitid: 1,
  eligible: true,
  matchRank: 5,
  dist: 100,
  schoolRigor: 0.5,
  athleteAcad: 0.5,
  type: 'G6',
};

// School 2 — out_of_academic_reach only: schoolRigor > athleteAcad, same
// tier, within reach, not eligible (no CR).
const schoolAcadReachOnly = {
  unitid: 2,
  eligible: false,
  matchRank: null,
  dist: 100,
  schoolRigor: 0.9,
  athleteAcad: 0.3,
  type: 'G6',
};

// School 3 — multi-label: CR + outside_geographic_reach (eligible+matchRank
// triggers CR; dist > recruitReach triggers geographic).
const schoolCRPlusGeo = {
  unitid: 3,
  eligible: true,
  matchRank: 10,
  dist: 1000,
  schoolRigor: 0.5,
  athleteAcad: 0.5,
  type: 'G6',
};

// School 4 — zero labels: CR conditions fail (matchRank > 50), rigor/acad
// match, same tier, within reach. computeGritFitStatuses returns [].
const schoolNoLabels = {
  unitid: 4,
  eligible: true,
  matchRank: 999,
  dist: 100,
  schoolRigor: 0.5,
  athleteAcad: 0.5,
  type: 'G6',
};

describe('filterByStatus — predicate semantics', () => {
  it('sanity — fixtures produce the expected label sets', () => {
    expect(computeGritFitStatuses(schoolCROnly, topTier, recruitReach))
      .toEqual(['currently_recommended']);
    expect(computeGritFitStatuses(schoolAcadReachOnly, topTier, recruitReach))
      .toEqual(['out_of_academic_reach']);
    const multi = computeGritFitStatuses(schoolCRPlusGeo, topTier, recruitReach);
    expect(multi).toContain('currently_recommended');
    expect(multi).toContain('outside_geographic_reach');
    expect(computeGritFitStatuses(schoolNoLabels, topTier, recruitReach))
      .toEqual([]);
  });

  it('(g) all 6 statuses selected => every school passes (baseline)', () => {
    const schools = [schoolCROnly, schoolAcadReachOnly, schoolCRPlusGeo, schoolNoLabels];
    const out = filterByStatus(schools, STATUS_ORDER.slice(), topTier, recruitReach);
    expect(out.length).toBe(4);
  });

  it('(d) deselecting a status removes schools whose ONLY label is that key', () => {
    // Remove 'currently_recommended' — schoolCROnly should disappear.
    const selected = STATUS_ORDER.filter(k => k !== 'currently_recommended');
    const schools = [schoolCROnly, schoolAcadReachOnly];
    const out = filterByStatus(schools, selected, topTier, recruitReach);
    expect(out.map(s => s.unitid)).toEqual([schoolAcadReachOnly.unitid]);
  });

  it('(e) a school with multiple labels passes if ANY is selected', () => {
    // Keep only 'currently_recommended' selected. schoolCRPlusGeo has CR +
    // geo; it should still pass because CR is in the selected set.
    const out = filterByStatus(
      [schoolCRPlusGeo],
      ['currently_recommended'],
      topTier,
      recruitReach,
    );
    expect(out.length).toBe(1);

    // Flip it — keep only 'outside_geographic_reach' selected. Same school
    // should still pass because geo is also in its label set.
    const out2 = filterByStatus(
      [schoolCRPlusGeo],
      ['outside_geographic_reach'],
      topTier,
      recruitReach,
    );
    expect(out2.length).toBe(1);
  });

  it('(f) deselecting all statuses => 0 schools pass', () => {
    const schools = [schoolCROnly, schoolAcadReachOnly, schoolCRPlusGeo, schoolNoLabels];
    const out = filterByStatus(schools, [], topTier, recruitReach);
    expect(out.length).toBe(0);
  });

  it('(h) schools with zero computed labels PASS by default (ruling A-2)', () => {
    // schoolNoLabels produces []. It should pass even when the user has
    // deselected some statuses — it has no status to screen against.
    const selectedSubset = ['currently_recommended'];
    const out = filterByStatus(
      [schoolNoLabels],
      selectedSubset,
      topTier,
      recruitReach,
    );
    expect(out.length).toBe(1);
    expect(out[0].unitid).toBe(schoolNoLabels.unitid);

    // Even with only one status selected that does NOT apply to it, still passes.
    const out2 = filterByStatus(
      [schoolNoLabels],
      ['outside_geographic_reach'],
      topTier,
      recruitReach,
    );
    expect(out2.length).toBe(1);
  });

  it('returns [] when schools is not an array', () => {
    expect(filterByStatus(null, STATUS_ORDER.slice(), topTier, recruitReach)).toEqual([]);
    expect(filterByStatus(undefined, STATUS_ORDER.slice(), topTier, recruitReach)).toEqual([]);
  });
});
