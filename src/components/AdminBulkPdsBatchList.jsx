import { findStaffByUserId } from '../data/school-staff.js';

/**
 * AdminBulkPdsBatchList — Sprint 026 Phase 1b.
 *
 * Left-column list of pending batches. Sorted submitted_at descending (most
 * recent first) by the parent — this component just renders. Selection is
 * managed by the parent (AdminBulkPdsTab) via the `selectedBatchId` /
 * `onSelect` props.
 *
 * Coach name resolution: same school-staff.js lookup as the detail view so
 * the two columns stay consistent.
 */
function formatRelative(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminBulkPdsBatchList({ batches, selectedBatchId, onSelect }) {
  if (!batches || batches.length === 0) {
    return (
      <aside
        data-testid="bulk-pds-admin-batch-list"
        style={{
          width: 280,
          flexShrink: 0,
          padding: 16,
          border: '1px dashed #C8C8C8',
          borderRadius: 8,
          backgroundColor: '#FAFAFA',
          color: '#6B6B6B',
        }}
      >
        No pending batches.
      </aside>
    );
  }

  return (
    <aside
      data-testid="bulk-pds-admin-batch-list"
      style={{
        width: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        border: '1px solid #E8E8E8',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        padding: 12,
        maxHeight: 700,
        overflowY: 'auto',
      }}
    >
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6B6B6B', fontWeight: 700, padding: '4px 4px 8px' }}>
        Pending batches ({batches.length})
      </div>
      {batches.map((b) => {
        const coach = findStaffByUserId(b.coach_user_id);
        const isSelected = b.batch_id === selectedBatchId;
        return (
          <button
            key={b.batch_id}
            type="button"
            data-testid={`bulk-pds-admin-batch-row-${b.batch_id}`}
            onClick={() => onSelect?.(b.batch_id)}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              border: isSelected ? '2px solid #8B3A3A' : '1px solid #E8E8E8',
              borderRadius: 6,
              backgroundColor: isSelected ? '#FBF1F1' : '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontWeight: 700, color: '#2C2C2C', fontSize: '0.9375rem' }}>
              {coach?.name || 'Unknown coach'}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>
              {b.submissions?.length || 0} {(b.submissions?.length || 0) === 1 ? 'player' : 'players'}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>
              {formatRelative(b.submitted_at)}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
