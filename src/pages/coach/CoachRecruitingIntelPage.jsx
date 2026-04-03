/**
 * CoachRecruitingIntelPage — "School Interest Intelligence" tab panel.
 * Shows top 20 schools across the coach's linked students' shortlists,
 * ranked by student count and avg recruiting journey progress.
 *
 * Props from CoachDashboardPage shell:
 *   shortlistByStudent — { [user_id]: shortlist_item[] }
 *
 * Data flow:
 *   1. Aggregate shortlistByStudent by unitid (client-side)
 *   2. Fetch school details from schools table for matched unitids
 *   3. Merge and render top 20
 *
 * No migrations. No new tables. Read-only query on existing schools table.
 */
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient.js';

const MAX_JOURNEY_STEPS = 15;

export default function CoachRecruitingIntelPage({ shortlistByStudent }) {
  const [schoolDetails, setSchoolDetails] = useState({});
  const [loading, setLoading] = useState(true);

  // Step 1: Aggregate shortlist items by unitid
  const aggregated = useMemo(() => {
    const bySchool = {};

    for (const [userId, items] of Object.entries(shortlistByStudent)) {
      for (const item of items) {
        const uid = item.unitid;
        if (!uid) continue;

        if (!bySchool[uid]) {
          bySchool[uid] = { unitid: uid, studentIds: new Set(), completedStepCounts: [] };
        }
        bySchool[uid].studentIds.add(userId);

        // Count completed steps for this shortlist item
        const steps = item.recruiting_journey_steps || [];
        const completedCount = steps.filter(s => s.completed === true).length;
        bySchool[uid].completedStepCounts.push(completedCount);
      }
    }

    return Object.values(bySchool)
      .map(s => ({
        unitid: s.unitid,
        studentCount: s.studentIds.size,
        avgCompletedSteps: s.completedStepCounts.length > 0
          ? s.completedStepCounts.reduce((a, b) => a + b, 0) / s.completedStepCounts.length
          : 0,
      }))
      .sort((a, b) =>
        b.studentCount - a.studentCount || b.avgCompletedSteps - a.avgCompletedSteps
      )
      .slice(0, 20);
  }, [shortlistByStudent]);

  // Step 2: Fetch school details for top unitids
  useEffect(() => {
    if (aggregated.length === 0) {
      setLoading(false);
      return;
    }

    const unitids = aggregated.map(s => s.unitid);

    supabase
      .from('schools')
      .select('unitid, school_name, type, conference, prospect_camp_link, coach_link')
      .in('unitid', unitids)
      .then(({ data, error }) => {
        if (error) {
          console.error('RecruitingIntel school fetch error:', error);
          setLoading(false);
          return;
        }
        const map = {};
        for (const s of (data || [])) { map[s.unitid] = s; }
        setSchoolDetails(map);
        setLoading(false);
      });
  }, [aggregated]);

  // Step 3: Merge
  const schools = useMemo(() =>
    aggregated.map(agg => ({
      ...agg,
      ...(schoolDetails[agg.unitid] || {}),
    })),
    [aggregated, schoolDetails]
  );

  // ── Empty state ──
  if (!loading && aggregated.length === 0) {
    return (
      <div data-testid="recruiting-intel-empty" style={{
        background: '#FFFFFF',
        border: '1px solid #E8E8E8',
        borderRadius: 8,
        padding: 32,
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '1rem', color: '#6B6B6B', margin: 0 }}>
          No shortlist data yet — encourage students to build their school lists.
        </p>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#6B6B6B' }}>
        Loading school intelligence...
      </div>
    );
  }

  return (
    <div data-testid="recruiting-intel-page">
      {/* Section header */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: '#2C2C2C',
          margin: '0 0 4px',
        }}>
          School Interest Intelligence
        </h3>
        <p style={{
          fontSize: '0.875rem',
          color: '#6B6B6B',
          margin: 0,
          lineHeight: 1.5,
        }}>
          Schools your athletes are targeting — ranked by roster interest and recruiting momentum.
        </p>
      </div>

      {/* School cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {schools.map(school => {
          const avgSteps = Math.round(school.avgCompletedSteps * 10) / 10;
          const progressPct = (school.avgCompletedSteps / MAX_JOURNEY_STEPS) * 100;
          const hasCamp = !!school.prospect_camp_link;
          const hasCoachLink = !!school.coach_link;

          return (
            <div
              key={school.unitid}
              data-testid={`intel-card-${school.unitid}`}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E8E8E8',
                borderRadius: 8,
                padding: 20,
                marginBottom: 12,
              }}
            >
              {/* Row 1: School name + division + conference + athlete count */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 12,
              }}>
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#8B3A3A',
                    marginBottom: 2,
                  }}>
                    {school.school_name || `School ${school.unitid}`}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>
                    {[school.type, school.conference].filter(Boolean).join(' \u00B7 ')}
                  </div>
                </div>
                <span style={{
                  display: 'inline-block',
                  background: '#D4AF37',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: 12,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {school.studentCount} athlete{school.studentCount !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Row 2: Progress bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}>
                <div style={{
                  flex: 1,
                  height: 6,
                  background: '#E8E8E8',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progressPct}%`,
                    background: '#D4AF37',
                    borderRadius: 3,
                    transition: 'width 300ms ease',
                  }} />
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#2C2C2C',
                  whiteSpace: 'nowrap',
                  minWidth: 72,
                  textAlign: 'right',
                }}>
                  {avgSteps} / {MAX_JOURNEY_STEPS} steps
                </span>
              </div>

              {/* Row 3: Camp indicator + Coach link */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}>
                {/* Camp indicator */}
                {hasCamp ? (
                  <a
                    href={school.prospect_camp_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.8125rem',
                      color: '#2A6B5C',
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#4CAF50',
                      display: 'inline-block',
                      flexShrink: 0,
                    }} />
                    2026 Camp Available
                  </a>
                ) : (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.8125rem',
                    color: '#9E9E9E',
                  }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#BDBDBD',
                      display: 'inline-block',
                      flexShrink: 0,
                    }} />
                    No camp data yet
                  </span>
                )}

                {/* Coach link */}
                {hasCoachLink && (
                  <a
                    href={school.coach_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.8125rem',
                      color: '#8B3A3A',
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    Coaching Staff &rarr;
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
