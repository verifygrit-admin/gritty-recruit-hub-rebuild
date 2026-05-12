/**
 * BulkPdsBackground — Sprint 026 Phase 1a (Coach UI), Q5 design lock.
 *
 * Fixed-position background image + school-token overlay layer for the
 * `/coach/player-updates` page. Image is the supplied "GrittyFB - Coach Bulk
 * PDS Page Background Image.png" (src/assets). Overlay color uses the
 * existing school-token CSS var `--brand-overlay-rgba` (already keyed to
 * BC High maroon vs Belmont Hill palette in `index.css`).
 *
 * Q5 — Locked overlay opacity: α = 0.70 (post Phase 1a UI-tuning subagent
 * recommendation; rationale recorded in docs/sprints/SPRINT_026_PLAN.md §7).
 * Range allowance per Q5: [0.65, 0.80]. 0.70 sits one notch above the
 * α=0.65 baseline to preserve copy contrast against the bright midfield
 * highlights in the supplied image without flattening the background's
 * stadium texture.
 */

import bulkPdsBg from '../../assets/GrittyFB - Coach Bulk PDS Page Background Image.png';

// Q5 LOCKED — do not adjust without re-running the UI-tuning subagent and
// updating SPRINT_026_PLAN.md §7. Range: [0.65, 0.80].
const OVERLAY_ALPHA = 0.70;

export default function BulkPdsBackground() {
  return (
    <div
      data-testid="bulk-pds-coach-background"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundImage: `url(${bulkPdsBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      {/* School-token overlay layer. Inherits `--brand-overlay-rgba`
          for school theming; OVERLAY_ALPHA is applied via the wrapper's
          `opacity` so the token's RGB values stay authoritative. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: 'var(--brand-overlay-rgba, rgba(139, 58, 58, 1))',
          opacity: OVERLAY_ALPHA,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export const __OVERLAY_ALPHA = OVERLAY_ALPHA;
