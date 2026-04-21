import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import AdminTableEditor from './AdminTableEditor.jsx';
import useIsDesktop from '../hooks/useIsDesktop.js';

// AuditLogViewer — Section D, Component 4.
// Sprint 001 D4: migrated onto AdminTableEditor to share pagination,
// sorting, and sticky-header behavior with the other admin tabs.

const TRUNCATE_LENGTH = 100;

// Table column config — all read-only; values are pre-formatted on the row
// before handing off to AdminTableEditor, so no custom cell renderer is needed.
const AUDIT_COLUMNS = [
  { key: 'created_at_display', label: 'Time',       editable: false, width: '160px' },
  { key: 'admin_email',        label: 'Admin',      editable: false, width: '220px' },
  { key: 'action',             label: 'Action',     editable: false, width: '120px' },
  { key: 'table_name',         label: 'Table',      editable: false, width: '140px' },
  { key: 'row_id',             label: 'Row ID',     editable: false, width: '140px' },
  { key: 'old_value_display',  label: 'Old Value',  editable: false, width: '260px' },
  { key: 'new_value_display',  label: 'New Value',  editable: false, width: '260px' },
];

function formatDatetime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function stringifyForDisplay(value) {
  if (value == null) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function truncate(text) {
  if (text.length <= TRUNCATE_LENGTH) return text;
  return text.substring(0, TRUNCATE_LENGTH) + '…';
}

function prettyPrint(value) {
  if (value == null) return '';
  try {
    return JSON.stringify(
      typeof value === 'string' ? JSON.parse(value) : value,
      null,
      2
    );
  } catch {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
}

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

// POR tooltip config (spec §1.5.5) — id is suppressed per Chris's ruling.
const POR_CONFIG = {
  tabContext: 'audit-log',
  getTooltipData: (row) => ({
    title: row.action
      ? `${row.action} on ${row.table_name || 'unknown'}`
      : `Entry #${(row.id && typeof row.id === 'string') ? row.id.slice(0, 8) : '?'}`,
    actionType: row.action ?? null,
    adminEmail: row.admin_email ?? null,
    tableName: row.table_name ?? null,
    affectedRowId: row.row_id ?? null,
    timestamp: row.created_at ?? null,
    changesSummary:
      row.action === 'UPDATE' && row.old_value != null && row.new_value != null
        ? computeChangesSummary(row.old_value, row.new_value)
        : null,
  }),
};

export default function AuditLogViewer() {
  const isDesktop = useIsDesktop();
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [detailRow, setDetailRow] = useState(null);

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

      const sorted = [...(body.audit_log || [])].sort((a, b) => {
        const ta = new Date(a.created_at).getTime() || 0;
        const tb = new Date(b.created_at).getTime() || 0;
        return tb - ta;
      });

      setAuditLog(sorted);
      setLoading(false);
    } catch {
      setLoadError('Network error loading audit log. Please try again.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLog();
  }, [loadAuditLog]);

  // Pre-format rows: display-friendly strings for datetime and JSON columns,
  // raw values retained under the original keys for the POR tooltip + detail modal.
  const displayRows = useMemo(() => {
    return auditLog.map((row) => ({
      ...row,
      created_at_display: formatDatetime(row.created_at),
      old_value_display: truncate(stringifyForDisplay(row.old_value)),
      new_value_display: truncate(stringifyForDisplay(row.new_value)),
    }));
  }, [auditLog]);

  return (
    <div data-testid="audit-log-viewer">
      <AdminTableEditor
        columns={AUDIT_COLUMNS}
        rows={displayRows}
        rowKey="id"
        tableName="audit log"
        loading={loading}
        loadError={loadError}
        onRetry={loadAuditLog}
        isDesktop={isDesktop}
        onRowClick={setDetailRow}
        porConfig={POR_CONFIG}
      />

      {detailRow && (
        <div
          data-testid="audit-log-detail-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetailRow(null)}
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
              width: 720,
              overflowY: 'auto',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0, color: '#2C2C2C', fontSize: '1rem' }}>
                {detailRow.action || 'Audit Entry'} — {detailRow.table_name || '—'}
              </h4>
              <button
                type="button"
                data-testid="audit-log-detail-close"
                onClick={() => setDetailRow(null)}
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

            <div style={{ fontSize: '0.8125rem', color: '#6B6B6B', marginBottom: 16 }}>
              {formatDatetime(detailRow.created_at)} — {detailRow.admin_email || 'System'} —
              Row {detailRow.row_id ?? '—'}
            </div>

            {detailRow.old_value != null && (
              <>
                <h5 style={{ margin: '0 0 6px 0', fontSize: '0.8125rem', color: '#2C2C2C' }}>
                  Old Value
                </h5>
                <pre
                  style={{
                    margin: '0 0 16px 0',
                    padding: 12,
                    backgroundColor: '#F9F9F9',
                    border: '1px solid #E8E8E8',
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#2C2C2C',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {prettyPrint(detailRow.old_value)}
                </pre>
              </>
            )}

            {detailRow.new_value != null && (
              <>
                <h5 style={{ margin: '0 0 6px 0', fontSize: '0.8125rem', color: '#2C2C2C' }}>
                  New Value
                </h5>
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    backgroundColor: '#F9F9F9',
                    border: '1px solid #E8E8E8',
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#2C2C2C',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {prettyPrint(detailRow.new_value)}
                </pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { AUDIT_COLUMNS };
