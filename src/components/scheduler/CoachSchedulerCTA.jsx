/**
 * CoachSchedulerCTA — Sprint 012 Phase 2 (revised)
 *
 * Sticky CTA strip pinned beneath the main nav on /athletes. Click smooth-
 * scrolls to the inline scheduler section anchored at #coach-scheduler-section.
 * The CTA owns its own scroll behavior; AthletesPage no longer passes an
 * onClick — the prior modal-open prop is removed.
 *
 * Render placement requirement: must be a direct sibling of <RecruitsTopNav />
 * and <RecruitsHero /> at the page-root <div> level. position: sticky anchors
 * against the page-root scroll container; nesting inside <main> would scope
 * the sticky behavior to <main>'s padded box.
 *
 * Token-only styling. <style> block + className pattern (Sprint 011 carry-
 * forward) to support :hover, :active, and the @media (max-width: 768px)
 * mobile rules.
 */

const SCROLL_TARGET_ID = 'coach-scheduler-section';

const STYLE = `
  .coach-scheduler-cta-strip {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--gf-bg-deep);
    border-bottom: 1px solid var(--gf-border);
    padding: var(--gf-space-sm) var(--gf-space-xl);
    display: flex;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }
  .coach-scheduler-cta-button {
    background: var(--gf-accent);
    color: var(--gf-text-on-accent);
    border: none;
    padding: 0.85rem 1.75rem;
    border-radius: var(--gf-radius-pill);
    font-family: var(--gf-body);
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: var(--gf-space-sm);
    transition: transform 0.12s ease, box-shadow 0.2s ease, background 0.15s;
    box-shadow: var(--gf-shadow-glow);
    text-align: center;
    line-height: 1.2;
  }
  .coach-scheduler-cta-button:hover {
    background: var(--gf-accent-hover);
    transform: translateY(-1px);
  }
  .coach-scheduler-cta-button:active {
    transform: translateY(0);
    background: var(--gf-accent-deep);
  }
  .coach-scheduler-cta-button:focus-visible {
    outline: 2px solid var(--gf-accent-deep);
    outline-offset: 3px;
  }
  .coach-scheduler-cta-button svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
  @media (max-width: 768px) {
    .coach-scheduler-cta-strip {
      padding: var(--gf-space-sm) var(--gf-space-md);
    }
    .coach-scheduler-cta-button {
      min-height: 44px;
      flex-wrap: wrap;
      justify-content: center;
      padding: 0.7rem 1.25rem;
      font-size: 0.9rem;
    }
  }
`;

// Matches the scroll-margin-top: 72px rule on .scheduler-section in
// CoachSchedulerSection.jsx. Single source of truth for the CTA-to-section
// landing offset.
const SCROLL_OFFSET_PX = 72;

export default function CoachSchedulerCTA() {
  // Imperative scroll. Replaces scrollIntoView({behavior: 'smooth'}) which
  // miscomputes the destination when a sticky element (this CTA strip)
  // sits above the target — sticky transforms to its pinned position
  // mid-scroll and the smooth animation can land the target underneath
  // the sticky bar (or cancel altogether on some browsers). Computing
  // the absolute scroll target from getBoundingClientRect + window.scrollY
  // and applying the 72px offset is deterministic across browsers and
  // matches the CSS scroll-margin-top buffer.
  const handleClick = () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const target = document.getElementById(SCROLL_TARGET_ID);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET_PX;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <div data-testid="coach-scheduler-cta-strip" className="coach-scheduler-cta-strip">
      <style>{STYLE}</style>
      <button
        type="button"
        data-testid="coach-scheduler-cta-button"
        className="coach-scheduler-cta-button"
        onClick={handleClick}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Coach? Schedule a Drop-In
      </button>
    </div>
  );
}
