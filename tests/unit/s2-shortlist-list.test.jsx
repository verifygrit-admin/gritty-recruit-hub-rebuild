/**
 * @vitest-environment jsdom
 *
 * s2-shortlist-list.test.jsx — Sprint 004 Wave 3b (S2)
 *
 * Covers the card -> list refactor of the Shortlist main view:
 *   - ShortlistRow rendering (school, subline, status pill, rank indicator)
 *   - Rank numbering "N/total" is 1-indexed and reflects the *filtered* list
 *   - Filter wiring (status / division / conference) narrows + re-numbers
 *   - Sort wiring (6 sort keys) reorders the rendered list
 *   - Row click fires the onClick handler
 *   - Empty status (null/empty labels) renders no pill (A-2 regression guard)
 *
 * The full ShortlistPage is data-heavy (supabase fetches, auth). We isolate
 * S2 behavior with a thin local harness (Harness) that mirrors the
 * filter+sort memoized logic in src/pages/ShortlistPage.jsx and renders
 * ShortlistFilters + ShortlistRow the same way the page does.
 */

import React, { useMemo, useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';

import ShortlistRow, { pickPrimaryStatus } from '../../src/components/ShortlistRow.jsx';
import ShortlistFilters from '../../src/components/ShortlistFilters.jsx';

afterEach(() => {
  cleanup();
});

// ── Fixtures ───────────────────────────────────────────────────────────────
// 5 short_list_items rows, covering the fields exercised by S2:
//   school_name, unitid, div, conference, grit_fit_status, grit_fit_labels,
//   added_at, dist, droi, net_cost, break_even
const FIXTURES = [
  {
    id: 'row-1',
    unitid: 1001,
    school_name: 'Aurora State',
    div: 'D2',
    conference: 'MIAA',
    grit_fit_status: 'currently_recommended',
    grit_fit_labels: ['currently_recommended'],
    added_at: '2026-01-10T12:00:00Z',
    dist: 120,
    droi: 4.1,
    net_cost: 22000,
    break_even: 6.0,
  },
  {
    id: 'row-2',
    unitid: 1002,
    school_name: 'Brookside College',
    div: 'D3',
    conference: 'NESCAC',
    grit_fit_status: 'below_academic_fit',
    grit_fit_labels: ['below_academic_fit'],
    added_at: '2026-02-15T12:00:00Z',
    dist: 50,
    droi: 3.3,
    net_cost: 32000,
    break_even: 8.5,
  },
  {
    id: 'row-3',
    unitid: 1003,
    school_name: 'Crestline U',
    div: 'FCS',
    conference: 'Big Sky',
    grit_fit_status: 'out_of_academic_reach',
    grit_fit_labels: ['out_of_academic_reach'],
    added_at: '2025-11-22T12:00:00Z',
    dist: 800,
    droi: 5.8,
    net_cost: 18000,
    break_even: 4.2,
  },
  {
    id: 'row-4',
    unitid: 1004,
    school_name: 'Delphi Tech',
    div: 'Power 4',
    conference: 'Big Ten',
    grit_fit_status: 'outside_geographic_reach',
    grit_fit_labels: ['outside_geographic_reach'],
    added_at: '2026-03-03T12:00:00Z',
    dist: 1500,
    droi: 2.9,
    net_cost: 41000,
    break_even: 11.0,
  },
  {
    id: 'row-5',
    unitid: 1005,
    school_name: 'Evergreen Poly',
    div: 'D2',
    conference: 'MIAA',
    grit_fit_status: null,
    grit_fit_labels: [],
    added_at: '2025-12-05T12:00:00Z',
    dist: 300,
    droi: 3.7,
    net_cost: 27500,
    break_even: 7.1,
  },
];

// ── Harness ────────────────────────────────────────────────────────────────
// Mirrors ShortlistPage's filteredItems/sortedItems memos and renders the
// same ShortlistFilters + ShortlistRow shape.
function Harness({ items = FIXTURES, onRowClick = () => {}, initialSort = 'name_asc' }) {
  const [filters, setFilters] = useState({ status: '', division: '', conference: '' });
  const [sortBy, setSortBy] = useState(initialSort);

  const filteredItems = useMemo(() => {
    let arr = [...items];
    if (filters.status) {
      arr = arr.filter(i =>
        i.grit_fit_status === filters.status ||
        (Array.isArray(i.grit_fit_labels) && i.grit_fit_labels.includes(filters.status))
      );
    }
    if (filters.division) arr = arr.filter(i => i.div === filters.division);
    if (filters.conference) arr = arr.filter(i => i.conference === filters.conference);
    return arr;
  }, [items, filters]);

  const sortedItems = useMemo(() => {
    const arr = [...filteredItems];
    switch (sortBy) {
      case 'name_asc': arr.sort((a, b) => (a.school_name || '').localeCompare(b.school_name || '')); break;
      case 'name_desc': arr.sort((a, b) => (b.school_name || '').localeCompare(a.school_name || '')); break;
      case 'added_newest': arr.sort((a, b) => new Date(b.added_at) - new Date(a.added_at)); break;
      case 'added_oldest': arr.sort((a, b) => new Date(a.added_at) - new Date(b.added_at)); break;
      case 'dist_asc': arr.sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity)); break;
      case 'droi_desc': arr.sort((a, b) => (b.droi ?? -Infinity) - (a.droi ?? -Infinity)); break;
      case 'net_cost_asc': arr.sort((a, b) => (a.net_cost ?? Infinity) - (b.net_cost ?? Infinity)); break;
      case 'payback_asc': arr.sort((a, b) => (a.break_even ?? Infinity) - (b.break_even ?? Infinity)); break;
      default: break;
    }
    return arr;
  }, [filteredItems, sortBy]);

  return (
    <div>
      <ShortlistFilters
        items={items}
        filters={filters}
        sortBy={sortBy}
        onFilterChange={setFilters}
        onSortChange={setSortBy}
        filteredCount={filteredItems.length}
        totalCount={items.length}
      />
      <div data-testid="shortlist-rows">
        {sortedItems.map((item, idx) => (
          <ShortlistRow
            key={item.id}
            item={item}
            rank={idx + 1}
            totalFiltered={sortedItems.length}
            onClick={onRowClick}
          />
        ))}
      </div>
    </div>
  );
}

