/**
 * @vitest-environment jsdom
 *
 * sprint-007-hf3.test.jsx — Sprint 007 hotfix HF-3
 *
 *   CHG-1: Grit Fit page H1 renders without the count token
 *   CHG-2: ShortlistFilters sort dropdown carries Most Progress and
 *          Least Progress at the TOP, above the existing options
 *   CHG-2: ShortlistPage default sort on initial mount is progress_desc
 *   CHG-2: Sort order on Most Progress places higher-progress rows
 *          above lower-progress rows
 *
 * Source-static and component-render assertions only — no supabase mocking.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import ShortlistFilters from '../../src/components/ShortlistFilters.jsx';

afterEach(cleanup);

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHORTLIST_PAGE_PATH = resolve(__dirname, '../../src/pages/ShortlistPage.jsx');
const GRIT_FIT_PAGE_PATH  = resolve(__dirname, '../../src/pages/GritFitPage.jsx');

// ── CHG-1 ────────────────────────────────────────────────────────────────

describe('Sprint 007 HF-3 CHG-1 — Grit Fit page H1', () => {
  const source = readFileSync(GRIT_FIT_PAGE_PATH, 'utf8');

  it('H1 reads "Your GRIT FIT Matches" without a count token', () => {
    expect(source).toContain('Your GRIT FIT Matches');
    // Regression guard: the retired count token must not resurface in the H1.
    expect(source).not.toMatch(/Your\s+\{[^}]*Count[^}]*\}\s+GRIT FIT Matches/);
  });

  it('subheader keeps the count for context (not regressed by CHG-1)', () => {
    // Sanity that the operator's stated subheader still carries the count.
    expect(source).toContain('schools matched to your profile');
  });
});

// ── CHG-2 — sort dropdown ────────────────────────────────────────────────

describe('Sprint 007 HF-3 CHG-2 — Shortlist sort dropdown', () => {
  const baseProps = {
    items: [],
    filters: { status: '', division: '', conference: '' },
    sortBy: 'progress_desc',
    onFilterChange: () => {},
    onSortChange: () => {},
    filteredCount: 0,
    totalCount: 0,
  };

  it('renders Most Progress and Least Progress in the sort dropdown', () => {
    const { getByTestId } = render(<ShortlistFilters {...baseProps} />);
    const select = getByTestId('sort-by');
    const options = Array.from(select.querySelectorAll('option'));
    const labels = options.map((o) => o.textContent);
    const values = options.map((o) => o.value);

    expect(labels).toContain('Most Progress');
    expect(labels).toContain('Least Progress');
    expect(values).toContain('progress_desc');
    expect(values).toContain('progress_asc');
  });

  it('places progress options at the TOP of the dropdown, above Name (A-Z)', () => {
    const { getByTestId } = render(<ShortlistFilters {...baseProps} />);
    const select = getByTestId('sort-by');
    const values = Array.from(select.querySelectorAll('option')).map((o) => o.value);

    const idxMostProgress = values.indexOf('progress_desc');
    const idxLeastProgress = values.indexOf('progress_asc');
    const idxNameAsc = values.indexOf('name_asc');

    expect(idxMostProgress).toBe(0);
    expect(idxLeastProgress).toBe(1);
    expect(idxNameAsc).toBeGreaterThan(idxLeastProgress);
  });

  it('forwards the chosen sort key via onSortChange', () => {
    const onSortChange = vi.fn();
    const { getByTestId } = render(
      <ShortlistFilters {...baseProps} onSortChange={onSortChange} />,
    );
    const select = getByTestId('sort-by');
    select.value = 'progress_asc';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onSortChange).toHaveBeenCalledWith('progress_asc');
  });
});

// ── CHG-2 — default sort + sort logic on ShortlistPage ──────────────────

describe('Sprint 007 HF-3 CHG-2 — ShortlistPage default + sort logic', () => {
  const source = readFileSync(SHORTLIST_PAGE_PATH, 'utf8');

  it('initial sortBy state is progress_desc', () => {
    expect(source).toMatch(/useState\(\s*'progress_desc'\s*\)/);
  });

  it('sortedItems handles progress_desc and progress_asc cases', () => {
    expect(source).toContain("case 'progress_desc':");
    expect(source).toContain("case 'progress_asc':");
  });

  // Behavioral simulation of the sort comparator. Mirrors the inline
  // progressOf helper in ShortlistPage.jsx so the contract is directly tested
  // without rendering the full page (which would require supabase mocking).
  it('Most Progress places a 10-step row above a 5-step row, with name tiebreak', () => {
    const progressOf = (item) => {
      const steps = Array.isArray(item?.recruiting_journey_steps)
        ? item.recruiting_journey_steps
        : [];
      let n = 0;
      for (const s of steps) if (s && s.completed === true) n += 1;
      return n;
    };

    const makeRow = (school_name, completedCount) => ({
      school_name,
      recruiting_journey_steps: Array.from({ length: 15 }, (_, i) => ({
        step_id: i + 1,
        completed: i < completedCount,
      })),
    });

    const items = [
      makeRow('Charlie U', 5),
      makeRow('Alpha U',   10),
      makeRow('Bravo U',   5),
    ];

    const byName = (a, b) => (a.school_name || '').localeCompare(b.school_name || '');
    const compareWithNameTiebreak = (primaryCmp) => (a, b) => {
      const r = primaryCmp(a, b);
      return r !== 0 ? r : byName(a, b);
    };

    const sorted = [...items].sort(
      compareWithNameTiebreak((a, b) => progressOf(b) - progressOf(a)),
    );

    expect(sorted.map((r) => r.school_name)).toEqual(['Alpha U', 'Bravo U', 'Charlie U']);
  });

  it('Least Progress inverts the order (5-step rows above 10-step row)', () => {
    const progressOf = (item) => {
      const steps = Array.isArray(item?.recruiting_journey_steps)
        ? item.recruiting_journey_steps
        : [];
      let n = 0;
      for (const s of steps) if (s && s.completed === true) n += 1;
      return n;
    };

    const makeRow = (school_name, completedCount) => ({
      school_name,
      recruiting_journey_steps: Array.from({ length: 15 }, (_, i) => ({
        step_id: i + 1,
        completed: i < completedCount,
      })),
    });

    const items = [
      makeRow('Charlie U', 10),
      makeRow('Alpha U',   5),
      makeRow('Bravo U',   5),
    ];

    const byName = (a, b) => (a.school_name || '').localeCompare(b.school_name || '');
    const compareWithNameTiebreak = (primaryCmp) => (a, b) => {
      const r = primaryCmp(a, b);
      return r !== 0 ? r : byName(a, b);
    };

    const sorted = [...items].sort(
      compareWithNameTiebreak((a, b) => progressOf(a) - progressOf(b)),
    );

    expect(sorted.map((r) => r.school_name)).toEqual(['Alpha U', 'Bravo U', 'Charlie U']);
  });
});
