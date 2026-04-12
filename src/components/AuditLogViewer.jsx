import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import usePORTooltip from '../hooks/usePORTooltip.js';
import PORTooltip from './PORTooltip.jsx';

// AuditLogViewer — Section D, Component 4
// Read-only tabular view of the admin_audit_log table.
// Reads exclusively through the Edge Function stub (Patch owns Section C):
//   GET /functions/v1/admin-read-audit-log
//
// Schema note: admin_audit_log does not exist yet. The column list below is the
// intended schema agreed upstream by Chris. Morty + Patch + David finalize the
// schema in their three-way session — the column config array at the top of this
// file is the single point of change when the final schema lands.

// Column config — update this array only when the finalized schema lands.
// { key, label, type }
//   type: 'text' | 'datetime' | 'json' — drives the render path for each cell
const AUDIT_COLUMNS = [
  { key: 'created_at', label: 'Time', type: 'datetime' },
  { key: 'admin_email', label: 'Admin', type: 'text' },
  { key: 'action', label: 'Action', type: 'text' },
  { key: 'table_name', label: 'Table', type: 'text' },
  { key: 'row_id', label: 'Row ID', type: 'text' },
  { key: 'old_value', label: 'Old Value', type: 'json' },
  { key: 'new_value', label: 'New Value', type: 'json' },
];

const TRUNCATE_LENGTH = 100;

// Safe render of any value as a display string.
// Scout Note 6: use JSON.stringify for truncation so this works whether the
// finalized schema stores old_value/new_value as text or JSONB.
function renderJsonTruncated(value) {
  if (value == null) return '';
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if (serialized.length > TRUNCATE_LENGTH) {
    return { truncated: true, display: serialized.substring(0, TRUNCATE_LENGTH) + '...', full: serialized };
  }
  return { truncated: false, display: serialized, full: serialized };
}

function renderDatetime(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

// --- POR tooltip config (spec §1.5.5) ---
// Field names PROVISIONAL per POR_TOOLTIP_COMPONENT_SPEC.md §1 standing declaration.
// id (uuid PK) is SUPPRESSED — used as row key only, never surfaced in tooltip content.
function computeChangesSummary(oldValue, newValue) {
  try {
    const oldObj = typeof oldValue === 'string' ? JSON.parse(oldValue) : oldValue;
    const newObj = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;
    if (!oldObj || !newObj || typeof oldObj !== 'object' || typeof newObj !== 'object') return null;
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    let diffCount = 0;
    for (const k of allKeys) {
      if (JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k])) diffCount += 1;
    }
    return diffCount === 0 ? null : `${diffCount} field${diffCount === 1 ? '' : 's'} changed`;
  } catch {
    return null;
  }
}

const POR_CONFIG = {
  tabContext: 'audit-log',
  getTooltipData: (row) => ({
    title: row.action
      ? `${row.action} on ${row.table_name || 'unknown'}`
      : `Entry #${(row.id && typeof row.id === 'string') ? row.id.slice(0, 8) : '?'}`,
    actionType: row.action ?? null,
    adminEmail: row.admin_email ?? null,
    tableName: row.table_name ?? null,
    affectedRowId: row.row_id ?? null, // NOT row.id — row.id is suppressed per §1.5.5
    timestamp: row.created_at ?? null,
    changesSummary:
      row.action === 'UPDATE' && row.old_value != null && row.new_value != null
        ? computeChangesSummary(row.old_value, row.new_value)
        : null,
  }),
};

