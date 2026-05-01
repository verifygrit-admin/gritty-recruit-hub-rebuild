/**
 * RecruitsFilterBar — Sprint 011 D5
 *
 * Controlled filter row above the card grid. Renders one search input
 * plus three select dropdowns (position, class year, sort). Owns no
 * state; reads `filters` from props, dispatches changes via `onChange`
 * with the merged filter object.
 *
 * Sort options are fixed at three (per spec D5 line 141): Name A-Z,
 * Name Z-A, Class Year. Stat-based sorting is descoped this sprint.
 *
 * Token-only styling. Zero hardcoded brand hex literals.
 */

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'class-year', label: 'Class Year' },
];

const labelStyle = {
  fontFamily: 'var(--gf-body)',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--gf-light-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginRight: 'var(--gf-space-sm)',
};

const inputStyle = {
  fontFamily: 'var(--gf-body)',
  background: 'var(--gf-light-bg-elev)',
  border: '1px solid var(--gf-light-border)',
  borderRadius: 'var(--gf-radius-sm)',
  padding: '0.55rem 0.9rem',
  fontSize: '0.9rem',
  color: 'var(--gf-light-text)',
  transition: 'border-color 0.15s',
};

export default function RecruitsFilterBar({
  filters,
  onChange,
  positions = [],
  classYears = [],
}) {
  const handle = (key) => (e) =>
    onChange({ ...filters, [key]: e.target.value });

  return (
    <div
      data-testid="recruits-filter-bar"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--gf-space-sm)',
        marginBottom: 'var(--gf-space-xl)',
        alignItems: 'center',
        fontFamily: 'var(--gf-body)',
      }}
    >
      {/* D7 — touch-target floor at <=768px viewport (WCAG 2.5.5).
          Desktop sizing matches prototype. */}
      <style>{`
        @media (max-width: 768px) {
          .recruits-filter-input {
            min-height: 44px;
          }
        }
      `}</style>
      <span style={labelStyle}>Search</span>
      <input
        data-testid="rfb-search"
        type="search"
        className="recruits-filter-input"
        value={filters.search}
        onChange={handle('search')}
        placeholder="Filter by name…"
        style={{ ...inputStyle, minWidth: 240 }}
      />

      <span style={labelStyle}>Position</span>
      <select
        data-testid="rfb-position"
        value={filters.position}
        onChange={handle('position')}
        className="recruits-filter-input"
        style={inputStyle}
      >
        {[{ value: '', label: 'All positions' }, ...positions.map((p) => ({ value: p, label: p }))].map((o) => (
          <option key={o.value || 'all'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <span style={labelStyle}>Class Year</span>
      <select
        data-testid="rfb-class-year"
        value={filters.classYear}
        onChange={handle('classYear')}
        className="recruits-filter-input"
        style={inputStyle}
      >
        {[{ value: '', label: 'All years' }, ...classYears.map((y) => ({ value: String(y), label: `Class ${y}` }))].map((o) => (
          <option key={o.value || 'all'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <span style={labelStyle}>Sort</span>
      <select
        data-testid="rfb-sort"
        value={filters.sort}
        onChange={handle('sort')}
        className="recruits-filter-input"
        style={inputStyle}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
