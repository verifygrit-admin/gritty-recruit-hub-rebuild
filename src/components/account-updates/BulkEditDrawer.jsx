// BulkEditDrawer — Sprint 027.
// Edits up to 10 selected rows of the active entity. Per-row, per-field
// inputs constrained to the entity's UPDATE whitelist. State machine:
//   EDITING → REVIEW → SUBMITTING → SUCCESS|CONFLICT|ERROR → EDITING
//
// For nested entities (hs_coaches, counselors), the drawer renders both
// the users-table fields and the link-table fields in two grouped sections.
//
// Bulk PDS UI note (Phase 0 Issue 1): the 5 PDS measurables on Students
// carry a per-field hint string — see PDS_HINT_FIELDS below.

import { useState, useMemo } from 'react';
import { getEntity } from '../../lib/adminAccountUpdates/entityRegistry.js';
import { diffPayload } from '../../lib/adminAccountUpdates/diffPayload.js';
import { applyBatchEdit } from '../../lib/adminAccountUpdates/applyBatchEdit.js';
import ReviewDiffPanel from './ReviewDiffPanel.jsx';

const PDS_HINT_FIELDS = new Set(['time_5_10_5', 'time_l_drill', 'bench_press', 'squat', 'clean']);
const PDS_HINT_TEXT = 'Direct edit bypasses bulk PDS audit chain.';

function rowLabelFor(entity, row) {
  if (entity === 'students') return row.name || row.email || row.id;
  if (entity === 'hs_coaches' || entity === 'counselors') return row.full_name || row.email || row.id;
  if (entity === 'high_schools') return row.school_name || row.id;
  if (entity === 'colleges') return `${row.school_name || ''} (UNITID ${row.unitid})`;
  if (entity === 'college_coaches') return `${row.name || ''} — ${row.title || ''}`;
  if (entity === 'recruiting_events') return `${row.event_name || row.event_type || 'Event'} on ${row.event_date}`;
  return String(row.id ?? row.unitid ?? '?');
}

