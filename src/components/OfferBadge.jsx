/**
 * OfferBadge — Sprint 007 hotfix HF-4
 *
 * Sibling of StatusPill. Renders a single offer milestone badge for either
 * the Verbal Offer (step 14) or Written Offer (step 15) journey state.
 *
 * The badge shape mirrors StatusPill (12px radius, 0.8125rem, weight 600)
 * so the visual language stays consistent across the four target surfaces:
 *   - Recruiting Scoreboard College column
 *   - Shortlist slide-out offer-chips row
 *   - Grit Fit Map popup (via SchoolDetailsCard)
 *   - Grit Fit Table inline beside school_name
 *
 * Visual semantics per HF-4 spec:
 *   verbal  — warm intent, gold/amber pill; var(--brand-gold) on dark text
 *   written — formal commitment, deep maroon; white on var(--brand-maroon)
 *
 * Props:
 *   variant: 'verbal' | 'written' (required)
 *   size:    'sm' | 'md' (optional, default 'md')
 *   className: string (optional)
 */

const SIZE_STYLES = {
  sm: { padding: '2px 8px', fontSize: '0.6875rem' },
  md: { padding: '4px 12px', fontSize: '0.8125rem' },
};

const VARIANTS = {
  verbal: {
    label: 'Verbal Offer',
    bg: 'var(--brand-gold, #D4AF37)',
    color: '#2A1F1A',
  },
  written: {
    label: 'Written Offer',
    bg: 'var(--brand-maroon, #8B3A3A)',
    color: '#FFFFFF',
  },
};

/**
 * Build the inline-HTML fragment for an offer badge inside a Leaflet popup.
 * Returns '' when variant is unknown so callers can safely concatenate. Mirrors
 * the React component's visual treatment so the Map popup and the React
 * surfaces stay consistent.
 */
export function buildOfferBadgeHtml(variant) {
  const config = VARIANTS[variant];
  if (!config) return '';
  const sizeStyle = SIZE_STYLES.md;
  return `<span data-testid="offer-badge" data-variant="${variant}" style="display:inline-block;background:${config.bg};color:${config.color};font-weight:600;border-radius:12px;padding:${sizeStyle.padding};font-size:${sizeStyle.fontSize};white-space:nowrap;font-family:var(--font-body);">${config.label}</span>`;
}

export default function OfferBadge({ variant, size = 'md', className }) {
  const config = VARIANTS[variant];
  if (!config) return null;

  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <span
      data-testid="offer-badge"
      data-variant={variant}
      className={className}
      style={{
        display: 'inline-block',
        backgroundColor: config.bg,
        color: config.color,
        fontWeight: 600,
        borderRadius: 12,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-body)',
      }}
    >
      {config.label}
    </span>
  );
}
