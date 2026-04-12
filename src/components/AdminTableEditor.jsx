import { useState, useMemo } from 'react';
import usePORTooltip from '../hooks/usePORTooltip.js';
import PORTooltip from './PORTooltip.jsx';

// AdminTableEditor — Generic, reusable bulk-edit table for the admin panel.
// Decision 2: All 8 admin tables share this single component via column configs.
// Decision 3: NO Supabase calls. TODO comments mark where wiring will go.
// Decision 6: Sortable columns — local in-memory array sort only.
//
// Props:
//   columns    — Array<{ key: string, label: string, editable: boolean, width?: string }>
//   rows       — Array<Record<string, any>> — data to display
//   rowKey     — string — unique identifier field (e.g., 'id', 'unitid')
//   tableName  — string — display name for loading/empty states
//   loading    — boolean
//   loadError  — string
//   onRetry    — () => void
//   isDesktop  — boolean — from useIsDesktop hook (controls edit mode visibility)
//   onRowClick — (row) => void — optional callback when a row is clicked (opens slide-out form)
//   porConfig  — { tabContext: string, getTooltipData: (row) => object } — optional POR tooltip

export default function AdminTableEditor({
  columns,
  rows,
  rowKey = 'id',
  tableName = 'records',
  loading = false,
  loadError = '',
  onRetry,
  isDesktop = true,
  onRowClick,
  porConfig,
}) {
  // --- POR tooltip hook (spec: POR_TOOLTIP_COMPONENT_SPEC.md) ---
  const por = usePORTooltip();

  // --- Sort state (Decision 6) ---
  // Local only — no query params, no URL state, no Supabase ORDER BY.
  const [sortConfig, setSortConfig] = useState(null); // { key, direction: 'asc'|'desc' }

  // --- Edit state ---
  const [editingCellKey, setEditingCellKey] = useState(null); // 'rowId:colKey'
  const [editValue, setEditValue] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // --- Local data (copy of rows for optimistic updates) ---
  // When rows prop changes (parent re-fetches), localRows resets.
  const [localRows, setLocalRows] = useState(rows);
  const rowsFingerprint = rows.length + (rows[0]?.[rowKey] ?? '');
  useMemo(() => {
    setLocalRows(rows);
  }, [rowsFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Sorted rows (Decision 6: local in-memory sort) ---
  const sortedRows = useMemo(() => {
    if (!sortConfig) return localRows;
    const { key, direction } = sortConfig;
    return [...localRows].sort((a, b) => {
      const aVal = a[key] ?? '';
      const bVal = b[key] ?? '';
      // Numeric comparison if both values parse as numbers
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aVal !== '' && bVal !== '') {
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      // String comparison (case-insensitive)
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [localRows, sortConfig]);

  // --- Sort handler ---
  const handleSort = (colKey) => {
    setSortConfig((prev) => {
      if (prev?.key === colKey) {
        return { key: colKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key: colKey, direction: 'asc' };
    });
  };

  // --- Cell key helper ---
  const cellKey = (rowId, colKey) => `${rowId}:${colKey}`;

  // --- Edit handlers ---
  const beginEdit = (row, colKey) => {
    if (!isDesktop) return; // Decision 4/mobile rule: no edit on mobile
    setEditingCellKey(cellKey(row[rowKey], colKey));
    setEditValue(row[colKey] ?? '');
  };

  const cancelEdit = () => {
    setEditingCellKey(null);
    setEditValue('');
  };

  const saveEdit = (row, colKey) => {
    const original = row[colKey] ?? '';
    if (editValue === String(original)) {
      cancelEdit();
      return;
    }

    // Optimistic local update
    setLocalRows((prev) =>
      prev.map((r) =>
        r[rowKey] === row[rowKey] ? { ...r, [colKey]: editValue } : r
      )
    );

    // TODO: Wire to Supabase Edge Function for persistence + audit trail.
    // When wired, this will call the table-specific Edge Function:
    //   PUT /functions/v1/admin-update-<table>
    //   Body: { [rowKey]: row[rowKey], column: colKey, new_value: editValue, admin_email }
    // The Edge Function writes the audit trail server-side.

    setEditingCellKey(null);
    setEditValue('');
    setSuccessMessage('Saved');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleKeyDown = (e, row, colKey) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(row, colKey);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div
        data-testid={`${tableName}-table-loading`}
        style={{ padding: 48, textAlign: 'center', color: '#6B6B6B', fontSize: '0.875rem' }}
        aria-live="polite"
      >
        Loading {tableName}...
      </div>
    );
  }

  // --- Error state ---
  if (loadError) {
    return (
      <div
        data-testid={`${tableName}-table-error`}
        style={{
          padding: 24,
          backgroundColor: '#FFF5F5',
          border: '1px solid #F44336',
          borderRadius: 4,
          color: '#C62828',
          fontSize: '0.9rem',
          margin: 24,
        }}
      >
        <strong>Error:</strong> {loadError}
        {onRetry && (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              data-testid={`${tableName}-table-retry`}
              onClick={onRetry}
              style={{
                padding: '8px 16px',
                backgroundColor: '#8B3A3A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 700,
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- Empty state ---
  if (!sortedRows.length) {
    return (
      <div
        data-testid={`${tableName}-table-empty`}
        style={{ padding: 48, textAlign: 'center', color: '#6B6B6B', fontSize: '0.875rem' }}
      >
        No {tableName} found.
      </div>
    );
  }

  // --- POR tooltip data for active row ---
  const porActiveRow = porConfig && por.activeRowId != null
    ? sortedRows.find((r) => r[rowKey] === por.activeRowId)
    : null;
  const porData = porActiveRow ? porConfig.getTooltipData(porActiveRow) : null;

  return (
    <div data-testid={`${tableName}-table-editor`} style={{ padding: 24, position: 'relative' }}>
      <h3
        style={{
          fontSize: '1.5rem',
          color: '#2C2C2C',
          margin: '0 0 8px 0',
          fontWeight: 700,
        }}
      >
        {tableName.charAt(0).toUpperCase() + tableName.slice(1)}
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#6B6B6B', margin: '0 0 16px 0' }}>
        {sortedRows.length} rows.
        {isDesktop && columns.some((c) => c.editable) && ' Click an editable cell to edit.'}
        {!isDesktop && ' Read-only on mobile.'}
      </p>

      {/* Success toast */}
      {successMessage && (
        <div
          data-testid={`${tableName}-table-success-toast`}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor: '#2E7D32',
            color: '#FFFFFF',
            padding: '10px 16px',
            borderRadius: 4,
            fontSize: '0.875rem',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 9998,
          }}
          aria-live="polite"
        >
          {successMessage}
        </div>
      )}

      {/* Table container — shared scroll wrapper (OBJ-3) */}
      <div className="admin-scroll-wrap">
        <table
          data-testid={`${tableName}-table`}
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
            color: '#2C2C2C',
          }}
        >
          {/* Sticky sortable headers (Decision 6) */}
          <thead>
            <tr style={{ backgroundColor: '#F5F5F5', borderBottom: '2px solid #D4D4D4' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  data-testid={`${tableName}-th-${col.key}`}
                  onClick={() => handleSort(col.key)}
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontWeight: 700,
                    color: '#2C2C2C',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    userSelect: 'none',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: '#F5F5F5',
                    width: col.width || 'auto',
                  }}
                >
                  {col.label}
                  {col.editable && isDesktop && (
                    <span style={{ color: '#8B3A3A', marginLeft: 4, fontSize: '0.7rem' }}>
                      (editable)
                    </span>
                  )}
                  {sortConfig?.key === col.key && (
                    <span
                      style={{ marginLeft: 4, fontSize: '0.7rem' }}
                      aria-label={`Sorted ${sortConfig.direction === 'asc' ? 'ascending' : 'descending'}`}
                    >
                      {sortConfig.direction === 'asc' ? ' \u25B2' : ' \u25BC'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table body */}
          <tbody>
            {sortedRows.map((row) => (
              <tr
                key={row[rowKey]}
                tabIndex={porConfig ? 0 : undefined}
                aria-describedby={porConfig && por.activeRowId === row[rowKey] ? 'por-tooltip' : undefined}
                style={{
                  borderBottom: '1px solid #E8E8E8',
                  cursor: onRowClick ? 'pointer' : 'default',
                  outline: 'none',
                }}
                onClick={() => {
                  // Only fire row click if not currently editing a cell
                  if (!editingCellKey && onRowClick) onRowClick(row);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FAFAFA';
                  if (porConfig) por.onRowMouseEnter(row[rowKey], e);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                  if (porConfig) por.onRowMouseLeave();
                }}
                onTouchStart={porConfig ? (e) => por.onRowTouchStart(row[rowKey], e) : undefined}
                onTouchEnd={porConfig ? por.onRowTouchEnd : undefined}
                onFocus={porConfig ? (e) => {
                  por.onRowFocus(row[rowKey], e);
                  e.currentTarget.style.outline = '2px solid #8B3A3A';
                  e.currentTarget.style.outlineOffset = '-2px';
                } : undefined}
                onBlur={porConfig ? (e) => {
                  por.onRowBlur();
                  e.currentTarget.style.outline = '';
                  e.currentTarget.style.outlineOffset = '';
                } : undefined}
              >
                {columns.map((col) => {
                  const key = cellKey(row[rowKey], col.key);
                  const isEditing = editingCellKey === key;

                  // Read-only cell (non-editable column or mobile viewport)
                  if (!col.editable || !isDesktop) {
                    return (
                      <td
                        key={col.key}
                        style={{
                          padding: '10px 12px',
                          verticalAlign: 'top',
                          width: col.width || 'auto',
                        }}
                      >
                        {row[col.key] ?? ''}
                      </td>
                    );
                  }

                  // Editable cell (desktop only)
                  return (
                    <td
                      key={col.key}
                      data-testid={`${tableName}-cell-${col.key}-${row[rowKey]}`}
                      style={{
                        padding: '10px 12px',
                        verticalAlign: 'top',
                        cursor: isEditing ? 'default' : 'pointer',
                        backgroundColor: isEditing ? '#FFF8E1' : 'transparent',
                        width: col.width || 'auto',
                        transition: 'background 200ms ease',
                      }}
                      onClick={() => {
                        if (!isEditing) beginEdit(row, col.key);
                      }}
                    >
                      {isEditing ? (
                        <div>
                          <input
                            type="text"
                            data-testid={`${tableName}-edit-input-${col.key}-${row[rowKey]}`}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, row, col.key)}
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #8B3A3A',
                              borderRadius: 4,
                              fontSize: '0.875rem',
                              color: '#2C2C2C',
                              outline: 'none',
                            }}
                          />
                          <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              data-testid={`${tableName}-save-${col.key}-${row[rowKey]}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                saveEdit(row, col.key);
                              }}
                              style={{
                                padding: '4px 10px',
                                backgroundColor: '#8B3A3A',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              data-testid={`${tableName}-cancel-${col.key}-${row[rowKey]}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEdit();
                              }}
                              style={{
                                padding: '4px 10px',
                                backgroundColor: '#FFFFFF',
                                color: '#6B6B6B',
                                border: '1px solid #D4D4D4',
                                borderRadius: 4,
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span>
                          {row[col.key] || (
                            <em style={{ color: '#9E9E9E' }}>(empty)</em>
                          )}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* POR Tooltip — renders when porConfig provided and a row is active */}
      {porConfig && por.activeRowId != null && porData && (
        <PORTooltip
          tabContext={porConfig.tabContext}
          data={porData}
          triggerRect={por.triggerRect}
          onMouseEnter={por.onTooltipMouseEnter}
          onMouseLeave={por.onTooltipMouseLeave}
        />
      )}
    </div>
  );
}
