import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.js';

// SchoolsTableEditor — Section D, Component 3
// Displays all schools rows. Four columns are editable:
//   coach_link, prospect_camp_link, recruiting_q_link, school_link_staging
// All other columns are read-only. No INSERT, no DELETE controls.
//
// Reads and writes both route through Edge Function stubs (not yet implemented — Patch owns Section C):
//   GET  /functions/v1/admin-read-schools
//   PUT  /functions/v1/admin-update-school
//
// Audit trail is written by the Edge Function on the server side — this component just sends
// the update and displays the success/error state.

const EDITABLE_COLUMNS = [
  'coach_link',
  'prospect_camp_link',
  'recruiting_q_link',
  'school_link_staging',
];

// Display columns (read-only + editable together). Order defines column order in the table.
// Non-editable columns render as plain text. Editable columns render as click-to-edit.
const DISPLAY_COLUMNS = [
  { key: 'name', label: 'School', editable: false },
  { key: 'state', label: 'State', editable: false },
  { key: 'coach_link', label: 'Coach Link', editable: true },
  { key: 'prospect_camp_link', label: 'Prospect Camp Link', editable: true },
  { key: 'recruiting_q_link', label: 'Recruiting Q Link', editable: true },
  { key: 'school_link_staging', label: 'School Link (Staging)', editable: true },
];

