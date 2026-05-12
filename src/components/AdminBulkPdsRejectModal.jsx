import { useState, useEffect, useRef } from 'react';

/**
 * AdminBulkPdsRejectModal — Sprint 026 Phase 1b.
 *
 * Single reject-flow modal used for BOTH:
 *   - whole-batch reject ("Reject Batch" CTA at the batch header)
 *   - per-row reject (per-student reject button on a compare row)
 *
 * The parent (AdminBulkPdsTab) tracks the reject context (`batch` vs
 * `submission`, plus the identifier) and passes it through `title` and the
 * `onConfirm(reason)` callback. The modal itself is context-free apart from
 * the title string and a required `rejection_reason` (free-text, textarea).
 *
 * Q1/Q2 of SPRINT_026_PLAN §7 require rejection_reason on every reject; the
 * confirm button is disabled until the textarea has non-whitespace content.
 */
export default function AdminBulkPdsRejectModal({ open, title, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) {
      setReason('');
      // Focus textarea on open for keyboard-first flow.
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const trimmedReason = reason.trim();
  const canConfirm = trimmedReason.length > 0;

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm(trimmedReason);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-pds-reject-modal-title"
      data-testid="bulk-pds-admin-reject-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 6,
          width: 'min(520px, 92vw)',
          maxHeight: '85vh',
          padding: 24,
          boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <h2
          id="bulk-pds-reject-modal-title"
          style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#8B3A3A' }}
        >
          {title || 'Reject Submission'}
        </h2>
        <p style={{ margin: 0, color: '#4B4B4B', fontSize: '0.875rem', lineHeight: 1.45 }}>
          Provide a reason for rejecting this submission. This message will be sent to the coach.
          The staging row is retained for audit; no profile data is written.
        </p>
        <label
          htmlFor="bulk-pds-reject-reason"
          style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#2C2C2C' }}
        >
          Rejection reason <span style={{ color: '#8B3A3A' }}>*</span>
        </label>
        <textarea
          id="bulk-pds-reject-reason"
          ref={textareaRef}
          data-testid="bulk-pds-admin-reject-reason-input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={5}
          placeholder="Reason for rejection (required)…"
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid #C8C8C8',
            borderRadius: 4,
            fontFamily: 'inherit',
            fontSize: '0.875rem',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
          <button
            type="button"
            data-testid="bulk-pds-admin-reject-modal-cancel-btn"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#FFFFFF',
              color: '#4B4B4B',
              border: '1px solid #C8C8C8',
              borderRadius: 4,
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="bulk-pds-admin-reject-modal-confirm-btn"
            disabled={!canConfirm}
            onClick={handleConfirm}
            style={{
              padding: '8px 16px',
              backgroundColor: canConfirm ? '#8B3A3A' : '#C8A0A0',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: canConfirm ? 'pointer' : 'not-allowed',
            }}
          >
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  );
}
