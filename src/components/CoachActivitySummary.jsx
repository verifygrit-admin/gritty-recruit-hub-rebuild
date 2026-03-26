/**
 * CoachActivitySummary — aggregated view of recruiting activity across a coach's students.
 * Shows which conferences and divisions students are targeting, with counts.
 *
 * Props:
 *   allShortlistItems: flat array of all short_list_items across all students
 *   studentCount: total number of students
 */

export default function CoachActivitySummary({ allShortlistItems, studentCount }) {
  if (!allShortlistItems || allShortlistItems.length === 0) {
    return (
      <div
        data-testid="coach-activity-summary"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E8E8E8',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#2C2C2C', margin: '0 0 8px' }}>
          Recruiting Activity Summary
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#6B6B6B', fontStyle: 'italic', margin: 0 }}>
          No recruiting activity yet. Students will appear here once they start building shortlists.
        </p>
      </div>
    );
  }

  // Aggregate by division
  const divisionCounts = {};
  const conferenceCounts = {};

  for (const item of allShortlistItems) {
    const div = item.div || 'Unknown';
    const conf = item.conference || 'Unknown';
    divisionCounts[div] = (divisionCounts[div] || 0) + 1;
    conferenceCounts[conf] = (conferenceCounts[conf] || 0) + 1;
  }

  // Sort descending by count
  const sortedDivisions = Object.entries(divisionCounts).sort((a, b) => b[1] - a[1]);
  const sortedConferences = Object.entries(conferenceCounts).sort((a, b) => b[1] - a[1]);

  // Overall journey stats
  let totalSteps = 0;
  let completedSteps = 0;
  for (const item of allShortlistItems) {
    const steps = item.recruiting_journey_steps || [];
    totalSteps += steps.length;
    completedSteps += steps.filter(s => s.completed).length;
  }
  const overallPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const barMaxWidth = 200;

  return (
    <div
      data-testid="coach-activity-summary"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E8E8',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: 20,
        marginBottom: 24,
      }}
    >
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#2C2C2C', margin: '0 0 16px' }}>
        Recruiting Activity Summary
      </h3>

      {/* Top-line stats */}
      <div style={{
        display: 'flex',
        gap: 32,
        flexWrap: 'wrap',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: '1px solid #E8E8E8',
      }}>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8B3A3A' }}>{studentCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Student{studentCount !== 1 ? 's' : ''}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8B3A3A' }}>{allShortlistItems.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Schools Tracked
          </div>
        </div>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8B3A3A' }}>{overallPct}%</div>
          <div style={{ fontSize: '0.75rem', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Avg Journey Progress
          </div>
        </div>
      </div>

      {/* Two-column layout for Division and Conference breakdowns */}
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {/* By Division */}
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <h4 style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#2C2C2C',
            margin: '0 0 12px',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            By Division
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedDivisions.map(([div, count]) => {
              const pct = Math.round((count / allShortlistItems.length) * 100);
              return (
                <div key={div} data-testid={`division-row-${div}`}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem',
                    color: '#2C2C2C',
                    marginBottom: 2,
                  }}>
                    <span>{div}</span>
                    <span style={{ color: '#6B6B6B' }}>
                      {count} school{count !== 1 ? 's' : ''} ({pct}%)
                    </span>
                  </div>
                  <div style={{
                    height: 6,
                    backgroundColor: '#E8E8E8',
                    borderRadius: 3,
                    overflow: 'hidden',
                    maxWidth: barMaxWidth,
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: '#D4AF37',
                      borderRadius: 3,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Conference — show top 10 */}
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <h4 style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#2C2C2C',
            margin: '0 0 12px',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            By Conference {sortedConferences.length > 10 ? `(Top 10 of ${sortedConferences.length})` : ''}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedConferences.slice(0, 10).map(([conf, count]) => {
              const pct = Math.round((count / allShortlistItems.length) * 100);
              return (
                <div key={conf} data-testid={`conference-row-${conf}`}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem',
                    color: '#2C2C2C',
                    marginBottom: 2,
                  }}>
                    <span>{conf}</span>
                    <span style={{ color: '#6B6B6B' }}>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div style={{
                    height: 6,
                    backgroundColor: '#E8E8E8',
                    borderRadius: 3,
                    overflow: 'hidden',
                    maxWidth: barMaxWidth,
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: '#8B3A3A',
                      borderRadius: 3,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
