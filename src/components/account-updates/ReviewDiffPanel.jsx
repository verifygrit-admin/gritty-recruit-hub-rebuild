// ReviewDiffPanel — Sprint 027.
// Renders inside BulkEditDrawer at REVIEW state. Per-row, per-field
// (old → new) display. No edits possible from here.
//
// Props:
//   diffByRowId: { [row_id]: { rowLabel, primary: {field: {old, new}}, link?: {...} } }
//   onBack: () => void
//   onConfirm: () => void
//   submitting: boolean

export default function ReviewDiffPanel({ diffByRowId, onBack, onConfirm, submitting }) {
  const entries = Object.entries(diffByRowId);
  return (
    <div data-testid="review-diff-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ margin: 0, fontSize: '1rem', color: '#2C2C2C' }}>
        Review changes ({entries.length} {entries.length === 1 ? 'row' : 'rows'})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {entries.map(([rowId, entry]) => (
          <div
            key={rowId}
            data-testid={`review-row-${rowId}`}
            style={{ border: '1px solid #E8E8E8', borderRadius: 4, padding: 12 }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#2C2C2C' }}>
              {entry.rowLabel}
            </div>
            <DiffTable groupLabel={entry.linkTable ? entry.tableName : null} fields={entry.primary} />
            {entry.link && Object.keys(entry.link).length > 0 && (
              <DiffTable groupLabel={entry.linkTable} fields={entry.link} />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button
          type="button"
          data-testid="review-back"
          onClick={onBack}
          disabled={submitting}
          style={{
            padding: '8px 16px',
            backgroundColor: '#FFFFFF',
            color: '#6B6B6B',
            border: '1px solid #E8E8E8',
            borderRadius: 4,
            fontSize: '0.875rem',
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          Back to edit
        </button>
        <button
          type="button"
          data-testid="review-confirm"
          onClick={onConfirm}
          disabled={submitting}
          style={{
            padding: '8px 16px',
            backgroundColor: submitting ? '#A0A0A0' : '#8B3A3A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 4,
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Submitting…' : 'Confirm and submit'}
        </button>
      </div>
    </div>
  );
}

function DiffTable({ groupLabel, fields }) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return null;
  return (
    <div style={{ marginTop: 6 }}>
      {groupLabel && (
        <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>
          {groupLabel}
        </div>
      )}
      <table style={{ width: '100%', fontSize: '0.875rem' }}>
        <tbody>
          {keys.map((k) => (
            <tr key={k}>
              <td style={{ color: '#6B6B6B', padding: '2px 8px 2px 0', whiteSpace: 'nowrap' }}>{k}</td>
              <td style={{ color: '#A05A5A', padding: '2px 8px', textDecoration: 'line-through' }}>
                {formatValue(fields[k].old)}
              </td>
              <td style={{ color: '#888', padding: '2px 4px' }}>→</td>
              <td style={{ color: '#2C2C2C', padding: '2px 8px', fontWeight: 600 }}>
                {formatValue(fields[k].new)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatValue(v) {
  if (v === null || v === undefined || v === '') return '(empty)';
  if (typeof v === 'boolean') return String(v);
  return String(v);
}
