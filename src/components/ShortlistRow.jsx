/**
 * ShortlistRow — list-layout row renderer for the Shortlist main view.
 *
 * Sprint 005 Track C — D4 + D5:
 *   D4: Alternating row backgrounds matching the Grit Fit Table View tokens.
 *       Odd index -> '#F5EFE0' (cream stripe), Even index -> '#FFFFFF'.
 *       Border 1px solid '#E8E8E8' (matches table-row borders).
 *   D5: A leftmost RANK cell whose body is unlabeled (mirrors the Grit Fit
 *       Table rank visual). The header strip is rendered by ShortlistPage,
 *       not here. Mobile pairing: on narrow viewports the rank is the
 *       leading element of the row card.
 *
 * Sprint 004 Wave 3b S2 layout (preserved): School name (primary, maroon) +
 * Division | Conference subline (muted), then the highest-priority StatusPill.
 * The trailing "N/total" rank indicator from S2 is REMOVED in Sprint 005 — the
 * leftmost rank column replaces it.
 *
 * Props:
 *   item:           short_list_items row (unitid, school_name, div,
 *                   conference, grit_fit_status, grit_fit_labels, ...)
 *   rank:           1-indexed position in the filtered+sorted list
 *   index:          0-indexed position used to pick the alternating background
 *                   token (D4). Optional; defaults to (rank - 1) so callers
 *                   that only pass `rank` keep working.
 *   onClick:        (item) => void
 *
 * Empty status handling (A-2): if both grit_fit_status is falsy and
 * grit_fit_labels is empty, no pill is rendered (StatusPill itself also
 * enforces this — we pass '' to suppress).
 */
import StatusPill from './StatusPill.jsx';
import { STATUS_ORDER } from '../lib/statusLabels.js';

// D4 — Grit Fit Table View row tokens (re-used as-is, no extraction needed).
// Source: src/components/GritFitTableView.jsx — desktop tbody row styling.
const ROW_BG_ODD = '#F5EFE0';   // cream stripe
const ROW_BG_EVEN = '#FFFFFF';  // white
const ROW_BORDER = '1px solid #E8E8E8';

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

export default function ShortlistRow({ item, rank, index, onClick }) {
  const primaryStatus = pickPrimaryStatus(item);

  const subline = [item.div, item.conference].filter(Boolean).join(' • ');

  // D4 — alternating background. `index` is preferred; fall back to (rank-1)
  // so existing callers that only pass `rank` still alternate correctly.
  const idx = typeof index === 'number' ? index : (Number(rank) || 1) - 1;
  const isOdd = idx % 2 === 1;
  const bg = isOdd ? ROW_BG_ODD : ROW_BG_EVEN;

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onClick) onClick(item);
    }
  };

  return (
    <div
      data-testid={`shortlist-row-${item.unitid}`}
      data-row-parity={isOdd ? 'odd' : 'even'}
      role="button"
      tabIndex={0}
      onClick={() => { if (onClick) onClick(item); }}
      onKeyDown={handleKey}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 18px',
        backgroundColor: bg,
        borderBottom: ROW_BORDER,
        cursor: 'pointer',
        flexWrap: 'wrap',
      }}
    >
      {/* D5 — Leftmost RANK cell. Body is unlabeled (just the number) per
          the Shortlist no-field-headers design. On mobile, this cell is the
          leading element of each row card (it sits first in the flex row,
          and on flex-wrap the card-style row keeps rank on the leading line). */}
      <div
        data-testid={`row-rank-${item.unitid}`}
        aria-label={`Rank ${rank}`}
        style={{
          flex: '0 0 auto',
          minWidth: 32,
          fontSize: '1rem',
          fontWeight: 700,
          color: MAROON,
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'left',
        }}
      >
        <span data-testid="row-rank-text">{rank}</span>
      </div>

      {/* School identity */}
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

      {/* Status pill */}
      <div
        data-testid="row-status-slot"
        style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}
      >
        {primaryStatus && <StatusPill status={primaryStatus} size="md" />}
      </div>
    </div>
  );
}
