/**
 * GRIT FIT Action Bar — Recalculate button, school count, filter dropdowns, search.
 * UX Spec: COMPONENT 2 — Action Bar
 * Sprint 003 D3 — adds the "Recruiting List" dropdown (All Schools / My Grit Fit / My Short List).
 */
import { useMemo } from 'react';
import { RECRUITING_LIST_OPTIONS } from '../lib/map/recruitingListFilter.js';

const dropdownBase = {
  padding: '12px 16px', border: '1px solid #D4D4D4', borderRadius: 4,
  fontSize: '1rem', color: '#2C2C2C', backgroundColor: '#FFFFFF',
  cursor: 'pointer', outline: 'none',
};

export default function GritFitActionBar({
  results,         // top30 array
  allSchools,      // all 662 schools
  filters,         // { conference, division, state, search, recruitingList }
  onFilterChange,  // (newFilters) => void
  onRecalculate,   // () => void
  recalculating,   // boolean
}) {
  const recruitingList = filters.recruitingList || 'all';
  const matchCount = results?.length || 0;
  const totalSchools = allSchools?.length || 662;

  // Derive filter options from the superset (allSchools) so Competition Level
  // / Conference / State dropdowns cover the full map when Recruiting List =
  // "All Schools". Falls back to results if allSchools is unavailable.
  const optionSource = (allSchools && allSchools.length) ? allSchools : (results || []);

  const conferences = useMemo(() => {
    const set = new Set(optionSource.map(s => s.conference).filter(Boolean));
    return [...set].sort();
  }, [optionSource]);

  const divisions = useMemo(() => {
    return ['Power 4', 'G6', 'FCS', 'D2', 'D3'];
  }, []);

  const states = useMemo(() => {
    const set = new Set(optionSource.map(s => s.state).filter(Boolean));
    return [...set].sort();
  }, [optionSource]);

  const hasActiveFilters =
    filters.conference || filters.division || filters.state || filters.search ||
    (filters.recruitingList && filters.recruitingList !== 'all');

  const handleClear = () => {
    onFilterChange({ conference: '', division: '', state: '', search: '', recruitingList: 'all' });
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Row 1: Recalculate + School Count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        <button
          data-testid="recalculate-button"
          onClick={onRecalculate}
          disabled={recalculating}
          style={{
            padding: '12px 24px',
            backgroundColor: recalculating ? '#E8E8E8' : '#D4AF37',
            color: recalculating ? '#6B6B6B' : '#2C2C2C',
            border: 'none',
            borderRadius: 4,
            fontSize: '1rem',
            fontWeight: 500,
            cursor: recalculating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'background-color 150ms ease-in-out',
          }}
        >
          {recalculating ? 'Calculating...' : '\u27F2 Recalculate'}
        </button>

        <span data-testid="school-count" style={{ color: '#6B6B6B', fontSize: '0.875rem' }}>
          Showing {matchCount} of {totalSchools} schools ({matchCount} GRIT FIT matches)
        </span>

        {hasActiveFilters && (
          <button
            data-testid="clear-filters-link"
            onClick={handleClear}
            style={{
              background: 'none', border: 'none', textDecoration: 'underline',
              color: '#8B3A3A', fontSize: '0.875rem', cursor: 'pointer', padding: 0,
            }}
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Row 2: Filter dropdowns + search */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          data-testid="filter-recruiting-list"
          value={recruitingList}
          onChange={(e) => onFilterChange({ ...filters, recruitingList: e.target.value })}
          style={{ ...dropdownBase, borderColor: '#8B3A3A', fontWeight: 600 }}
          aria-label="Recruiting List filter"
        >
          {RECRUITING_LIST_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          data-testid="filter-conference"
          value={filters.conference}
          onChange={(e) => onFilterChange({ ...filters, conference: e.target.value })}
          style={dropdownBase}
        >
          <option value="">All Conferences</option>
          {conferences.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          data-testid="filter-division"
          value={filters.division}
          onChange={(e) => onFilterChange({ ...filters, division: e.target.value })}
          style={dropdownBase}
          aria-label="Competition Level filter"
        >
          <option value="">All Competition Levels</option>
          {divisions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          data-testid="filter-state"
          value={filters.state}
          onChange={(e) => onFilterChange({ ...filters, state: e.target.value })}
          style={dropdownBase}
        >
          <option value="">All States</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 200 }}>
          <input
            type="text"
            data-testid="search-schools"
            placeholder="Search by school name or location..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            style={{
              ...dropdownBase,
              width: '100%',
              boxSizing: 'border-box',
              paddingLeft: 36,
            }}
          />
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: '1rem', color: '#6B6B6B', pointerEvents: 'none',
          }}>
            &#x1F50D;
          </span>
        </div>
      </div>
    </div>
  );
}