function getRowOrder(container) {
  return Array.from(container.querySelectorAll('[data-testid^="shortlist-row-"]'))
    .map(el => el.querySelector('[data-testid="row-school-name"]').textContent);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('S2 — Shortlist list layout (row-based)', () => {
  it('(a) renders N rows for N items', () => {
    const { container } = render(<Harness />);
    const rows = container.querySelectorAll('[data-testid^="shortlist-row-"]');
    expect(rows.length).toBe(FIXTURES.length);
  });

  it('(b) row renders school name, div+conference subline, status pill, rank indicator', () => {
    const { getByTestId } = render(
      <ShortlistRow item={FIXTURES[0]} rank={1} totalFiltered={5} onClick={() => {}} />
    );
    expect(getByTestId('row-school-name').textContent).toBe('Aurora State');
    expect(getByTestId('row-subline').textContent).toBe('D2 • MIAA');
    // status pill rendered for currently_recommended
    expect(getByTestId('status-pill').getAttribute('data-status')).toBe('currently_recommended');
    // rank indicator
    expect(getByTestId('row-rank-text').textContent).toBe('1/5');
  });

  it('(c) rank indicator uses N/total format — e.g. 3/5 for the 3rd row of 5', () => {
    const { container } = render(<Harness />);
    const rankTexts = Array.from(container.querySelectorAll('[data-testid="row-rank-text"]'))
      .map(el => el.textContent);
    expect(rankTexts).toEqual(['1/5', '2/5', '3/5', '4/5', '5/5']);
    expect(rankTexts).toContain('3/5');
  });

  it('(d) filtering by Status narrows the list AND re-numbers the rank', () => {
    const { container, getByTestId } = render(<Harness />);
    fireEvent.change(getByTestId('filter-status'), {
      target: { value: 'currently_recommended' },
    });
    const rows = container.querySelectorAll('[data-testid^="shortlist-row-"]');
    expect(rows.length).toBe(1);
    const rankTexts = Array.from(container.querySelectorAll('[data-testid="row-rank-text"]'))
      .map(el => el.textContent);
    expect(rankTexts).toEqual(['1/1']); // re-numbered against filtered total
  });

  it('(e) filtering by Division narrows', () => {
    const { container, getByTestId } = render(<Harness />);
    fireEvent.change(getByTestId('filter-division'), { target: { value: 'D2' } });
    const rows = container.querySelectorAll('[data-testid^="shortlist-row-"]');
    expect(rows.length).toBe(2); // Aurora State + Evergreen Poly
    const names = getRowOrder(container);
    expect(names).toContain('Aurora State');
    expect(names).toContain('Evergreen Poly');
  });

  it('(f) filtering by Conference narrows', () => {
    const { container, getByTestId } = render(<Harness />);
    fireEvent.change(getByTestId('filter-conference'), { target: { value: 'NESCAC' } });
    const rows = container.querySelectorAll('[data-testid^="shortlist-row-"]');
    expect(rows.length).toBe(1);
    const rankTexts = Array.from(container.querySelectorAll('[data-testid="row-rank-text"]'))
      .map(el => el.textContent);
    expect(rankTexts).toEqual(['1/1']);
  });

  describe('(g) sorting — first row differs from baseline per sort key', () => {
    // Baseline is name_asc — first row is Aurora State.
    const BASELINE_FIRST = 'Aurora State';

    it('name_desc: first row is not Aurora State (Z->A order)', () => {
      const { container, getByTestId } = render(<Harness />);
      fireEvent.change(getByTestId('sort-by'), { target: { value: 'name_desc' } });
      const first = getRowOrder(container)[0];
      expect(first).not.toBe(BASELINE_FIRST);
      expect(first).toBe('Evergreen Poly'); // lexical tail
    });

    it('added_newest: first row is the most recently added (Delphi Tech, 2026-03-03)', () => {
      const { container, getByTestId } = render(<Harness />);
      fireEvent.change(getByTestId('sort-by'), { target: { value: 'added_newest' } });
      expect(getRowOrder(container)[0]).toBe('Delphi Tech');
    });

    it('dist_asc: first row is the closest (Brookside, 50 mi)', () => {
      const { container, getByTestId } = render(<Harness />);
      fireEvent.change(getByTestId('sort-by'), { target: { value: 'dist_asc' } });
      expect(getRowOrder(container)[0]).toBe('Brookside College');
    });

    it('droi_desc: first row has highest DROI (Crestline U, 5.8x)', () => {
      const { container, getByTestId } = render(<Harness />);
      fireEvent.change(getByTestId('sort-by'), { target: { value: 'droi_desc' } });
      expect(getRowOrder(container)[0]).toBe('Crestline U');
    });

    it('net_cost_asc: first row has lowest net cost (Crestline U, $18k)', () => {
      const { container, getByTestId } = render(<Harness />);
      fireEvent.change(getByTestId('sort-by'), { target: { value: 'net_cost_asc' } });
      expect(getRowOrder(container)[0]).toBe('Crestline U');
    });

    it('payback_asc: first row has fastest payback (Crestline U, 4.2 yr)', () => {
      const { container, getByTestId } = render(<Harness />);
      fireEvent.change(getByTestId('sort-by'), { target: { value: 'payback_asc' } });
      expect(getRowOrder(container)[0]).toBe('Crestline U');
    });
  });

  it('(h) row click fires the onClick handler with the full item', () => {
    const handler = vi.fn();
    const { getByTestId } = render(<Harness onRowClick={handler} />);
    fireEvent.click(getByTestId('shortlist-row-1001'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].unitid).toBe(1001);
    expect(handler.mock.calls[0][0].school_name).toBe('Aurora State');
  });

  it('(i) StatusPill renders with the correct status key (regression guard — not not_evaluated)', () => {
    const { getByTestId } = render(
      <ShortlistRow item={FIXTURES[2]} rank={1} totalFiltered={1} onClick={() => {}} />
    );
    const pill = getByTestId('status-pill');
    expect(pill.getAttribute('data-status')).toBe('out_of_academic_reach');
    expect(pill.getAttribute('data-status')).not.toBe('not_evaluated');
  });

  it('(j) null grit_fit_status + empty labels => no pill rendered (A-2)', () => {
    const { queryByTestId } = render(
      <ShortlistRow item={FIXTURES[4]} rank={1} totalFiltered={1} onClick={() => {}} />
    );
    expect(queryByTestId('status-pill')).toBeNull();
  });

  it('(k) pickPrimaryStatus prefers grit_fit_labels over grit_fit_status, ordered by STATUS_ORDER', () => {
    // Item with multiple labels — STATUS_ORDER puts currently_recommended first,
    // then out_of_academic_reach, then below_academic_fit.
    const multi = {
      grit_fit_status: 'below_academic_fit',
      grit_fit_labels: ['below_academic_fit', 'out_of_academic_reach', 'currently_recommended'],
    };
    expect(pickPrimaryStatus(multi)).toBe('currently_recommended');

    // Fallback to grit_fit_status when labels empty
    expect(pickPrimaryStatus({ grit_fit_status: 'below_athletic_fit', grit_fit_labels: [] }))
      .toBe('below_athletic_fit');

    // Nothing
    expect(pickPrimaryStatus({ grit_fit_status: null, grit_fit_labels: [] })).toBe('');
  });

  it('(l) keyboard Enter on a row also fires onClick (a11y)', () => {
    const handler = vi.fn();
    const { getByTestId } = render(<Harness onRowClick={handler} />);
    const row = getByTestId('shortlist-row-1001');
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
