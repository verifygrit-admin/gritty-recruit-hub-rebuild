/**
 * CoachReportsPage — Analytics and reporting for coach/counselor dashboard.
 * Includes: zero-match summary tile, pipeline blockage analytics,
 * recruiter engagement placeholder.
 *
 * Props passed from CoachDashboardPage shell:
 *   students, shortlistByStudent, allShortlistItems
 */
import { useState, useMemo } from 'react';
import CoachActivitySummary from '../../components/CoachActivitySummary.jsx';
import { getPhaseForStep } from '../../components/RecruitingJourney.jsx';

// ── Pipeline Blockage Computation ─────────────────────────────────────────────

const COACHING_TIPS = {
  1: "Students have schools on their shortlist but nothing beyond that yet.",
  2: "Help them find and complete the recruiting questionnaire for each school.",
  3: "Walk them through the admissions info form during a free period or advisory.",
  4: "Assistant coach contact often precedes the head coach — encourage follow-ups.",
  5: "Draft a template coach email together — personalization matters.",
  6: "A follow on Instagram or Twitter can open doors — show them how to send a non-DM public post tag.",
  7: "Junior Day invites usually come after initial contact — check steps 5 and 6 first.",
  8: "Visit invites follow engagement — are they staying in regular contact with the program?",
  9: "Camp invites signal serious interest — has the coach confirmed they've seen film?",
  10: "If coaches aren't texting, the relationship may need a restart. Review steps 5-6.",
  11: "A head coach call is a strong signal — make sure film and grades are current.",
  12: "Transcript requests are a buying signal. Help them get it to the school quickly.",
  13: "Financial info requests are late-stage — this is positive progress.",
  14: "Verbal offers are milestone moments. Celebrate and document it.",
  15: "Written offers are the final step — congratulations are in order.",
};

