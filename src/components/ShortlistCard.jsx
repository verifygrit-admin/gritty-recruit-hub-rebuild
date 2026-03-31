/**
 * ShortlistCard — single school card on the Shortlist page.
 * UX Spec: UX_SPEC_SHORTLIST.md — SHORTLIST CARD (Per School)
 *
 * Props:
 *   item: short_list_items row (includes recruiting_journey_steps JSONB)
 *   files: array of file_uploads rows for this item's unitid
 *   userId: string
 *   onToggleStep: (itemId, stepId, completed) => Promise<void>
 *   onRemove: (itemId) => void  — opens confirm flow
 *   onUploadFile: (unitid, documentType, file) => Promise<void>
 *   onDeleteFile: (fileId, storagePath) => Promise<void>
 *   updatingStep: number|null — step currently being toggled
 *   uploadingDoc: string|null — document type currently uploading
 */
import RecruitingJourney from './RecruitingJourney.jsx';
import DocumentsSection from './DocumentsSection.jsx';

const STATUS_CONFIG = {
  currently_recommended:   { label: 'Currently Recommended',   bg: '#4CAF50' },
  below_academic_fit:      { label: 'Below Academic Fit',       bg: '#FF9800' },
  out_of_academic_reach:   { label: 'Academic Stretch',          bg: '#FF9800' },
  out_of_athletic_reach:   { label: 'Athletic Stretch',          bg: '#FF9800' },
  below_athletic_fit:      { label: 'Highly Recruitable',        bg: '#D4A017' },
  outside_geographic_reach:{ label: 'Outside Geographic Reach', bg: '#9C27B0' },
  not_evaluated:           { label: 'Not Evaluated',            bg: '#6B6B6B' },
};

const BADGE_ORDER = [
  'currently_recommended',
  'out_of_academic_reach',
  'below_academic_fit',
  'out_of_athletic_reach',
  'below_athletic_fit',
  'outside_geographic_reach',
  'not_evaluated',
];

const cardStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E8E8E8',
  borderRadius: 8,
  padding: 24,
  marginBottom: 16,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  maxWidth: 800,
  transition: 'box-shadow 200ms',
};

function formatMoney(v) {
  if (v == null) return 'N/A';
  return '$' + Math.round(Number(v)).toLocaleString();
}

export default function ShortlistCard({
  item,
  files,
  userId,
  onToggleStep,
  onRemove,
  onUploadFile,
  onDeleteFile,
  onDownloadFile,
  updatingStep,
  uploadingDoc,
  libraryDocs,
  shares,
  sharingSlot,
  onShareDoc,
}) {
  const rawStatuses = Array.isArray(item.grit_fit_labels) && item.grit_fit_labels.length > 0
    ? item.grit_fit_labels
    : [item.grit_fit_status || 'not_evaluated'];
  const activeStatuses = BADGE_ORDER
    .filter(key => rawStatuses.includes(key))
    .map(key => STATUS_CONFIG[key]);
  const statusLabelText = activeStatuses.map(s => s.label).join(', ');
  const steps = item.recruiting_journey_steps || [];
  const completedCount = steps.filter(s => s.completed).length;
  const addedDate = item.added_at
    ? new Date(item.added_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  // Build metadata line
  const metaParts = [
    item.conference,
    item.div,
    item.dist != null ? `${Math.round(Number(item.dist))} miles` : null,
    addedDate ? `Added ${addedDate}` : null,
  ].filter(Boolean);

  return (
    <div
      data-testid={`shortlist-card-${item.unitid}`}
      aria-label={`${item.school_name}, ${statusLabelText}, ${completedCount} of ${steps.length} journey steps completed`}
      style={cardStyle}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
    >
      {/* School Header */}
      <h3
        data-testid="card-school-name"
        style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8B3A3A', margin: '0 0 4px' }}
      >
        {item.school_name}
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#6B6B6B', margin: '0 0 8px' }}>
        {metaParts.join(' | ')}
      </p>

      {/* Status Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {activeStatuses.map((s, idx) => (
          <span
            key={idx}
            data-testid={idx === 0 ? 'status-badge' : `status-badge-${idx}`}
            style={{
              display: 'inline-block',
              backgroundColor: s.bg,
              color: '#FFFFFF',
              fontSize: '0.8125rem',
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: 16,
            }}
          >
            {s.label}
          </span>
        ))}
      </div>

      {/* Key Metrics Row */}
      <div
        data-testid="metrics-row"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 16,
          padding: '8px 0',
          borderTop: '1px solid #F0F0F0',
          borderBottom: '1px solid #F0F0F0',
        }}
      >
        {item.coa != null && (
          <Metric label="COA" value={formatMoney(item.coa)} />
        )}
        {item.net_cost != null && (
          <Metric label="Annual Net Cost" value={formatMoney(item.net_cost)} />
        )}
        {item.droi != null && (
          <Metric label="DROI" value={`${Number(item.droi).toFixed(1)}x`} />
        )}
        <Metric
          label="Fastest Payback"
          value={item.break_even != null ? `${Number(item.break_even).toFixed(1)} yr` : 'N/A'}
        />
        {item.match_rank != null && (
          <Metric label="Match Rank" value={`#${item.match_rank}`} />
        )}
      </div>

      {/* Recruiting Journey */}
      <RecruitingJourney
        steps={steps}
        onToggleStep={(stepId, completed) => onToggleStep(item.id, stepId, completed)}
        updating={updatingStep}
      />

      {/* Documents */}
      <div style={{ marginTop: 12 }}>
        <DocumentsSection
          files={files}
          unitid={item.unitid}
          userId={userId}
          onUpload={onUploadFile}
          onDelete={onDeleteFile}
          onDownload={onDownloadFile}
          uploading={uploadingDoc}
          libraryDocs={libraryDocs}
          shares={shares}
          sharingSlot={sharingSlot}
          onShareDoc={onShareDoc}
        />
      </div>

      {/* Action Buttons */}
      <div
        data-testid="card-actions"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid #F0F0F0',
          flexWrap: 'wrap',
        }}
      >
        {/* Q Link */}
        {item.q_link && (
          <a
            data-testid="recruiting-q-link"
            href={item.q_link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 16px',
              border: '2px solid #8B3A3A',
              borderRadius: 4,
              color: '#8B3A3A',
              textDecoration: 'none',
              fontSize: '0.8125rem',
              fontWeight: 500,
            }}
          >
            Recruiting Questionnaire
          </a>
        )}

        {/* Coach Link */}
        {item.coach_link && (
          <a
            data-testid="coach-link"
            href={item.coach_link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#8B3A3A',
              textDecoration: 'underline',
              fontSize: '0.8125rem',
            }}
          >
            Coaching Staff
          </a>
        )}

        {/* Remove */}
        <button
          data-testid="remove-from-shortlist"
          onClick={() => onRemove(item.id)}
          style={{
            background: 'none',
            border: 'none',
            color: '#F44336',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            textDecoration: 'underline',
            marginLeft: 'auto',
          }}
        >
          Remove from Shortlist
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 70 }}>
      <div style={{ fontSize: '0.6875rem', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#2C2C2C' }}>
        {value}
      </div>
    </div>
  );
}
