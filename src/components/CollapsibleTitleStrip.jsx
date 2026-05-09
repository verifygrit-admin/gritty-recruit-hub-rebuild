/**
 * CollapsibleTitleStrip — Sprint 004 SC-1
 *
 * Reusable maroon/gold title strip with a chevron collapse indicator.
 * Pure presentational component — the CONSUMER manages isCollapsed state
 * (per operator ruling A-5). Wave 3 consumers: G1 (Athletic + Academic Fit
 * score strips), G4a (Division Mix strip), S1a (Pre-Read Docs).
 *
 * Color tokens sourced from src/index.css:
 *   --brand-maroon: #8B3A3A
 *   --brand-gold:   #D4AF37
 *
 * Props:
 *   title         (string, required)    — text rendered in the strip
 *   isCollapsed   (boolean, required)   — controlled state from parent
 *   onToggle      (() => void, required)— fires on click / Enter / Space
 *   variant       ('desktop' | 'mobile', optional, default 'desktop')
 *   id            (string, optional)    — element id for aria-controls wiring
 *   ariaControls  (string, optional)    — id of the region this strip controls
 */

const VARIANT_STYLES = {
  desktop: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: '1.125rem', // ~18px
    chevronSize: '1rem',
  },
  mobile: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: '1rem',     // ~16px
    chevronSize: '0.875rem',
  },
};

export default function CollapsibleTitleStrip({
  title,
  isCollapsed,
  onToggle,
  variant = 'desktop',
  id,
  ariaControls,
}) {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.desktop;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      onToggle();
    }
  };

  const stripStyle = {
    backgroundColor: 'var(--brand-maroon)',
    color: 'var(--brand-on-maroon-text)',
    padding: `${v.paddingVertical}px ${v.paddingHorizontal}px`,
    fontSize: v.fontSize,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    borderRadius: 4,
    outline: 'none',
  };

  const chevronStyle = {
    display: 'inline-block',
    fontSize: v.chevronSize,
    transition: 'transform 150ms ease',
    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
    marginLeft: 12,
  };

  return (
    <div
      id={id}
      role="button"
      tabIndex={0}
      aria-expanded={!isCollapsed}
      aria-controls={ariaControls}
      data-testid="collapsible-title-strip"
      data-variant={variant}
      data-collapsed={isCollapsed ? 'true' : 'false'}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      style={stripStyle}
    >
      <span data-testid="collapsible-title-strip-title">{title}</span>
      <span
        data-testid="collapsible-title-strip-chevron"
        aria-hidden="true"
        style={chevronStyle}
      >
        {/* Downward chevron — rotated -90deg via CSS when collapsed */}
        {'▼'}
      </span>
    </div>
  );
}
