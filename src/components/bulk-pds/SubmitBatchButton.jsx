/**
 * SubmitBatchButton — Sprint 026 Phase 1a (Coach UI).
 *
 * Disabled when there are zero cards in the batch (caller controls the
 * `disabled` flag). Shows a loading label while the submit is in flight.
 * The success toast is rendered by the page via `useToast()`.
 */

const wrapStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  padding: '8px 0',
};

const baseBtnStyle = {
  padding: '12px 28px',
  border: 'none',
  borderRadius: 6,
  fontWeight: 700,
  fontSize: '1rem',
  cursor: 'pointer',
  minWidth: 220,
};

const activeStyle = {
  ...baseBtnStyle,
  backgroundColor: 'var(--brand-maroon, #8B3A3A)',
  color: '#FFFFFF',
};

const disabledStyle = {
  ...baseBtnStyle,
  backgroundColor: '#B0B0B0',
  color: '#FFFFFF',
  cursor: 'not-allowed',
};

export default function SubmitBatchButton({ disabled, submitting, onSubmit }) {
  const isDisabled = disabled || submitting;
  return (
    <div style={wrapStyle}>
      <button
        type="button"
        data-testid="bulk-pds-coach-submit-btn"
        onClick={onSubmit}
        disabled={isDisabled}
        style={isDisabled ? disabledStyle : activeStyle}
        aria-disabled={isDisabled}
      >
        {submitting ? 'Submitting…' : 'Submit Player Updates'}
      </button>
    </div>
  );
}
