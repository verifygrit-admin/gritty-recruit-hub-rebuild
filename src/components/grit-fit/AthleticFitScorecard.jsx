/**
 * AthleticFitScorecard — Sprint 003 D4.
 *
 * Per-division Athletic Fit breakout. Renders one row per tier in the
 * canonical order (Power 4 → G6 → FCS → D2 → D3). Each row is colored and
 * labeled by classifyAthleticFit — green "Athletic Fit" / yellow "Athletic
 * Stretch" / grey "Below Fit".
 */

import { TIER_ORDER } from '../../lib/constants.js';
import { classifyAthleticFit } from '../../lib/grit-fit/athleticFitThresholds.js';

export default function AthleticFitScorecard({ athFit }) {
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

      <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#6B6B6B' }}>
        Compared to matched schools.
      </div>
    </div>
  );
}
