/**
 * GRIT FIT Table View — sortable, paginated table of matched schools.
 * UX Spec: COMPONENT 4 — Table View
 */
import { useState, useMemo } from 'react';
import { TIER_LABELS } from '../lib/constants.js';

const headerStyle = {
  padding: '12px 16px', textAlign: 'left', fontSize: '0.875rem',
  fontWeight: 600, color: '#2C2C2C', backgroundColor: '#F5EFE0',
  cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
  borderBottom: '2px solid #D4D4D4',
};

const cellStyle = {
  padding: '12px 16px', fontSize: '0.875rem', color: '#2C2C2C',
  verticalAlign: 'middle',
};

function formatMoney(v) {
  if (v == null) return 'N/A';
  return '$' + Math.round(v).toLocaleString();
}

const COLUMNS = [
  { key: 'matchRank', label: 'Rank', width: 60, sortType: 'number' },
  { key: 'school_name', label: 'School Name', width: 250, sortType: 'string' },
  { key: 'type', label: 'Div', width: 80, sortType: 'string' },
  { key: 'conference', label: 'Conf', width: 100, sortType: 'string' },
  { key: 'state', label: 'State', width: 60, sortType: 'string' },
  { key: 'dist', label: 'Distance', width: 80, sortType: 'number' },
  { key: 'adltv', label: 'ADTLV', width: 100, sortType: 'number' },
  { key: 'netCost', label: 'Your Annual Cost', width: 130, sortType: 'number' },
];

