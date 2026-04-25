/**
 * ShortlistFilters — filter bar and sort dropdown for shortlist.
 * UX Spec: UX_SPEC_SHORTLIST.md — Filter Bar section
 *
 * Props:
 *   items: full shortlist array (for deriving conference options)
 *   filters: { status, division, conference }
 *   sortBy: string
 *   onFilterChange: (newFilters) => void
 *   onSortChange: (sortBy) => void
 *   filteredCount: number
 *   totalCount: number
 */
import { useMemo } from 'react';
import { STATUS_LABELS, STATUS_ORDER } from '../lib/statusLabels.js';

// Sprint 004 S2 — consume SC-2 single source of truth for status filter
// options. STATUS_ORDER mirrors LABEL_PRIORITY; STATUS_LABELS carries the
// display strings. Previous local map retired to prevent drift.
const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  ...STATUS_ORDER.map((key) => ({ value: key, label: STATUS_LABELS[key].label })),
];

// Values must match what is stored in short_list_items.div
// (written from schools.type — the 5-way tier taxonomy: Power 4, G6, FCS, D2, D3).
const DIVISION_OPTIONS = [
  { value: '', label: 'All Divisions' },
  { value: 'Power 4', label: 'Power 4' },
  { value: 'G6', label: 'G6' },
  { value: 'FCS', label: 'FCS' },
  { value: 'D2', label: 'D2' },
  { value: 'D3', label: 'D3' },
];

// Sprint 005 D5 \u2014 six sort modes per the dynamic ranking column spec.
// Tie-break across ALL six modes is a stable secondary sort by name ASC
// (operator decision; including Date Added \u2014 do NOT tie-break by timestamp
// precision). See ShortlistPage.jsx sortedItems memo.
const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name (A\u2013Z)' },
  { value: 'added_newest', label: 'Date Added (newest first)' },
  { value: 'dist_asc', label: 'Distance (closest)' },
  { value: 'droi_desc', label: 'Degree ROI (highest)' },
  { value: 'net_cost_asc', label: 'Annual Net Cost (lowest)' },
  { value: 'payback_asc', label: 'Fastest Payback' },
];

const selectStyle = {
  padding: '8px 12px',
  border: '1px solid #D4D4D4',
  borderRadius: 4,
  fontSize: '0.875rem',
  color: '#2C2C2C',
  backgroundColor: '#FFFFFF',
  cursor: 'pointer',
  minWidth: 140,
};

export default function ShortlistFilters({
  items,
  filters,
  sortBy,
  onFilterChange,
  onSortChange,
  filteredCount,
  totalCount,
}) {
  // Derive unique conferences from shortlist items
  const conferenceOptions = useMemo(() => {
    const confs = new Set((items || []).map(i => i.conference).filter(Boolean));
    return [{ value: '', label: 'All Conferences' }, ...Array.from(confs).sort().map(c => ({ value: c, label: c }))];
  }, [items]);

  const hasActiveFilter = filters.status || filters.division || filters.conference;

  return (
    <div
      data-testid="shortlist-filter-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
      }}
    >
      <span style={{ fontSize: '0.875rem', color: '#6B6B6B', fontWeight: 500 }}>Filter:</span>

      <select
        data-testid="filter-status"
        value={filters.status}
        onChange={e => onFilterChange({ ...filters, status: e.target.value })}
        style={selectStyle}
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        data-testid="filter-division"
        value={filters.division}
        onChange={e => onFilterChange({ ...filters, division: e.target.value })}
        style={selectStyle}
        aria-label="Filter by division"
      >
        {DIVISION_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        data-testid="filter-conference"
        value={filters.conference}
        onChange={e => onFilterChange({ ...filters, conference: e.target.value })}
        style={selectStyle}
        aria-label="Filter by conference"
      >
        {conferenceOptions.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {hasActiveFilter && (
        <button
          data-testid="clear-filters"
          onClick={() => onFilterChange({ status: '', division: '', conference: '' })}
          style={{
            background: 'none',
            border: 'none',
            color: '#8B3A3A',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Clear all filters
        </button>
      )}

      <span style={{ fontSize: '0.875rem', color: '#D4D4D4', margin: '0 4px' }}>|</span>

      <span style={{ fontSize: '0.875rem', color: '#6B6B6B', fontWeight: 500 }}>Sort by:</span>

      <select
        data-testid="sort-by"
        value={sortBy}
        onChange={e => onSortChange(e.target.value)}
        style={selectStyle}
        aria-label="Sort shortlist"
      >
        {SORT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Count indicator when filtered */}
      {hasActiveFilter && filteredCount !== totalCount && (
        <span style={{ fontSize: '0.8125rem', color: '#6B6B6B', marginLeft: 'auto' }}>
          Showing {filteredCount} of {totalCount}
        </span>
      )}
    </div>
  );
}
