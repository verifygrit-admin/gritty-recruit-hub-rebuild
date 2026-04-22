/**
 * ShortlistRow — list-layout row renderer for the Shortlist main view.
 * Sprint 004 Wave 3b S2. Replaces the card layout (ShortlistCard.jsx) with a
 * single-line row matching the PDF page 7 screenshot.
 *
 * Layout (left -> right):
 *   - School name (primary, maroon) + Division | Conference (secondary, muted)
 *   - StatusPill (highest-priority label per STATUS_ORDER, or none)
 *   - Rank indicator "N/total" with maroon progress-bar accent
 *
 * Props:
 *   item:           short_list_items row (unitid, school_name, div,
 *                   conference, grit_fit_status, grit_fit_labels, ...)
 *   rank:           1-indexed position in the filtered+sorted list
 *   totalFiltered:  count of the filtered list (denominator)
 *   onClick:        (item) => void
 *
 * Empty status handling (A-2): if both grit_fit_status is falsy and
 * grit_fit_labels is empty, no pill is rendered (StatusPill itself also
 * enforces this — we pass '' to suppress).
 */
import StatusPill from './StatusPill.jsx';
import { STATUS_ORDER } from '../lib/statusLabels.js';

const CREAM_BG = '#F5EADF';
const MAROON = '#8B3A3A';
const MUTED = '#6B6B6B';

/**
 * Pick the highest-priority status key for display.
 * Prefers grit_fit_labels (multi-label array) ordered by STATUS_ORDER;
 * falls back to grit_fit_status (single key). Returns '' if nothing valid.
 */
export function pickPrimaryStatus(item) {
  const labels = Array.isArray(item?.grit_fit_labels) ? item.grit_fit_labels : [];
  if (labels.length > 0) {
    const ordered = STATUS_ORDER.find((key) => labels.includes(key));
    if (ordered) return ordered;
  }
  return item?.grit_fit_status || '';
}

export default function ShortlistRow({ item, rank, totalFiltered, onClick }) {
  const primaryStatus = pickPrimaryStatus(item);

  const subline = [item.div, item.conference].filter(Boolean).join(' • ');

  const pct = totalFiltered > 0 ? Math.max(0, Math.min(1, rank / totalFiltered)) : 0;

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onClick) onClick(item);
    }
  };

  return (
    <div
      data-testid={`shortlist-row-${item.unitid}`}
      role="button"
      tabIndex={0}
      onClick={() => { if (onClick) onClick(item); }}
      onKeyDown={handleKey}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 18px',
        backgroundColor: CREAM_BG,
        borderBottom: '1px solid #E6D7C3',
        cursor: 'pointer',
        flexWrap: 'wrap',
      }}
    >
      {/* Left: school identity */}
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <div
          data-testid="row-school-name"
          style={{
            fontSize: '1.0625rem',
            fontWeight: 700,
            color: MAROON,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.school_name}
        </div>
        {subline && (
          <div
            data-testid="row-subline"
            style={{
              fontSize: '0.8125rem',
              color: MUTED,
              marginTop: 2,
            }}
          >
            {subline}
          </div>
        )}
      </div>

      {/* Center-right: status pill */}
      <div
        data-testid="row-status-slot"
        style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}
      >
        {primaryStatus && <StatusPill status={primaryStatus} size="md" />}
      </div>

      {/* Right: rank indicator */}
      <div
        data-testid={`row-rank-${item.unitid}`}
        aria-label={`Rank ${rank} of ${totalFiltered}`}
        style={{
          flex: '0 0 auto',
          minWidth: 96,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
        }}
      >
        <div
          data-testid="row-rank-text"
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: MAROON,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {rank}/{totalFiltered}
        </div>
        <div
          aria-hidden="true"
          style={{
            width: 80,
            height: 6,
            backgroundColor: '#E6D7C3',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct * 100}%`,
              height: '100%',
              backgroundColor: MAROON,
            }}
          />
        </div>
      </div>
    </div>
  );
}
