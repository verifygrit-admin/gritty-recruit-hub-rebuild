/**
 * AthleticFitScorecard — Sprint 003 D4 / Sprint 004 G1.
 *
 * Per-division Athletic Fit breakout. Renders one row per tier in the
 * canonical order (Power 4 → G6 → FCS → D2 → D3). Each row is colored and
 * labeled by classifyAthleticFit — green "Athletic Fit" / yellow "Athletic
 * Stretch" / grey "Below Fit".
 *
 * Sprint 004 G1 (ruling A-5):
 *   Title row is now a <CollapsibleTitleStrip> controlled by the parent via
 *   { isCollapsed, onToggle, variant } props. When collapsed, the scorecard
 *   body (rows + caption) is hidden; the strip remains visible so the parent
 *   layout does not collapse entirely. Defaults keep the presentational
 *   shape backward-compatible — if the parent does not pass collapse props,
 *   the body renders in its original always-expanded form without a strip.
 */

import { TIER_ORDER } from '../../lib/constants.js';
import { classifyAthleticFit } from '../../lib/grit-fit/athleticFitThresholds.js';
import CollapsibleTitleStrip from '../CollapsibleTitleStrip.jsx';

export default function AthleticFitScorecard({
  athFit,
  isCollapsed,
  onToggle,
  variant = 'desktop',
}) {
  // Opt-in collapse: only render the strip when the parent wires it.
  const hasCollapseWiring = typeof onToggle === 'function';
  const collapsed = hasCollapseWiring ? Boolean(isCollapsed) : false;

  return (
    <div
      data-testid="athletic-fit-scorecard"
      style={{
        flex: '1 1 320px',
        minWidth: 300,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E8E8',
        borderRadius: 8,
        padding: '16px 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {hasCollapseWiring ? (
        <div style={{ marginBottom: collapsed ? 0 : 12 }}>
          <CollapsibleTitleStrip
            title="Athletic Fit Scores"
            isCollapsed={collapsed}
            onToggle={onToggle}
            variant={variant}
            id="athletic-fit-scorecard-strip"
            ariaControls="athletic-fit-scorecard-body"
          />
        </div>
      ) : (
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          color: '#6B6B6B',
          marginBottom: 12,
        }}>
          Athletic Fit Scores
        </div>
      )}

      {!collapsed && (
        <div
          id="athletic-fit-scorecard-body"
          data-testid="athletic-fit-scorecard-body"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TIER_ORDER.map(tier => {
              const score = athFit?.[tier];
              const pct = score != null && !isNaN(score) ? (score * 100).toFixed(1) : null;
              const bucket = classifyAthleticFit(score);
              return (
                <div
                  key={tier}
                  data-testid={`athletic-fit-row-${tier}`}
                  data-tone={bucket.tone}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '8px 12px',
                    borderRadius: 6,
                    backgroundColor: bucket.bg,
                    border: `1px solid ${bucket.color}`,
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#2C2C2C', fontSize: '0.95rem', minWidth: 80 }}>
                    {tier}
                  </span>
                  <span style={{ fontWeight: 700, color: bucket.color, fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>
                    {pct != null ? `${pct}%` : '—'}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: bucket.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {bucket.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#6B6B6B', lineHeight: 1.4 }}>
            Your percent rank compared to the distribution of Height, Weight, and Speed of all
            players in each level of college football. A score of 50% means your athletic metrics
            equate to the average athletic metrics for that level of play.
          </div>
        </div>
      )}
    </div>
  );
}