export default function SchoolsTableEditor({ adminEmail }) {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editingCellKey, setEditingCellKey] = useState(null); // 'rowId:column'
  const [editValue, setEditValue] = useState('');
  const [saveInProgress, setSaveInProgress] = useState({});
  const [saveErrors, setSaveErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const loadSchools = useCallback(async () => {
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

      const res = await fetch(`${supabaseUrl}/functions/v1/admin-read-schools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
          'apikey': anonKey,
        },
      });

      if (!res.ok) {
        setLoadError(`Failed to load schools (HTTP ${res.status}). The admin-read-schools Edge Function may not be deployed yet.`);
        setLoading(false);
        return;
      }

      const body = await res.json();
      if (!body?.success) {
        setLoadError(body?.error || 'Failed to load schools.');
        setLoading(false);
        return;
      }

      setSchools(body.schools || []);
      setLoading(false);
    } catch (err) {
      setLoadError('Network error loading schools. Please try again.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  const cellKey = (rowId, column) => `${rowId}:${column}`;

  const beginEdit = (school, column) => {
    const key = cellKey(school.id, column);
    setEditingCellKey(key);
    setEditValue(school[column] ?? '');
    setSaveErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const cancelEdit = () => {
    setEditingCellKey(null);
    setEditValue('');
  };

  const saveEdit = async (school, column) => {
    const key = cellKey(school.id, column);
    const original = school[column] ?? '';

    // No-op if value is unchanged.
    if (editValue === original) {
      cancelEdit();
      return;
    }

    setSaveInProgress((prev) => ({ ...prev, [key]: true }));
    setSaveErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;

      if (!jwt) {
        setSaveErrors((prev) => ({ ...prev, [key]: 'No active admin session.' }));
        setSaveInProgress((prev) => ({ ...prev, [key]: false }));
        return;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/admin-update-school`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          school_id: school.id,
          column,
          new_value: editValue,
          admin_email: adminEmail,
        }),
      });

      if (!res.ok) {
        setSaveErrors((prev) => ({ ...prev, [key]: `Save failed (HTTP ${res.status})` }));
        setSaveInProgress((prev) => ({ ...prev, [key]: false }));
        return;
      }

      const body = await res.json();
      if (!body?.success) {
        setSaveErrors((prev) => ({ ...prev, [key]: body?.error || 'Save failed.' }));
        setSaveInProgress((prev) => ({ ...prev, [key]: false }));
        return;
      }

      // Merge the returned updated_row into local state.
      const updatedRow = body.updated_row;
      setSchools((prev) => prev.map((s) => (s.id === school.id ? { ...s, ...updatedRow } : s)));
      setSaveInProgress((prev) => ({ ...prev, [key]: false }));
      setEditingCellKey(null);
      setEditValue('');
      setSuccessMessage('Saved');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setSaveErrors((prev) => ({ ...prev, [key]: 'Network error — try again.' }));
      setSaveInProgress((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleKeyDown = (e, school, column) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(school, column);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  if (loading) {
    return (
      <div
        data-testid="schools-table-loading"
        style={{ padding: 48, textAlign: 'center', color: '#6B6B6B' }}
      >
        Loading schools...
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        data-testid="schools-table-error"
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
            data-testid="schools-table-retry"
            onClick={loadSchools}
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
    <div data-testid="schools-table-editor" style={{ padding: 24, position: 'relative' }}>
      <h3
        style={{
          fontSize: '1.5rem',
          color: '#2C2C2C',
          margin: '0 0 8px 0',
          fontWeight: 700,
        }}
      >
        Schools
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#6B6B6B', margin: '0 0 16px 0' }}>
        {schools.length} rows. Four link columns are editable — click a cell to edit.
      </p>

      {successMessage && (
        <div
          data-testid="schools-table-success-toast"
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

      <div style={{ overflowX: 'auto', border: '1px solid #E8E8E8', borderRadius: 4 }}>
        <table
          data-testid="schools-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
            color: '#2C2C2C',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#F5F5F5', borderBottom: '2px solid #D4D4D4' }}>
              {DISPLAY_COLUMNS.map((col) => (
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
                  {col.editable && (
                    <span style={{ color: '#8B3A3A', marginLeft: 4, fontSize: '0.7rem' }}>
                      (editable)
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <tr key={school.id} style={{ borderBottom: '1px solid #E8E8E8' }}>
                {DISPLAY_COLUMNS.map((col) => {
                  const key = cellKey(school.id, col.key);
                  const isEditing = editingCellKey === key;
                  const isSaving = !!saveInProgress[key];
                  const err = saveErrors[key];

                  if (!col.editable) {
                    return (
                      <td
                        key={col.key}
                        style={{ padding: '10px 12px', verticalAlign: 'top' }}
                      >
                        {school[col.key] ?? ''}
                      </td>
                    );
                  }

                  return (
                    <td
                      key={col.key}
                      data-testid={`schools-cell-${col.key}-${school.id}`}
                      style={{
                        padding: '10px 12px',
                        verticalAlign: 'top',
                        cursor: isEditing ? 'default' : 'pointer',
                        backgroundColor: isEditing ? '#FFF8E1' : 'transparent',
                      }}
                      onClick={() => {
                        if (!isEditing && !isSaving) beginEdit(school, col.key);
                      }}
                    >
                      {isEditing ? (
                        <div>
                          <input
                            type="text"
                            data-testid={`schools-edit-input-${col.key}-${school.id}`}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, school, col.key)}
                            disabled={isSaving}
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
                              data-testid={`schools-save-${col.key}-${school.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                saveEdit(school, col.key);
                              }}
                              disabled={isSaving}
                              style={{
                                padding: '4px 10px',
                                backgroundColor: '#8B3A3A',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                opacity: isSaving ? 0.7 : 1,
                              }}
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              data-testid={`schools-cancel-${col.key}-${school.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEdit();
                              }}
                              disabled={isSaving}
                              style={{
                                padding: '4px 10px',
                                backgroundColor: '#FFFFFF',
                                color: '#6B6B6B',
                                border: '1px solid #D4D4D4',
                                borderRadius: 4,
                                fontSize: '0.75rem',
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                          {err && (
                            <div
                              data-testid={`schools-error-${col.key}-${school.id}`}
                              style={{
                                marginTop: 6,
                                color: '#C62828',
                                fontSize: '0.75rem',
                              }}
                              aria-live="polite"
                            >
                              {err}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span>{school[col.key] || <em style={{ color: '#9E9E9E' }}>(empty)</em>}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Exported for tests / external callers if needed.
export { EDITABLE_COLUMNS, DISPLAY_COLUMNS };