export default function AuditLogViewer() {
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [expandedCell, setExpandedCell] = useState(null); // { rowId, key, fullValue }

  // POR tooltip (spec §1.5.5)
  const por = usePORTooltip();

  const loadAuditLog = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;

      if (!jwt) {
        setLoadError('No active admin session. Please sign in again.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/admin-read-audit-log`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
          'apikey': anonKey,
        },
      });

      if (!res.ok) {
        setLoadError(`Failed to load audit log (HTTP ${res.status}). The admin-read-audit-log Edge Function may not be deployed yet.`);
        setLoading(false);
        return;
      }

      const body = await res.json();
      if (!body?.success) {
        setLoadError(body?.error || 'Failed to load audit log.');
        setLoading(false);
        return;
      }

      // Ensure newest first. Edge Function should already return sorted, but defend here.
      const sorted = [...(body.audit_log || [])].sort((a, b) => {
        const ta = new Date(a.created_at).getTime() || 0;
        const tb = new Date(b.created_at).getTime() || 0;
        return tb - ta;
      });

      setAuditLog(sorted);
      setLoading(false);
    } catch (err) {
      setLoadError('Network error loading audit log. Please try again.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLog();
  }, [loadAuditLog]);

  const openDetail = (rowId, colKey, fullValue) => {
    setExpandedCell({ rowId, key: colKey, fullValue });
  };

  const closeDetail = () => setExpandedCell(null);

  if (loading) {
    return (
      <div
        data-testid="audit-log-loading"
        style={{ padding: 48, textAlign: 'center', color: '#6B6B6B' }}
      >
        Loading audit log...
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        data-testid="audit-log-error"
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
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            data-testid="audit-log-retry"
            onClick={loadAuditLog}
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
      </div>
    );
  }

  return (
    <div data-testid="audit-log-viewer" style={{ padding: 24 }}>
      <h3
        style={{
          fontSize: '1.5rem',
          color: '#2C2C2C',
          margin: '0 0 8px 0',
          fontWeight: 700,
        }}
      >
        Admin Audit Log
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#6B6B6B', margin: '0 0 16px 0' }}>
        {auditLog.length} entries. Read-only. Click any truncated value to expand.
      </p>

      {auditLog.length === 0 ? (
        <div
          data-testid="audit-log-empty"
          style={{
            padding: 24,
            textAlign: 'center',
            color: '#6B6B6B',
            fontSize: '0.875rem',
            border: '1px dashed #D4D4D4',
            borderRadius: 4,
          }}
        >
          No audit log entries yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #E8E8E8', borderRadius: 4 }}>
          <table
            data-testid="audit-log-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem',
              color: '#2C2C2C',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#F5F5F5', borderBottom: '2px solid #D4D4D4' }}>
                {AUDIT_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      fontWeight: 700,
                      color: '#2C2C2C',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditLog.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  aria-describedby={por.activeRowId === row.id ? 'por-tooltip' : undefined}
                  style={{ borderBottom: '1px solid #E8E8E8', verticalAlign: 'top', outline: 'none' }}
                  onMouseEnter={(e) => por.onRowMouseEnter(row.id, e)}
                  onMouseLeave={() => por.onRowMouseLeave()}
                  onTouchStart={(e) => por.onRowTouchStart(row.id, e)}
                  onTouchEnd={() => por.onRowTouchEnd()}
                  onFocus={(e) => {
                    por.onRowFocus(row.id, e);
                    e.currentTarget.style.outline = '2px solid #8B3A3A';
                    e.currentTarget.style.outlineOffset = '-2px';
                  }}
                  onBlur={(e) => {
                    por.onRowBlur();
                    e.currentTarget.style.outline = '';
                    e.currentTarget.style.outlineOffset = '';
                  }}
                >
                  {AUDIT_COLUMNS.map((col) => {
                    const value = row[col.key];

                    if (col.type === 'datetime') {
                      return (
                        <td key={col.key} style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          {renderDatetime(value)}
                        </td>
                      );
                    }

                    if (col.type === 'json') {
                      const rendered = renderJsonTruncated(value);
                      return (
                        <td
                          key={col.key}
                          data-testid={`audit-cell-${col.key}-${row.id}`}
                          style={{
                            padding: '10px 12px',
                            fontFamily: rendered.display ? 'monospace' : 'inherit',
                            fontSize: rendered.display ? '0.8rem' : '0.875rem',
                            cursor: rendered.truncated ? 'pointer' : 'default',
                            color: rendered.truncated ? '#8B3A3A' : '#2C2C2C',
                            maxWidth: 300,
                            wordBreak: 'break-word',
                          }}
                          onClick={() => {
                            if (rendered.truncated) openDetail(row.id, col.key, rendered.full);
                          }}
                          title={rendered.truncated ? 'Click to expand' : ''}
                        >
                          {rendered.display || <em style={{ color: '#9E9E9E', fontFamily: 'inherit' }}>(empty)</em>}
                        </td>
                      );
                    }

                    // Default: text
                    return (
                      <td key={col.key} style={{ padding: '10px 12px', wordBreak: 'break-word' }}>
                        {value ?? ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* POR Tooltip (spec §1.5.5) — renders when a row is hovered/focused */}
      {por.activeRowId != null && (() => {
        const activeRow = auditLog.find((r) => r.id === por.activeRowId);
        if (!activeRow) return null;
        return (
          <PORTooltip
            tabContext={POR_CONFIG.tabContext}
            data={POR_CONFIG.getTooltipData(activeRow)}
            triggerRect={por.triggerRect}
            onMouseEnter={por.onTooltipMouseEnter}
            onMouseLeave={por.onTooltipMouseLeave}
          />
        );
      })()}

      {expandedCell && (
        <div
          data-testid="audit-log-detail-modal"
          role="dialog"
          aria-modal="true"
          onClick={closeDetail}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              padding: 24,
              maxWidth: '90vw',
              maxHeight: '80vh',
              width: 600,
              overflowY: 'auto',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0, color: '#2C2C2C', fontSize: '1rem' }}>
                {expandedCell.key}
              </h4>
              <button
                type="button"
                data-testid="audit-log-detail-close"
                onClick={closeDetail}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  color: '#6B6B6B',
                  cursor: 'pointer',
                  padding: '0 8px',
                }}
                aria-label="Close detail"
              >
                &times;
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                padding: 12,
                backgroundColor: '#F9F9F9',
                border: '1px solid #E8E8E8',
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: '#2C2C2C',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {(() => {
                // Try to pretty-print if it parses as JSON.
                try {
                  return JSON.stringify(JSON.parse(expandedCell.fullValue), null, 2);
                } catch {
                  return expandedCell.fullValue;
                }
              })()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export { AUDIT_COLUMNS };
