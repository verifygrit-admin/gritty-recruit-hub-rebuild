/**
 * CoachStudentCard — displays a single student's profile summary, shortlist count,
 * and recruiting journey progress for the Coach Dashboard.
 *
 * Props:
 *   student: { user_id, name, position, grad_year, high_school, gpa, sat }
 *   shortlistItems: array of short_list_items for this student
 *   expanded: boolean
 *   onToggleExpand: () => void
 *   onSchoolClick: (item) => void — opens Panel 2 for this school (optional)
 */

const STATUS_LABELS = {
  currently_recommended: 'Currently Recommended',
  out_of_academic_reach: 'Out of Academic Reach',
  below_academic_fit: 'Below Academic Fit',
  out_of_athletic_reach: 'Out of Athletic Reach',
  below_athletic_fit: 'Below Athletic Fit',
  outside_geographic_reach: 'Outside Geographic Reach',
  not_evaluated: 'Not Evaluated',
};

const STATUS_COLORS = {
  currently_recommended: '#4CAF50',
  out_of_academic_reach: '#F44336',
  below_academic_fit: '#FF9800',
  out_of_athletic_reach: '#F44336',
  below_athletic_fit: '#FF9800',
  outside_geographic_reach: '#9C27B0',
  not_evaluated: '#6B6B6B',
};

function getJourneyProgress(items) {
  if (!items || items.length === 0) return { completed: 0, total: 0, pct: 0 };

  let totalCompleted = 0;
  let totalSteps = 0;

  for (const item of items) {
    const steps = item.recruiting_journey_steps || [];
    totalSteps += steps.length;
    totalCompleted += steps.filter(s => s.completed).length;
  }

  return {
    completed: totalCompleted,
    total: totalSteps,
    pct: totalSteps > 0 ? Math.round((totalCompleted / totalSteps) * 100) : 0,
  };
}

