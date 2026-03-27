/**
 * GritFitScoreDashboard — three-metric display at top of GRIT FIT results page.
 * Shows Athletic Fit Score, Academic Rigor Score, and Test Optional Score.
 * Light theme adaptation.
 */
export default function GritFitScoreDashboard({ scores, studentName }) {
  const metrics = [
    {
      label: 'Athletic Fit Score',
      value: scores.athleticFit,
      sub: 'Compared to matched schools',
    },
    {
      label: 'Academic Rigor Score',
      value: scores.academicRigor,
      sub: 'SAT + GPA composite',
    },
    {
      label: 'Test Optional Score',
      value: scores.testOptional,
      sub: 'GPA-only score',
    },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16,
      }}>
        {metrics.map(m => {
          const pct = m.value != null ? (m.value * 100).toFixed(1) : null;
          return (
            <div key={m.label} style={{
              flex: '1 1 200px', minWidth: 180,
              backgroundColor: '#FFFFFF', border: '1px solid #E8E8E8',
              borderRadius: 8, padding: '16px 20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
                color: '#6B6B6B',
              }}>
                {m.label}
              </div>
              <div style={{
                fontFamily: 'var(--font-heading)', fontSize: '2rem',
                fontWeight: 700, color: '#8B3A3A', lineHeight: 1.1,
              }}>
                {pct != null ? `${pct}%` : '—'}
              </div>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                color: '#6B6B6B',
              }}>
                {m.sub}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
