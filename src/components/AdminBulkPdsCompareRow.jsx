import { useMemo } from 'react';
import { diffStagingVsProfile } from '../lib/bulkPds/admin/diffStagingVsProfile.js';
import AdminBulkPdsStagingCard from './AdminBulkPdsStagingCard.jsx';
import AdminBulkPdsProfileCard from './AdminBulkPdsProfileCard.jsx';

/**
 * AdminBulkPdsCompareRow — Sprint 026 Phase 1b.
 *
 * One row per student in a batch. Side-by-side A/B render:
 *   - A (left): staging row as submitted by the coach.
 *   - B (right): current public.profiles row joined on student_user_id.
 *
 * Per SPRINT_026_PLAN §7 Q1: every row carries per-student Approve + Reject
 * buttons in addition to the whole-batch CTAs on the batch header.
 *
 * Approve is disabled when the profile row is missing (orphan case Q7) —
 * the parent (AdminBulkPdsTab) is responsible for routing the disabled-state
 * rationale to the operator.
 */
export default function AdminBulkPdsCompareRow({
  submission,         // { staging, profile }
  onApprove,          // (submission_id) => void
  onReject,           // (submission_id) => void  (parent opens the reject modal)
}) {
  const staging = submission?.staging || null;
  const profile = submission?.profile || null;
  const submissionId = staging?.id;

  const diff = useMemo(() => diffStagingVsProfile(staging || {}, profile || {}), [staging, profile]);
  const profileMissing = !profile;

  return (
    <article
      data-testid={`bulk-pds-admin-compare-row-${submissionId}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        border: '1px solid #E8E8E8',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <AdminBulkPdsStagingCard submissionId={submissionId} staging={staging} diff={diff} />
        <AdminBulkPdsProfileCard submissionId={submissionId} profile={profile} diff={diff} />
      </div>
      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end',
          borderTop: '1px solid #F0F0F0',
          paddingTop: 12,
        }}
      >
        <button
          type="button"
          data-testid={`bulk-pds-admin-row-reject-btn-${submissionId}`}
          onClick={() => onReject?.(submissionId)}
          style={{
            padding: '8px 14px',
            backgroundColor: '#FFFFFF',
            color: '#8B3A3A',
            border: '1px solid #8B3A3A',
            borderRadius: 4,
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reject row
        </button>
        <button
          type="button"
          data-testid={`bulk-pds-admin-row-approve-btn-${submissionId}`}
          onClick={() => onApprove?.(submissionId)}
          disabled={profileMissing}
          title={profileMissing ? 'Profile row missing — cannot approve' : undefined}
          style={{
            padding: '8px 14px',
            backgroundColor: profileMissing ? '#A8C0A8' : '#2F6F3F',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 4,
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: profileMissing ? 'not-allowed' : 'pointer',
          }}
        >
          Approve row
        </button>
      </div>
    </article>
  );
}