export default function CoachStudentCard({ student, shortlistItems, expanded, onToggleExpand, onSchoolClick }) {
  if (!student) return null;
  const itemCount = shortlistItems.length;
  const journey = getJourneyProgress(shortlistItems);

  return (
    <div
      data-testid={`coach-student-card-${student.user_id}`}
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E8E8',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: 16,
        overflow: 'hidden',
      }}
    >
      {/* Card header — always visible */}
      <button
        data-testid={`student-expand-${student.user_id}`}
        onClick={onToggleExpand}
        aria-expanded={expanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <h3 style={{
            margin: 0,
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#2C2C2C',
          }}>
            {student.name || 'Unnamed Student'}
          </h3>
          <div style={{ fontSize: '0.875rem', color: '#6B6B6B', marginTop: 4 }}>
            {[student.position, student.grad_year ? `Class of ${student.grad_year}` : null]
              .filter(Boolean)
              .join(' \u2022 ') || 'No profile details'}
          </div>
        </div>

        {/* Quick stats */}
        <div style={{
          display: 'flex',
          gap: 24,
          alignItems: 'center',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8B3A3A' }}>
              {itemCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>
              School{itemCount !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8B3A3A' }}>
              {journey.pct}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>
              Journey
            </div>
          </div>
          <span style={{
            fontSize: '1rem',
            color: '#6B6B6B',
            transition: 'transform 200ms',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            display: 'inline-block',
          }}>
            &#9660;
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          data-testid={`student-detail-${student.user_id}`}
          style={{
            borderTop: '1px solid #E8E8E8',
            padding: '16px 20px',
          }}
        >
          {/* Student academic stats */}
          <div style={{
            display: 'flex',
            gap: 24,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}>
            {student.gpa && (
              <div>
                <span style={{ fontSize: '0.75rem', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 }}>GPA</span>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2C2C2C' }}>{student.gpa}</div>
              </div>
            )}
            {student.sat && (
              <div>
                <span style={{ fontSize: '0.75rem', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 }}>SAT</span>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2C2C2C' }}>{student.sat}</div>
              </div>
            )}
            {student.high_school && (
              <div>
                <span style={{ fontSize: '0.75rem', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 }}>High School</span>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#2C2C2C' }}>{student.high_school}</div>
              </div>
            )}
          </div>

          {/* Overall journey progress bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
              color: '#6B6B6B',
              marginBottom: 4,
            }}>
              <span>Overall Recruiting Progress</span>
              <span>{journey.completed} of {journey.total} steps</span>
            </div>
            <div style={{
              height: 8,
              backgroundColor: '#E8E8E8',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              <div
                data-testid={`student-progress-bar-${student.user_id}`}
                style={{
                  height: '100%',
                  width: `${journey.pct}%`,
                  background: 'linear-gradient(90deg, #8B3A3A, #6B2C2C)',
                  borderRadius: 4,
                  transition: 'width 300ms ease-in-out',
                }}
              />
            </div>
          </div>

          {/* Per-school shortlist breakdown */}
          {itemCount === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#6B6B6B', fontStyle: 'italic' }}>
              This student has not added any schools to their shortlist yet.
            </p>
          ) : (
            <div>
              <h4 style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#2C2C2C',
                margin: '0 0 8px',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                Shortlisted Schools
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...shortlistItems]
                  .map(item => {
                    const steps = item.recruiting_journey_steps || [];
                    const done = steps.filter(s => s.completed).length;
                    const total = steps.length;
                    const completionPct = total > 0 ? done / total : 0;
                    return { ...item, _done: done, _total: total, _pct: completionPct };
                  })
                  .sort((a, b) => b._pct - a._pct || (a.school_name || '').localeCompare(b.school_name || ''))
                  .map(item => {
                  const done = item._done;
                  const total = item._total;
                  const itemPct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const isClickable = !!onSchoolClick;

                  return (
                    <div
                      key={item.id}
                      data-testid={`student-school-${item.id}`}
                      onClick={isClickable ? () => onSchoolClick(item) : undefined}
                      role={isClickable ? 'button' : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSchoolClick(item); } } : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 12px',
                        backgroundColor: '#F5EFE0',
                        borderRadius: 4,
                        flexWrap: 'wrap',
                        cursor: isClickable ? 'pointer' : 'default',
                        transition: 'background-color 150ms',
                      }}
                      onMouseEnter={isClickable ? (e) => { e.currentTarget.style.backgroundColor = '#EDE5D0'; } : undefined}
                      onMouseLeave={isClickable ? (e) => { e.currentTarget.style.backgroundColor = '#F5EFE0'; } : undefined}
                    >
                      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#2C2C2C' }}>
                            {item.school_name || `UNITID ${item.unitid}`}
                          </span>
                          {steps.find(s => s.step_id === 14 && s.completed) && (
                            <span style={{
                              background: '#D4AF37', color: '#2C2C2C', fontSize: '0.625rem',
                              fontWeight: 600, padding: '2px 6px', borderRadius: 12,
                            }}>
                              Verbal
                            </span>
                          )}
                          {steps.find(s => s.step_id === 15 && s.completed) && (
                            <span style={{
                              background: '#8B3A3A', color: '#FFFFFF', fontSize: '0.625rem',
                              fontWeight: 600, padding: '2px 6px', borderRadius: 12,
                            }}>
                              Written
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>
                          {[item.div, item.conference].filter(Boolean).join(' \u2022 ')}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: '#FFFFFF',
                        backgroundColor: STATUS_COLORS[item.grit_fit_status] || '#6B6B6B',
                        padding: '2px 8px',
                        borderRadius: 12,
                        whiteSpace: 'nowrap',
                      }}>
                        {STATUS_LABELS[item.grit_fit_status] || item.grit_fit_status}
                      </span>

                      {/* Mini progress */}
                      <div style={{ width: 80, flexShrink: 0 }}>
                        <div style={{
                          height: 6,
                          backgroundColor: '#E8E8E8',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${itemPct}%`,
                            backgroundColor: '#8B3A3A',
                            borderRadius: 3,
                          }} />
                        </div>
                        <div style={{ fontSize: '0.625rem', color: '#6B6B6B', textAlign: 'right', marginTop: 2 }}>
                          {done}/{total}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