export default function BulkEditDrawer({ entity, selectedRows, onClose, onSuccess, adminEmail }) {
  const cfg = getEntity(entity);
  const pkCol = cfg.pk;

  // State by row_id → edited fields (split by users/link if applicable)
  const [edits, setEdits] = useState(() => {
    const init = {};
    for (const r of selectedRows) {
      init[r[pkCol]] = cfg.has_link_table ? { users: {}, link: {} } : { users: {} };
    }
    return init;
  });
  const [stage, setStage] = useState('EDITING'); // EDITING | REVIEW | SUBMITTING
  const [errorMsg, setErrorMsg] = useState('');
  const [conflicts, setConflicts] = useState([]);

  // Compute diff per row
  const diffByRowId = useMemo(() => {
    const result = {};
    for (const row of selectedRows) {
      const rowId = row[pkCol];
      const editsForRow = edits[rowId] || { users: {}, link: {} };

      let primaryDiff = {};
      if (cfg.has_link_table) {
        primaryDiff = diffPayload(row, editsForRow.users, cfg.update_whitelist_users);
      } else {
        primaryDiff = diffPayload(row, editsForRow.users, cfg.update_whitelist);
      }

      let linkDiff = {};
      if (cfg.has_link_table) {
        // For link diff, compare to link cols on row (joined view exposes them flat)
        linkDiff = diffPayload(row, editsForRow.link, cfg.update_whitelist_link);
      }

      const totalChanges = Object.keys(primaryDiff).length + Object.keys(linkDiff).length;
      if (totalChanges === 0) continue;

      // Build display structure
      const primaryDisplay = {};
      for (const k of Object.keys(primaryDiff)) {
        primaryDisplay[k] = { old: row[k], new: primaryDiff[k] };
      }
      const linkDisplay = {};
      for (const k of Object.keys(linkDiff)) {
        linkDisplay[k] = { old: row[k], new: linkDiff[k] };
      }

      result[rowId] = {
        rowLabel: rowLabelFor(entity, row),
        tableName: cfg.table,
        linkTable: cfg.has_link_table ? cfg.link_table : null,
        primary: primaryDisplay,
        link: cfg.has_link_table ? linkDisplay : null,
        // raw diffs for the EF payload
        _primaryDiff: primaryDiff,
        _linkDiff: linkDiff,
        _row: row,
      };
    }
    return result;
  }, [selectedRows, edits, entity, cfg, pkCol]);

  const totalChangedRows = Object.keys(diffByRowId).length;

  function setField(rowId, group, field, value) {
    setEdits((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [group]: { ...prev[rowId]?.[group], [field]: value },
      },
    }));
  }

  async function handleConfirm() {
    setStage('SUBMITTING');
    setErrorMsg('');
    setConflicts([]);

    const batch = Object.values(diffByRowId).map((entry) => {
      const row = entry._row;
      const rowId = row[pkCol];
      let diff;
      if (cfg.has_link_table) {
        diff = {};
        if (Object.keys(entry._primaryDiff).length > 0) diff.users = entry._primaryDiff;
        if (Object.keys(entry._linkDiff).length > 0) diff[cfg.link_table] = entry._linkDiff;
      } else {
        diff = entry._primaryDiff;
      }

      const payloadRow = { row_id: rowId, diff };
      if (cfg.has_updated_at) {
        const tsCol = cfg.updated_at_col || 'updated_at';
        if (row[tsCol]) payloadRow.updated_at_check = row[tsCol];
      }
      return payloadRow;
    });

    const result = await applyBatchEdit({ entity, batch, adminEmail });
    if (!result.ok) {
      if (result.error === 'Conflict') {
        setConflicts(result.conflicts || []);
        setErrorMsg('One or more rows were modified elsewhere. Refresh and try again.');
      } else {
        setErrorMsg(result.error || 'Submit failed.');
      }
      setStage('EDITING');
      return;
    }
    onSuccess({
      updated_count: result.updated_count,
      audit_count: result.audit_count,
      updated_rows: result.updated_rows,
    });
  }

  const drawerStyle = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 'min(720px, 100vw)',
    backgroundColor: '#FFFFFF',
    boxShadow: '-2px 0 12px rgba(0,0,0,0.12)',
    zIndex: 9000,
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div data-testid="bulk-edit-drawer" style={drawerStyle}>
      <div style={{ padding: 16, borderBottom: '1px solid #E8E8E8', display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
          Bulk edit — {cfg.label} ({selectedRows.length} {selectedRows.length === 1 ? 'row' : 'rows'})
        </h2>
        <button
          type="button"
          data-testid="bulk-edit-close"
          onClick={onClose}
          disabled={stage === 'SUBMITTING'}
          style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6B6B6B' }}
          aria-label="Close drawer"
        >
          ×
        </button>
      </div>

      <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
        {errorMsg && (
          <div
            data-testid="bulk-edit-error"
            style={{
              padding: '10px 12px',
              backgroundColor: '#FBE9E7',
              color: '#8B3A3A',
              borderRadius: 4,
              marginBottom: 12,
              fontSize: '0.875rem',
            }}
          >
            {errorMsg}
            {conflicts.length > 0 && (
              <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                {conflicts.map((c, i) => (
                  <li key={i}>
                    Row {c.row_id} — current updated_at {c.current_updated_at}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {stage === 'REVIEW' ? (
          <ReviewDiffPanel
            diffByRowId={diffByRowId}
            onBack={() => setStage('EDITING')}
            onConfirm={handleConfirm}
            submitting={false}
          />
        ) : stage === 'SUBMITTING' ? (
          <ReviewDiffPanel
            diffByRowId={diffByRowId}
            onBack={() => {}}
            onConfirm={() => {}}
            submitting={true}
          />
        ) : (
          <EditingView
            entity={entity}
            cfg={cfg}
            selectedRows={selectedRows}
            edits={edits}
            setField={setField}
            pkCol={pkCol}
          />
        )}
      </div>

      {stage === 'EDITING' && (
        <div style={{ padding: 16, borderTop: '1px solid #E8E8E8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: '#6B6B6B' }}>
            {totalChangedRows} {totalChangedRows === 1 ? 'row' : 'rows'} changed
          </span>
          <button
            type="button"
            data-testid="bulk-edit-update"
            onClick={() => setStage('REVIEW')}
            disabled={totalChangedRows === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: totalChangedRows === 0 ? '#D0D0D0' : '#8B3A3A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: totalChangedRows === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Update
          </button>
        </div>
      )}
    </div>
  );
}

function EditingView({ entity, cfg, selectedRows, edits, setField, pkCol }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {selectedRows.map((row) => {
        const rowId = row[pkCol];
        const rowEdits = edits[rowId] || { users: {}, link: {} };
        return (
          <div
            key={rowId}
            data-testid={`bulk-edit-row-${rowId}`}
            style={{ border: '1px solid #E8E8E8', borderRadius: 4, padding: 12 }}
          >
            <div style={{ fontWeight: 600, color: '#2C2C2C', marginBottom: 8 }}>
              {rowLabelFor(entity, row)}
            </div>
            <FieldGrid
              fields={cfg.has_link_table ? cfg.update_whitelist_users : cfg.update_whitelist}
              row={row}
              edits={rowEdits.users}
              onChange={(field, value) => setField(rowId, 'users', field, value)}
              entity={entity}
            />
            {cfg.has_link_table && (
              <>
                <div style={{ fontSize: '0.75rem', color: '#888', margin: '12px 0 4px' }}>
                  School link ({cfg.link_table})
                </div>
                <FieldGrid
                  fields={cfg.update_whitelist_link}
                  row={row}
                  edits={rowEdits.link}
                  onChange={(field, value) => setField(rowId, 'link', field, value)}
                  entity={entity}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldGrid({ fields, row, edits, onChange, entity }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {fields.map((field) => {
        const current = Object.prototype.hasOwnProperty.call(edits, field) ? edits[field] : (row[field] ?? '');
        const showPdsHint = entity === 'students' && PDS_HINT_FIELDS.has(field);
        return (
          <label key={field} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8125rem', color: '#2C2C2C' }}>
            <span style={{ marginBottom: 2 }}>{field}</span>
            <input
              data-testid={`field-${field}`}
              type="text"
              value={current === null || current === undefined ? '' : String(current)}
              onChange={(e) => onChange(field, e.target.value)}
              style={{
                padding: '6px 8px',
                border: '1px solid #E8E8E8',
                borderRadius: 3,
                fontSize: '0.875rem',
              }}
            />
            {showPdsHint && (
              <span style={{ fontSize: '0.6875rem', color: '#A05A5A', marginTop: 2 }}>
                {PDS_HINT_TEXT}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
