// DeleteConfirmModal — Sprint 027. Soft-delete confirmation.
// Per Q5, only ever mounted by CollegeCoachesView and RecruitingEventsView.

import { useState } from 'react';
import { applyDelete } from '../../lib/adminAccountUpdates/applyDelete.js';

export default function DeleteConfirmModal({ entity, row, onClose, onSuccess, adminEmail }) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rowLabel = row?.name || row?.event_name || row?.id || '(row)';

  async function handleConfirm() {
    setSubmitting(true);
    setError('');
    const res = await applyDelete({ entity, row_id: row?.id, adminEmail });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSuccess(res.row_id);
  }

  return (
    <div
      data-testid="delete-confirm-modal"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 9100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ backgroundColor: '#FFFFFF', padding: 24, borderRadius: 4, width: 'min(420px, 92vw)' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Soft delete</h2>
        <p style={{ marginTop: 12, fontSize: '0.9rem', color: '#2C2C2C' }}>
          This will set <code>deleted_at</code> on <strong>{rowLabel}</strong>. The row stays in the
          database but is hidden from reads. Reversible by clearing <code>deleted_at</code> directly.
        </p>
        {error && (
          <div
            data-testid="delete-confirm-error"
            style={{ padding: '8px 12px', backgroundColor: '#FBE9E7', color: '#8B3A3A', borderRadius: 4, marginTop: 8, fontSize: '0.875rem' }}
          >
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{ padding: '8px 16px', backgroundColor: '#FFFFFF', color: '#6B6B6B', border: '1px solid #E8E8E8', borderRadius: 4, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="delete-confirm-submit"
            onClick={handleConfirm}
            disabled={submitting}
            style={{
              padding: '8px 16px',
              backgroundColor: submitting ? '#D0D0D0' : '#8B3A3A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 700,
            }}
          >
            {submitting ? 'Deleting…' : 'Soft delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
