/**
 * BulkPdsHeader — Sprint 026 Phase 1a (Coach UI).
 *
 * Title + how-to copy block at the top of the Coach Bulk PDS page. Pure
 * presentational. Renders over the BulkPdsBackground overlay; copy must be
 * legible against the school-token wash.
 */

const wrapStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.92)',
  borderRadius: 8,
  padding: '20px 24px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
};

const titleStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '1.75rem',
  fontWeight: 700,
  color: '#2C2C2C',
  margin: 0,
  marginBottom: 8,
  lineHeight: 1.2,
};

const copyStyle = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
  color: '#4A4A4A',
  margin: 0,
  lineHeight: 1.5,
};

export default function BulkPdsHeader() {
  return (
    <div style={wrapStyle} data-testid="bulk-pds-coach-header">
      <h1 style={titleStyle}>Player Updates</h1>
      <p style={copyStyle}>
        Add players from your roster and enter their latest measurables. Submit
        the batch when you&apos;re done — an admin will verify the numbers and
        apply them to each player&apos;s profile.
      </p>
    </div>
  );
}
