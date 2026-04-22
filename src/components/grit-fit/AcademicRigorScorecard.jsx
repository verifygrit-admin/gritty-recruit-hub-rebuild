/**
 * AcademicRigorScorecard — Sprint 003 D4.
 *
 * Merged card showing Academic Rigor Score and Test Optional Score side by
 * side with the spec-mandated captions.
 */

function pct(v) {
  if (v == null || isNaN(v)) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

export default function AcademicRigorScorecard({ academicRigorScore, testOptionalScore }) {
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

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div data-testid="academic-rigor-cell" style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: '0.75rem', color: '#6B6B6B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Academic Rigor Score
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700, color: '#8B3A3A', lineHeight: 1.1 }}>
            {pct(academicRigorScore)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6B6B6B', lineHeight: 1.3 }}>
            Highest composite SAT + GPA admissions standards you currently qualify for.
          </div>
        </div>

        <div data-testid="test-optional-cell" style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: '0.75rem', color: '#6B6B6B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Test Optional Score
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700, color: '#8B3A3A', lineHeight: 1.1 }}>
            {pct(testOptionalScore)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6B6B6B', lineHeight: 1.3 }}>
            Highest admissions standards you currently qualify for at test-optional schools.
          </div>
        </div>
      </div>
    </div>
  );
}