export default function GritFitTableView({
  results,           // filtered top30 array (scored objects)
  shortlistIds,      // Set<unitid>
  onAddToShortlist,  // (school) => void
}) {
  const [sortKey, setSortKey] = useState('matchRank');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  // Sort results
  const sorted = useMemo(() => {
    if (!results) return [];
    const arr = [...results];
    const col = COLUMNS.find(c => c.key === sortKey);
    arr.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (col?.sortType === 'number') {
        aVal = aVal == null ? -Infinity : +aVal;
        bVal = bVal == null ? -Infinity : +bVal;
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [results, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const pageResults = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'acadScore' ? 'desc' : 'asc');
    }
  };

  const handleRowsChange = (e) => {
    setRowsPerPage(+e.target.value);
    setPage(1);
  };

  const renderSortIndicator = (key) => {
    if (sortKey !== key) return <span style={{ visibility: 'hidden', marginLeft: 4 }}>{'\u2191'}</span>;
    return <span style={{ color: '#D4AF37', marginLeft: 4 }}>{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>;
  };

  // ── Mobile card layout ──
  if (isMobile) {
    return (
      <div data-testid="grit-fit-results">
        {sorted.map((school, i) => {
          const inList = shortlistIds.has(school.unitid);
          return (
            <div
              key={school.unitid}
              data-testid={`result-card-${school.matchRank}`}
              style={{
                backgroundColor: '#FFFFFF', border: '1px solid #E8E8E8',
                padding: 16, margin: '8px 0', borderRadius: 8,
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ margin: '0 0 4px', fontSize: '1.125rem', color: '#8B3A3A' }}>
                Rank {school.matchRank}. {school.school_name}
              </h3>
              <p style={{ margin: '0 0 12px', fontSize: '0.875rem', color: '#6B6B6B' }}>
                {school.conference || ''} | {TIER_LABELS[school.type]?.short || school.type}
              </p>
              <p style={{ margin: '2px 0', fontSize: '0.875rem' }}>Distance: {school.dist} mi</p>
              <p style={{ margin: '2px 0', fontSize: '0.875rem' }}>
                ADTLV: {formatMoney(school.adltv)}
              </p>
              <p style={{ margin: '2px 0 12px', fontSize: '0.875rem' }}>
                Your Annual Cost: {formatMoney(school.netCost != null ? school.netCost / 4 : null)}
              </p>
              <button
                data-testid="add-to-shortlist-btn"
                data-school-id={school.unitid}
                disabled={inList}
                onClick={() => !inList && onAddToShortlist(school)}
                style={{
                  width: '100%', height: 44, border: 'none', borderRadius: 4,
                  fontSize: '0.875rem', fontWeight: 600, cursor: inList ? 'default' : 'pointer',
                  backgroundColor: inList ? '#E8E8E8' : '#D4AF37',
                  color: inList ? '#6B6B6B' : '#8B3A3A',
                }}
              >
                {inList ? '\u2713 In Shortlist' : '+ Add to Shortlist'}
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Desktop table layout ──
  return (
    <div data-testid="grit-fit-results">
      <div style={{ overflowX: 'auto' }}>
        <table
          data-testid="results-table"
          style={{
            width: '100%', borderCollapse: 'collapse',
            margin: '24px 0', backgroundColor: '#FFFFFF',
          }}
        >
          <thead>
            <tr data-testid="table-header-row">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  data-testid={`header-${col.key === 'matchRank' ? 'rank' : col.key === 'school_name' ? 'school' : col.key}`}
                  data-sort={col.key}
                  style={{ ...headerStyle, width: col.width, minWidth: col.width }}
                  onClick={() => handleSort(col.key)}
                  aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {col.label}
                  {renderSortIndicator(col.key)}
                </th>
              ))}
              <th style={{ ...headerStyle, width: 140, cursor: 'default' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageResults.map((school, i) => {
              const rowIdx = (page - 1) * rowsPerPage + i;
              const isOdd = rowIdx % 2 === 1;
              const inList = shortlistIds.has(school.unitid);
              return (
                <tr
                  key={school.unitid}
                  data-testid={`result-row-${school.matchRank}`}
                  style={{
                    backgroundColor: isOdd ? '#F5EFE0' : '#FFFFFF',
                    height: 64,
                    borderBottom: '1px solid #E8E8E8',
                    transition: 'background-color 150ms',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF5F0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isOdd ? '#F5EFE0' : '#FFFFFF'}
                >
                  <td data-testid="rank-cell" style={cellStyle}>{school.matchRank}</td>
                  <td data-testid="school-cell" style={cellStyle}>
                    <strong data-testid="school-name" style={{ color: '#8B3A3A' }}>
                      {school.school_name}
                    </strong>
                    <br />
                    <span data-testid="school-meta" style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>
                      {school.conference || ''}
                    </span>
                  </td>
                  <td data-testid="division-cell" style={cellStyle}>
                    {TIER_LABELS[school.type]?.short || school.type}
                  </td>
                  <td style={cellStyle}>{school.conference || ''}</td>
                  <td style={cellStyle}>{school.state || ''}</td>
                  <td style={cellStyle}>{school.dist != null ? school.dist + ' mi' : 'N/A'}</td>
                  <td style={cellStyle}>
                    {formatMoney(school.adltv)}
                  </td>
                  <td style={cellStyle}>
                    {formatMoney(school.netCost != null ? school.netCost / 4 : null)}
                  </td>
                  <td data-testid="action-cell" style={cellStyle}>
                    <button
                      data-testid="add-to-shortlist-btn"
                      data-school-id={school.unitid}
                      disabled={inList}
                      onClick={() => !inList && onAddToShortlist(school)}
                      style={{
                        width: 120, height: 36, border: 'none', borderRadius: 4,
                        fontSize: '0.8rem', fontWeight: 600,
                        cursor: inList ? 'default' : 'pointer',
                        backgroundColor: inList ? '#E8E8E8' : '#D4AF37',
                        color: inList ? '#6B6B6B' : '#8B3A3A',
                        transition: 'background-color 150ms',
                      }}
                    >
                      {inList ? '\u2713 In Shortlist' : 'Add to Shortlist'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {pageResults.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...cellStyle, textAlign: 'center', padding: 32, color: '#6B6B6B' }}>
                  No schools match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div
        data-testid="pagination-container"
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12, padding: '8px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.875rem', color: '#2C2C2C' }}>Rows:</span>
          <select
            data-testid="rows-per-page"
            value={rowsPerPage}
            onChange={handleRowsChange}
            style={{
              padding: '4px 8px', border: '1px solid #D4D4D4', borderRadius: 4,
              fontSize: '0.875rem',
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <span data-testid="pagination-info" style={{ fontSize: '0.875rem', color: '#6B6B6B' }}>
          Showing {sorted.length > 0 ? (page - 1) * rowsPerPage + 1 : 0} to{' '}
          {Math.min(page * rowsPerPage, sorted.length)} of {sorted.length} results
        </span>

        <div data-testid="pagination-controls" style={{ display: 'flex', gap: 4 }}>
          <button
            data-testid="prev-page"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{
              padding: '6px 12px', border: '1px solid #D4D4D4', borderRadius: 4,
              fontSize: '0.875rem', cursor: page <= 1 ? 'default' : 'pointer',
              backgroundColor: page <= 1 ? '#F5F5F5' : '#FFFFFF',
              color: page <= 1 ? '#6B6B6B' : '#2C2C2C',
            }}
          >
            {'\u2039'} Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              data-testid={`page-${p}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => setPage(p)}
              style={{
                padding: '6px 12px', border: '1px solid #D4D4D4', borderRadius: 4,
                fontSize: '0.875rem', cursor: 'pointer', minWidth: 36,
                backgroundColor: p === page ? '#8B3A3A' : '#FFFFFF',
                color: p === page ? '#FFFFFF' : '#2C2C2C',
              }}
            >
              {p}
            </button>
          ))}
          <button
            data-testid="next-page"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{
              padding: '6px 12px', border: '1px solid #D4D4D4', borderRadius: 4,
              fontSize: '0.875rem', cursor: page >= totalPages ? 'default' : 'pointer',
              backgroundColor: page >= totalPages ? '#F5F5F5' : '#FFFFFF',
              color: page >= totalPages ? '#6B6B6B' : '#2C2C2C',
            }}
          >
            Next {'\u203A'}
          </button>
        </div>
      </div>
    </div>
  );
}
