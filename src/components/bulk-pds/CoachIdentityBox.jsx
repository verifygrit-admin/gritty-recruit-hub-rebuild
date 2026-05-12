/**
 * CoachIdentityBox — Sprint 026 Phase 1a (Coach UI).
 *
 * Read-only panel showing the signed-in coach's name + email + school.
 * Identity is sourced from `useCoachIdentity` (composes `useSchoolIdentity`
 * + `findStaffByUserId` from `school-staff.js`). Coaches/counselors do NOT
 * have `public.profiles` rows; identity comes from the static SCHOOL_STAFF
 * config (Sprint 017 D5/3d).
 */

const wrapStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 8,
  padding: '16px 20px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  display: 'grid',
  gridTemplateColumns: 'minmax(120px, 1fr) minmax(160px, 1fr) minmax(120px, 1fr)',
  gap: 16,
};

const fieldWrap = { minWidth: 0 };
const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6B6B6B',
  marginBottom: 4,
};
const valueStyle = {
  fontSize: '1rem',
  color: '#2C2C2C',
  fontWeight: 500,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export default function CoachIdentityBox({ identity }) {
  const { name, email, school, loading } = identity || {};
  const placeholder = loading ? '…' : '—';

  return (
    <section
      style={wrapStyle}
      data-testid="bulk-pds-coach-identity-box"
      aria-label="Coach identity"
    >
      <div style={fieldWrap}>
        <span style={labelStyle}>Coach</span>
        <span style={valueStyle} data-testid="bulk-pds-coach-identity-name">
          {name || placeholder}
        </span>
      </div>
      <div style={fieldWrap}>
        <span style={labelStyle}>Email</span>
        <span style={valueStyle} data-testid="bulk-pds-coach-identity-email">
          {email || placeholder}
        </span>
      </div>
      <div style={fieldWrap}>
        <span style={labelStyle}>School</span>
        <span style={valueStyle} data-testid="bulk-pds-coach-identity-school">
          {school || placeholder}
        </span>
      </div>
    </section>
  );
}