function computePipelineBlockage(shortlistByStudent) {
  const stepStats = {};
  const stepLabels = {};
  const studentsBlockedAtStep = {};

  for (const [userId, items] of Object.entries(shortlistByStudent)) {
    for (const item of items) {
      const steps = item.recruiting_journey_steps || [];
      for (const step of steps) {
        if (!step.step_id || step.completed === undefined) continue;
        const sid = step.step_id;
        if (!stepStats[sid]) {
          stepStats[sid] = { totalInstances: 0, completedInstances: 0 };
          stepLabels[sid] = step.label;
          studentsBlockedAtStep[sid] = new Set();
        }
        stepStats[sid].totalInstances++;
        if (step.completed) {
          stepStats[sid].completedInstances++;
        } else {
          studentsBlockedAtStep[sid].add(userId);
        }
      }
    }
  }

  return Object.entries(stepStats).map(([sidStr, stat]) => {
    const sid = parseInt(sidStr, 10);
    const blocked = stat.totalInstances - stat.completedInstances;
    const pct = stat.totalInstances > 0
      ? Math.round((blocked / stat.totalInstances) * 100)
      : 0;
    return {
      step_id: sid,
      label: stepLabels[sid],
      totalInstances: stat.totalInstances,
      completedInstances: stat.completedInstances,
      blockedInstances: blocked,
      blockedStudentCount: studentsBlockedAtStep[sid].size,
      blockageRate: pct,
    };
  }).sort((a, b) => b.blockageRate - a.blockageRate);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CoachReportsPage({ students, shortlistByStudent, allShortlistItems }) {
  const [showAllSteps, setShowAllSteps] = useState(false);

  const zeroMatchCount = useMemo(() =>
    students.filter(s => s.last_grit_fit_zero_match === true).length,
    [students]
  );

  const zeroMatchStudents = useMemo(() =>
    students.filter(s => s.last_grit_fit_zero_match === true),
    [students]
  );

  const pipeline = useMemo(() =>
    computePipelineBlockage(shortlistByStudent),
    [shortlistByStudent]
  );

  const topStuck = pipeline[0] || null;
  const displayedSteps = showAllSteps ? pipeline : pipeline.slice(0, 8);

  // Bulk mailto for zero-match students
  const zeroMatchMailto = useMemo(() => {
    const emails = zeroMatchStudents
      .map(s => s.email)
      .filter(Boolean);
    if (emails.length === 0) return null;
    return `mailto:${emails.join(',')}?subject=${encodeURIComponent('Your GRIT FIT Results')}&body=${encodeURIComponent("Hi there,\n\nI wanted to check in on your GRIT FIT recruiting profile. Let's talk about next steps.")}`;
  }, [zeroMatchStudents]);

  return (
    <div data-testid="coach-reports-page">
      {/* Existing Activity Summary (division/conference breakdowns) */}
      <CoachActivitySummary
        allShortlistItems={allShortlistItems}
        studentCount={students.length}
      />

      {/* Zero-Match Summary Tile */}
      <div style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 24,
      }}>
        <div style={{
          flex: '1 1 240px',
          background: '#FFFFFF',
          border: zeroMatchCount > 0 ? '2px solid var(--brand-maroon)' : '1px solid #E8E8E8',
          borderRadius: 8,
          padding: 20,
        }}>
          <div style={{
            fontSize: 12,
            color: '#6B6B6B',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 8,
            fontWeight: 600,
          }}>
            Zero GRIT FIT Matches
          </div>
          {zeroMatchCount > 0 ? (
            <>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--brand-gold)' }}>
                {zeroMatchCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6B6B6B', marginBottom: 12 }}>
                student{zeroMatchCount !== 1 ? 's' : ''} need support
              </div>
              {zeroMatchMailto && (
                <a
                  href={zeroMatchMailto}
                  style={{
                    display: 'inline-block',
                    padding: '6px 14px',
                    border: '1px solid var(--brand-maroon)',
                    borderRadius: 4,
                    color: 'var(--brand-maroon)',
                    backgroundColor: 'transparent',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Check in with these students
                </a>
              )}
            </>
          ) : (
            <div style={{ fontSize: '0.875rem', color: '#4CAF50', fontWeight: 500 }}>
              All students have GRIT FIT matches
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Blockage Analytics */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E8E8E8',
        borderRadius: 8,
        padding: 20,
        marginBottom: 24,
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: '#2C2C2C',
          margin: '0 0 16px',
        }}>
          Pipeline Blockage — Where Athletes Are Stuck
        </h3>

        {pipeline.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: '#6B6B6B', fontStyle: 'italic' }}>
            No shortlist activity yet. Pipeline data will appear once students start tracking their recruiting progress.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {displayedSteps.map(step => (
                <div key={step.step_id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid #E8E8E8',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#2C2C2C' }}>
                      Step {step.step_id}: {step.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B6B6B', marginTop: 2 }}>
                      {step.blockedInstances} instance{step.blockedInstances !== 1 ? 's' : ''} blocked &bull; {step.blockedStudentCount} student{step.blockedStudentCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ width: 180, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      flex: 1,
                      height: 8,
                      background: '#E8E8E8',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${step.blockageRate}%`,
                        background: 'var(--brand-gold)',
                        borderRadius: 4,
                      }} />
                    </div>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: 'var(--brand-maroon)',
                      width: 40,
                      textAlign: 'right',
                    }}>
                      {step.blockageRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {pipeline.length > 8 && (
              <button
                onClick={() => setShowAllSteps(!showAllSteps)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-maroon)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  marginTop: 12,
                  padding: 0,
                }}
              >
                {showAllSteps ? 'Show top 8 steps' : 'Show all 15 steps'}
              </button>
            )}

            {/* Top stuck step callout */}
            {topStuck && (() => {
              const stuckPhase = getPhaseForStep(topStuck.step_id);
              return (
              <div style={{
                background: '#F5EFE0',
                border: '1px solid var(--brand-gold)',
                borderRadius: 8,
                padding: 16,
                marginTop: 16,
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#2C2C2C', marginBottom: 4 }}>
                  Most Common Block: {topStuck.label}
                  {stuckPhase && (
                    <span style={{
                      marginLeft: 8,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: stuckPhase.color,
                    }}>
                      {stuckPhase.name} Phase
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6B6B6B', marginBottom: 8 }}>
                  {topStuck.blockageRate}% of school-shortlist pairs haven't reached this step.
                  This is the step your athletes most need help with right now.
                </div>
                {COACHING_TIPS[topStuck.step_id] && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--brand-maroon)', fontWeight: 500 }}>
                    {COACHING_TIPS[topStuck.step_id]}
                  </div>
                )}
              </div>
            );
            })()}
          </>
        )}
      </div>

      {/* Recruiter Engagement — Coming Soon */}
      <div style={{
        background: '#FFFFFF',
        border: '1px dashed #D4D4D4',
        borderRadius: 8,
        padding: 24,
        position: 'relative',
        marginBottom: 24,
      }}>
        <span style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: '#F5EFE0',
          border: '1px solid var(--brand-gold)',
          borderRadius: 12,
          padding: '4px 10px',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--brand-maroon)',
        }}>
          Coming Soon
        </span>

        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: '#2C2C2C',
          margin: '0 0 12px',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          Recruiter Engagement
        </h3>

        <p style={{ fontSize: '0.875rem', color: '#6B6B6B', lineHeight: 1.6, margin: 0 }}>
          Track which college coaching staff are most engaged with your athletes — and identify
          programs that are on shortlists but haven't initiated contact yet. This feature tracks
          engagement across email, social media, text, and progress through the 15-step recruiting
          journey. College coach contact data will power this view once the full recruiter model
          is available.
        </p>
      </div>
    </div>
  );
}
