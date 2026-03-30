/**
 * CoachStudentsPage — Student roster tab for the coach/counselor dashboard.
 * Extracted from CoachDashboardPage during Item 3 multi-page refactor.
 *
 * Props passed from CoachDashboardPage shell:
 *   students, shortlistByStudent
 */
import { useState, useMemo } from 'react';
import CoachStudentCard from '../../components/CoachStudentCard.jsx';
import PlayerCard from '../../components/PlayerCard.jsx';

// ── Offer badge utilities ─────────────────────────────────────────────────────

function getOfferStatus(shortlistItems) {
  let hasVerbal = false;
  let hasWritten = false;
  for (const item of shortlistItems) {
    const steps = item.recruiting_journey_steps || [];
    if (steps.find(s => s.step_id === 14 && s.completed)) hasVerbal = true;
    if (steps.find(s => s.step_id === 15 && s.completed)) hasWritten = true;
    if (hasVerbal && hasWritten) break;
  }
  return { hasVerbal, hasWritten };
}

export default function CoachStudentsPage({ students, shortlistByStudent }) {
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [filterGradYear, setFilterGradYear] = useState('');
  const [filterName, setFilterName] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [zeroMatchExpanded, setZeroMatchExpanded] = useState(false);

  // ── Filtering ──
  const filteredStudents = useMemo(() => {
    let arr = [...students];
    if (filterName.trim()) {
      const q = filterName.trim().toLowerCase();
      arr = arr.filter(s => (s.name || '').toLowerCase().includes(q));
    }
    if (filterGradYear) {
      const year = parseInt(filterGradYear, 10);
      arr = arr.filter(s => s.grad_year === year);
    }
    return arr;
  }, [students, filterName, filterGradYear]);

  // ── Sorting ──
  const sortedStudents = useMemo(() => {
    const arr = [...filteredStudents];
    switch (sortBy) {
      case 'name_asc':
        arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name_desc':
        arr.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'grad_year_asc':
        arr.sort((a, b) => (a.grad_year || 9999) - (b.grad_year || 9999));
        break;
      case 'grad_year_desc':
        arr.sort((a, b) => (b.grad_year || 0) - (a.grad_year || 0));
        break;
      case 'schools_desc':
        arr.sort((a, b) =>
          (shortlistByStudent[b.user_id] || []).length - (shortlistByStudent[a.user_id] || []).length
        );
        break;
      case 'activity_desc':
        arr.sort((a, b) => {
          const aDone = (shortlistByStudent[a.user_id] || []).reduce((sum, it) => sum + (it.recruiting_journey_steps || []).filter(s => s.completed).length, 0);
          const bDone = (shortlistByStudent[b.user_id] || []).reduce((sum, it) => sum + (it.recruiting_journey_steps || []).filter(s => s.completed).length, 0);
          return bDone - aDone;
        });
        break;
      case 'offers_desc':
        arr.sort((a, b) => {
          const aOffer = getOfferStatus(shortlistByStudent[a.user_id] || []);
          const bOffer = getOfferStatus(shortlistByStudent[b.user_id] || []);
          const aScore = (aOffer.hasWritten ? 2 : 0) + (aOffer.hasVerbal ? 1 : 0);
          const bScore = (bOffer.hasWritten ? 2 : 0) + (bOffer.hasVerbal ? 1 : 0);
          return bScore - aScore;
        });
        break;
      default:
        break;
    }
    return arr;
  }, [filteredStudents, sortBy, shortlistByStudent]);

  // ── Zero-match students ──
  const zeroMatchStudents = useMemo(() =>
    students.filter(s => s.last_grit_fit_zero_match === true),
    [students]
  );

  const zeroMatchDefault = zeroMatchStudents.length > 3;

  // ── Grad years for filter ──
  const gradYears = useMemo(() => {
    const years = new Set();
    for (const s of students) { if (s.grad_year) years.add(s.grad_year); }
    return [...years].sort();
  }, [students]);

  return (
    <div data-testid="coach-students-page">
      {/* Filter Bar */}
      <div
        data-testid="coach-filter-bar"
        style={{
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
          marginBottom: 16, padding: '12px 16px',
          backgroundColor: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: 8,
        }}
      >
        <input
          data-testid="filter-name"
          type="text"
          placeholder="Search by name..."
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          style={{
            flex: '1 1 180px', padding: '8px 12px', border: '1px solid #D4D4D4',
            borderRadius: 4, fontSize: '0.875rem', color: '#2C2C2C', minWidth: 140,
          }}
        />
        <select
          data-testid="filter-grad-year"
          value={filterGradYear}
          onChange={(e) => setFilterGradYear(e.target.value)}
          style={{
            padding: '8px 12px', border: '1px solid #D4D4D4', borderRadius: 4,
            fontSize: '0.875rem', color: '#2C2C2C', backgroundColor: '#FFFFFF',
          }}
        >
          <option value="">All Grad Years</option>
          {gradYears.map(y => <option key={y} value={y}>Class of {y}</option>)}
        </select>
        <select
          data-testid="sort-students"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '8px 12px', border: '1px solid #D4D4D4', borderRadius: 4,
            fontSize: '0.875rem', color: '#2C2C2C', backgroundColor: '#FFFFFF',
          }}
        >
          <option value="name_asc">Name (A-Z)</option>
          <option value="name_desc">Name (Z-A)</option>
          <option value="grad_year_asc">Grad Year (earliest)</option>
          <option value="grad_year_desc">Grad Year (latest)</option>
          <option value="schools_desc">Most Schools</option>
          <option value="activity_desc">Most Activity</option>
          <option value="offers_desc">Has Offers (first)</option>
        </select>
        {(filterName || filterGradYear) && (
          <button
            onClick={() => { setFilterName(''); setFilterGradYear(''); }}
            style={{
              background: 'none', border: 'none', color: '#8B3A3A',
              textDecoration: 'underline', cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Student Cards */}
      <div data-testid="coach-student-roster" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 14, padding: '8px 0',
      }}>
        {sortedStudents.map(student => {
          const items = shortlistByStudent[student.user_id] || [];
          const totalSteps = items.reduce((sum, it) => sum + (it.recruiting_journey_steps || []).length, 0);
          const completedSteps = items.reduce((sum, it) => sum + (it.recruiting_journey_steps || []).filter(s => s.completed).length, 0);
          const offers = getOfferStatus(items);

          return (
            <PlayerCard
              key={student.user_id}
              player={{
                id: student.user_id,
                name: student.name || 'Unnamed Student',
                position: student.position || '—',
                classYear: student.grad_year ? String(student.grad_year) : '—',
                email: student.email || null,
                gpa: student.gpa,
                shortlistCount: items.length,
                recruitingProgress: totalSteps > 0 ? completedSteps / totalSteps : 0,
                athleticFit: null,
                hasVerbalOffer: offers.hasVerbal,
                hasWrittenOffer: offers.hasWritten,
                isZeroMatch: student.last_grit_fit_zero_match === true && student.last_grit_fit_run_at != null,
                hudlUrl: student.hudl_url || null,
                avatarStoragePath: student.avatar_storage_path || null,
              }}
              onCardClick={() => setExpandedStudentId(
                expandedStudentId === student.user_id ? null : student.user_id
              )}
            />
          );
        })}
      </div>

      {/* Expanded detail */}
      {expandedStudentId && (
        <div style={{ marginTop: 16 }}>
          <CoachStudentCard
            student={students.find(s => s.user_id === expandedStudentId)}
            shortlistItems={shortlistByStudent[expandedStudentId] || []}
            expanded={true}
            onToggleExpand={() => setExpandedStudentId(null)}
          />
        </div>
      )}

      {/* No results after filtering */}
      {sortedStudents.length === 0 && students.length > 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#6B6B6B' }}>
          <p>No students match your filters.</p>
          <button
            onClick={() => { setFilterName(''); setFilterGradYear(''); }}
            style={{
              background: 'none', border: 'none', color: '#8B3A3A',
              textDecoration: 'underline', cursor: 'pointer', fontSize: '1rem',
            }}
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Zero-Match Collapsible Section */}
      {zeroMatchStudents.length > 0 && (
        <div style={{
          marginTop: 24,
          background: '#F5EFE0',
          border: '1px solid #D4AF37',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <button
            onClick={() => setZeroMatchExpanded(!zeroMatchExpanded)}
            aria-expanded={zeroMatchDefault || zeroMatchExpanded}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', padding: '12px 16px', background: 'none', border: 'none',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#2C2C2C', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Students Needing GRIT FIT Support
              <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#8B3A3A', fontWeight: 700 }}>
                {zeroMatchStudents.length} student{zeroMatchStudents.length !== 1 ? 's' : ''}
              </span>
            </span>
            <span style={{
              fontSize: '1rem', color: '#6B6B6B', transition: 'transform 200ms',
              transform: (zeroMatchDefault || zeroMatchExpanded) ? 'rotate(180deg)' : 'rotate(0)',
              display: 'inline-block',
            }}>
              &#9660;
            </span>
          </button>

          {(zeroMatchDefault || zeroMatchExpanded) && (
            <div style={{ padding: '0 16px 16px' }}>
              <p style={{ fontSize: '0.875rem', color: '#6B6B6B', margin: '0 0 12px' }}>
                These students ran GRIT FIT and found zero qualifying schools.
                Their profiles may need updates to GPA, position, or geographic preferences.
              </p>

              {zeroMatchStudents.map(student => {
                const firstName = student.name ? student.name.split(' ')[0] : 'Student';
                const mailto = student.email
                  ? `mailto:${student.email}?subject=${encodeURIComponent('Your GRIT FIT Results')}&body=${encodeURIComponent(`Hi ${firstName},\n\nI wanted to check in on your GRIT FIT recruiting profile. Let's talk about next steps.`)}`
                  : null;
                const lastRun = student.last_grit_fit_run_at
                  ? new Date(student.last_grit_fit_run_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Never run';

                return (
                  <div key={student.user_id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 12px', background: '#FFFFFF', borderRadius: 4,
                    marginBottom: 6, flexWrap: 'wrap',
                  }}>
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                      <span style={{ fontWeight: 700, color: '#2C2C2C', fontSize: '0.875rem' }}>
                        {student.name || 'Unnamed Student'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>
                      {student.grad_year ? `Class of ${student.grad_year}` : '—'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>
                      Last run: {lastRun}
                    </span>
                    {student.gpa && (
                      <span style={{ fontSize: '0.75rem', color: '#6B6B6B' }}>
                        GPA: {student.gpa}
                      </span>
                    )}
                    {mailto ? (
                      <a
                        href={mailto}
                        style={{
                          fontSize: '0.75rem', color: '#8B3A3A', fontWeight: 600,
                          textDecoration: 'none', padding: '4px 8px', border: '1px solid #8B3A3A',
                          borderRadius: 4,
                        }}
                      >
                        Email
                      </a>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.75rem', color: '#D4D4D4', padding: '4px 8px',
                          border: '1px solid #E8E8E8', borderRadius: 4, cursor: 'not-allowed',
                        }}
                        title="No email on file"
                      >
                        Email
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Bulk mailto */}
              {(() => {
                const emails = zeroMatchStudents.map(s => s.email).filter(Boolean);
                if (emails.length === 0) return null;
                const href = `mailto:${emails.join(',')}?subject=${encodeURIComponent('Your GRIT FIT Results')}&body=${encodeURIComponent("Hi there,\n\nI wanted to check in on your GRIT FIT recruiting profile. Let's talk about next steps.")}`;
                return (
                  <a
                    href={href}
                    style={{
                      display: 'inline-block', marginTop: 8, padding: '8px 16px',
                      border: '2px solid #8B3A3A', borderRadius: 4, color: '#8B3A3A',
                      backgroundColor: 'transparent', fontSize: '0.875rem', fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Email these students
                  </a>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
