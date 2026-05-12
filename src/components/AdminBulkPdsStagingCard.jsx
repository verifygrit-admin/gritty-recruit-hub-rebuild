import { BULK_PDS_DIFF_FIELDS } from '../lib/bulkPds/admin/diffStagingVsProfile.js';

/**
 * AdminBulkPdsStagingCard — Sprint 026 Phase 1b.
 *
 * "A" side of the compare row in the Bulk PDS Approval flow. Renders the
 * staging row values as submitted by the coach. Fields with a delta vs the
 * profile (B side) are highlighted via the `diff` map passed from the
 * parent compare row (computed once by `diffStagingVsProfile`).
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

export default function AdminBulkPdsStagingCard({ submissionId, staging, diff }) {
  return (
    <section
      data-testid={`bulk-pds-admin-staging-card-${submissionId}`}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        border: '1px solid #E8E8E8',
        borderRadius: 6,
        padding: 16,
        backgroundColor: '#FFFFFF',
      }}
    >
      <header style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#8B3A3A', fontWeight: 700, letterSpacing: '0.04em' }}>
          A — Coach submission (staging)
        </div>
        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#2C2C2C' }}>
          {staging?.student_name_snapshot || 'Unknown student'}
        </div>
        <div style={{ fontSize: '0.8125rem', color: '#6B6B6B' }}>
          {staging?.student_email_snapshot} · Grad {staging?.student_grad_year_snapshot}
        </div>
      </header>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
        {BULK_PDS_DIFF_FIELDS.map((field) => {
          const changed = !!diff?.[field]?.changed;
          return (
            <div
              key={field}
              data-testid={changed ? 'bulk-pds-admin-diff-highlight' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '6px 8px',
                backgroundColor: changed ? '#FFF6E5' : 'transparent',
                borderRadius: 4,
                borderLeft: changed ? '3px solid #D98E00' : '3px solid transparent',
              }}
            >
              <dt style={{ fontSize: '0.6875rem', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {FIELD_LABELS[field]}
              </dt>
              <dd style={{ margin: 0, fontSize: '0.9375rem', fontWeight: changed ? 700 : 500, color: '#2C2C2C' }}>
                {formatValue(staging?.[field])}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
