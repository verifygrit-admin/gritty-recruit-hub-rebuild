import { findStaffByUserId } from '../data/school-staff.js';

/**
 * AdminBulkPdsBatchHeader — Sprint 026 Phase 1b.
 *
 * Top of the right-column detail view. Shows the submitting coach's name +
 * school + the batch submission timestamp, and exposes the two whole-batch
 * CTAs locked by SPRINT_026_PLAN §3 + §7 Q1 / Q2:
 *   - "Verify and Update Profiles" — whole-batch approve.
 *   - "Reject Batch" — opens the reject modal (parent passes context).
 *
 * Coach name is resolved via src/data/school-staff.js findStaffByUserId().
 * Per DEC-GLOBAL-040 staff records ride this static map (no profiles row
 * exists for coaches; see school-staff.js doc header for rationale).
 */
function formatTimestamp(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminBulkPdsBatchHeader({ batch, onApproveBatch, onRejectBatch }) {
  const coachUserId = batch?.coach_user_id;
  const coachRecord = coachUserId ? findStaffByUserId(coachUserId) : null;
  const coachName = coachRecord?.name || 'Unknown coach';
  const coachTitle = coachRecord?.title || '';
  const coachEmail = coachRecord?.email || '';
  const submissionCount = batch?.submissions?.length || 0;

  return (
    <header
      data-testid="bulk-pds-admin-batch-header"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        borderBottom: '1px solid #E8E8E8',
        backgroundColor: '#FFFFFF',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6B6B6B', letterSpacing: '0.04em', fontWeight: 700 }}>
            Coach
          </div>
          <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#2C2C2C' }}>
            {coachName}
          </div>
          {coachTitle && (
            <div style={{ fontSize: '0.8125rem', color: '#4B4B4B' }}>{coachTitle}</div>
          )}
          {coachEmail && (
            <div style={{ fontSize: '0.8125rem', color: '#6B6B6B' }}>{coachEmail}</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6B6B6B', letterSpacing: '0.04em', fontWeight: 700 }}>
            Submitted
          </div>
          <div style={{ fontSize: '0.9375rem', color: '#2C2C2C', fontWeight: 600 }}>
            {formatTimestamp(batch?.submitted_at)}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#6B6B6B' }}>
            {submissionCount} {submissionCount === 1 ? 'player' : 'players'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          data-testid="bulk-pds-admin-batch-approve-btn"
          onClick={onApproveBatch}
          style={{
            padding: '10px 18px',
            backgroundColor: '#2F6F3F',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 4,
            fontSize: '0.9375rem',
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.01em',
          }}
        >
          Verify and Update Profiles
        </button>
        <button
          type="button"
          data-testid="bulk-pds-admin-batch-reject-btn"
          onClick={onRejectBatch}
          style={{
            padding: '10px 18px',
            backgroundColor: '#FFFFFF',
            color: '#8B3A3A',
            border: '1px solid #8B3A3A',
            borderRadius: 4,
            fontSize: '0.9375rem',
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.01em',
          }}
        >
          Reject Batch
        </button>
      </div>
    </header>
  );
}
