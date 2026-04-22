/**
 * SchoolDetailsCard — read-only content component for the school details view
 * shown inside SC-3 <SlideOutShell> on G5 (map marker click) and G7b (mobile
 * GRIT FIT table row tap).
 *
 * Sprint 004 Wave 1 SC-4. Single source of truth for the school-detail body
 * surfaced in the student view. Consumers in Wave 3 (G5 map wiring, G7b table
 * wiring) render this inside SC-3; the shell owns the close button — this
 * component is content-only.
 *
 * Extraction baseline: the existing Leaflet popup markup built in
 * GritFitMapView.jsx buildPopupHtml() — metrics rendered as a 2-column grid
 * (Location, ADLTV, Adm. Selectivity, ADLTV Rank, Admissions Rate, Graduation
 * Rate). The same six metrics are preserved here. DROI / Annual Net Cost /
 * Fastest Payback are S3-specific (Shortlist slide-out) per operator ruling
 * A-3 and are NOT reused here — they live on ShortlistCard.jsx.
 *
 * Props:
 *   school:     object (required) — a scored school record from
 *               runGritFitScoring().scored[]. Expected fields (all tolerated
 *               when missing): unitid, school_name, conference, type (tier
 *               label used in both legend and pin color), city, state, dist,
 *               school_type (Adm. Selectivity label), adltv, adltv_rank,
 *               admissions_rate, graduation_rate, matchRank.
 *   statusKey:  string | null (optional) — one of the six STATUS_LABELS keys.
 *               When provided, renders <StatusPill status={statusKey} />.
 *               When null / undefined / unknown / 'not_evaluated', renders
 *               nothing (StatusPill enforces this internally per A-2).
 *   onClose:    () => void (optional) — when rendered INSIDE SC-3
 *               <SlideOutShell>, the shell owns close; leave this unset. When
 *               rendered outside a shell, pass a handler and a close affordance
 *               is shown in the top-right.
 */
import StatusPill from './StatusPill.jsx';

function formatMoney(v) {
  if (v == null) return 'N/A';
  return '$' + Math.round(Number(v)).toLocaleString();
}

function formatPct(v) {
  if (v == null || Number.isNaN(Number(v))) return 'N/A';
  return Math.round(Number(v)) + '%';
}

function formatRank(v) {
  if (v == null) return 'N/A';
  return '#' + Number(v).toLocaleString();
}

function formatDist(v) {
  if (v == null || Number.isNaN(Number(v))) return null;
  return `${Math.round(Number(v))} miles`;
}

const cardStyle = {
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  backgroundColor: '#FFFFFF',
  padding: 24,
  boxSizing: 'border-box',
  color: '#2C2C2C',
};

const nameStyle = {
  margin: 0,
  color: '#8B3A3A',
  fontSize: '1.5rem',
  fontWeight: 700,
  lineHeight: 1.2,
};

const metaStyle = {
  margin: '4px 0 0',
  color: '#6B6B6B',
  fontSize: '0.9375rem',
  fontWeight: 500,
};

const labelStyle = {
  margin: '0 0 4px',
  color: '#6B6B6B',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const valueStyle = {
  margin: 0,
  fontSize: '0.9375rem',
  color: '#2C2C2C',
};

export default function SchoolDetailsCard({ school, statusKey, onClose }) {
  if (!school) return null;

  const name = school.school_name || 'Unknown';
  const division = school.type || null;
  const conf = school.conference || null;
  const city = school.city || '';
  const state = school.state || '';
  const location = city && state ? `${city}, ${state}` : city || state || null;
  const distLabel = formatDist(school.dist);
  const selectivity = school.school_type || null;

  // Division and conference render as a single pipe-delimited meta line to
  // match the existing map popup treatment (and ShortlistCard visual parity).
  const metaParts = [division, conf].filter(Boolean);

  return (
    <div data-testid={`school-details-card-${school.unitid ?? 'unknown'}`} style={cardStyle}>
      {/* Optional close affordance for standalone use. Inside SC-3
          <SlideOutShell>, leave onClose unset — the shell owns close. */}
      {onClose && (
        <button
          type="button"
          data-testid="school-details-close"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            color: '#6B6B6B',
            fontSize: '1.25rem',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}

      {/* Header — school name, then division | conference meta, then status
          pill (below the school name, matching Sprint 003 ShortlistCard visual
          parity). */}
      <h3 data-testid="sdc-school-name" style={nameStyle}>{name}</h3>

      {metaParts.length > 0 && (
        <p data-testid="sdc-school-meta" style={metaStyle}>
          {metaParts.join(' | ')}
        </p>
      )}

      {/* Status pill. StatusPill renders null internally for null / unknown /
          'not_evaluated' (A-2). No conditional needed here, but we gate the
          wrapper <div> so we don't emit an empty flex row. */}
      {statusKey && (
        <div data-testid="sdc-status-slot" style={{ marginTop: 10 }}>
          <StatusPill status={statusKey} />
        </div>
      )}

      {/* Distance — shown as its own line when provided. Matches the map
          popup's Location row grouping but split out here for scannability. */}
      {distLabel && (
        <p data-testid="sdc-distance" style={{ ...metaStyle, margin: '8px 0 0' }}>
          {distLabel}
        </p>
      )}

      {/* Metrics grid — preserves the six-field layout from GritFitMapView's
          Leaflet popup. Fields that are missing from the school record render
          as 'N/A' so the grid geometry stays stable. */}
      <div
        data-testid="sdc-metrics"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px 16px',
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid #F0F0F0',
        }}
      >
        <div>
          <p style={labelStyle}>Location</p>
          <p style={valueStyle}>{location || 'N/A'}</p>
        </div>
        <div>
          <p style={labelStyle}>ADLTV</p>
          <p style={valueStyle}>{formatMoney(school.adltv)}</p>
        </div>
        <div>
          <p style={labelStyle}>Adm. Selectivity</p>
          <p style={valueStyle}>{selectivity || 'N/A'}</p>
        </div>
        <div>
          <p style={labelStyle}>ADLTV Rank</p>
          <p style={valueStyle}>{formatRank(school.adltv_rank)}</p>
        </div>
        <div>
          <p style={labelStyle}>Admissions Rate</p>
          <p style={valueStyle}>{formatPct(school.admissions_rate)}</p>
        </div>
        <div>
          <p style={labelStyle}>Graduation Rate</p>
          <p style={valueStyle}>{formatPct(school.graduation_rate)}</p>
        </div>
      </div>

      {/* GRIT FIT match rank (optional). Rendered only when the scoring
          engine has tagged the school with matchRank. */}
      {school.matchRank != null && (
        <p
          data-testid="sdc-match-rank"
          style={{ margin: '16px 0 0', fontSize: '0.875rem', color: '#6B6B6B' }}
        >
          GRIT FIT Match Rank: <strong style={{ color: '#8B3A3A' }}>#{school.matchRank}</strong>
        </p>
      )}
    </div>
  );
}
