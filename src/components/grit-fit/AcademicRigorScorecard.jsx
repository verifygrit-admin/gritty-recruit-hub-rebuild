/**
 * AcademicRigorScorecard — Sprint 003 D4 / Sprint 004 G1.
 *
 * Merged card showing Academic Rigor Score and Test Optional Score side by
 * side with the spec-mandated captions.
 *
 * Sprint 004 G1 (ruling A-5):
 *   Title row is now a <CollapsibleTitleStrip> controlled by the parent via
 *   { isCollapsed, onToggle, variant } props. When collapsed, the cell grid
 *   is hidden; the strip remains visible. Unwired consumers keep the
 *   original always-expanded rendering.
 */

import CollapsibleTitleStrip from '../CollapsibleTitleStrip.jsx';

function pct(v) {
  if (v == null || isNaN(v)) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

export default function AcademicRigorScorecard({
  academicRigorScore,
  testOptionalScore,
  isCollapsed,
  onToggle,
  variant = 'desktop',
}) {
  const hasCollapseWiring = typeof onToggle === 'function';
  const collapsed = hasCollapseWiring ? Boolean(isCollapsed) : false;

  return (
    <div
      data-testid="academic-rigor-scorecard"
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
            title="Academic Rigor Scores"
            isCollapsed={collapsed}
            onToggle={onToggle}
            variant={variant}
            id="academic-rigor-scorecard-strip"
            ariaControls="academic-rigor-scorecard-body"
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
          Academic Rigor Scores
        </div>
      )}

      {!collapsed && (
        <div
          id="academic-rigor-scorecard-body"
          data-testid="academic-rigor-scorecard-body"
          style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}
        >
          <div data-testid="academic-rigor-cell" style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: '0.75rem', color: '#6B6B6B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Academic Rigor Score
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.25rem, 7vw, 3rem)', fontWeight: 700, color: 'var(--brand-maroon)', lineHeight: 1.05 }}>
              {pct(academicRigorScore)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B6B6B', lineHeight: 1.4 }}>
              Your current GPA and P/SAT scores qualify you for schools that are <strong>NOT</strong>{' '}
              test optional and are equal to or below this percent rank of Academic Rigor.
            </div>
          </div>

          <div data-testid="test-optional-cell" style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: '0.75rem', color: '#6B6B6B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Test Optional Score
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.25rem, 7vw, 3rem)', fontWeight: 700, color: 'var(--brand-maroon)', lineHeight: 1.05 }}>
              {pct(testOptionalScore)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B6B6B', lineHeight: 1.4 }}>
              Your current GPA qualifies you for admission to schools that <strong>ARE</strong> test
              optional and are equal to or below this percent rank of Academic Rigor.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
