import { BULK_PDS_DIFF_FIELDS } from '../lib/bulkPds/admin/diffStagingVsProfile.js';

/**
 * AdminBulkPdsProfileCard — Sprint 026 Phase 1b.
 *
 * "B" side of the compare row. Renders the current `public.profiles` row
 * joined on student_user_id. Fields with a delta vs the staging row are
 * visually highlighted via the diff map passed from the parent compare row.
 *
 * If `profile` is null (no profile row for this student_user_id — orphan
 * case per SPRINT_026_PLAN §7 Q7), the card surfaces an error banner and
 * the approve action is expected to be disabled by the parent compare row.
 */
const FIELD_LABELS = {
  height: 'Height',
  weight: 'Weight (lb)',
  speed_40: '40-yard dash (s)',
  time_5_10_5: '5-10-5 (s)',
  time_l_drill: 'L-drill (s)',
  bench_press: 'Bench press (lb)',
  squat: 'Squat (lb)',
  clean: 'Clean (lb)',
};

function formatValue(v) {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

export default function AdminBulkPdsProfileCard({ submissionId, profile, diff }) {
  if (!profile) {
    return (
      <section
        data-testid={`bulk-pds-admin-profile-card-${submissionId}`}
        style={{
          flex: '1 1 0',
          minWidth: 0,
          border: '1px solid #8B3A3A',
          borderRadius: 6,
          padding: 16,
          backgroundColor: '#FFF4F4',
        }}
      >
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#8B3A3A', fontWeight: 700, letterSpacing: '0.04em' }}>
          B — Current profile (missing)
        </div>
        <p style={{ margin: '8px 0 0', color: '#8B3A3A', fontWeight: 600 }}>
          No matching profile row found. Approval is blocked until the student profile is created.
        </p>
      </section>
    );
  }

  return (
    <section
      data-testid={`bulk-pds-admin-profile-card-${submissionId}`}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        border: '1px solid #E8E8E8',
        borderRadius: 6,
        padding: 16,
        backgroundColor: '#FAFAFA',
      }}
    >
      <header style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#4B4B4B', fontWeight: 700, letterSpacing: '0.04em' }}>
          B — Current profile
        </div>
        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#2C2C2C' }}>
          {profile?.name || 'Unknown student'}
        </div>
        <div style={{ fontSize: '0.8125rem', color: '#6B6B6B' }}>
          {profile?.email} · Grad {profile?.grad_year}
        </div>
      </header>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
        {BULK_PDS_DIFF_FIELDS.map((field) => {
          const changed = !!diff?.[field]?.changed;
          return (
            <div
              key={field}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '6px 8px',
                backgroundColor: changed ? '#F4F4F4' : 'transparent',
                borderRadius: 4,
                borderLeft: changed ? '3px solid #8B8B8B' : '3px solid transparent',
              }}
            >
              <dt style={{ fontSize: '0.6875rem', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {FIELD_LABELS[field]}
              </dt>
              <dd style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 500, color: '#4B4B4B' }}>
                {formatValue(profile?.[field])}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
