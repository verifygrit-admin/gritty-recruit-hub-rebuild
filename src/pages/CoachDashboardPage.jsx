/**
 * Coach Dashboard Page — role-gated view for coaches and guidance counselors.
 * Shows student roster, per-student shortlist progress, and aggregated recruiting activity.
 *
 * UX Spec: UX_SPECS_SUMMARY.md Section 8 (Coach Dashboard — pending formal spec)
 *
 * Data flow:
 *   1. Verify user is hs_coach or hs_guidance_counselor (via useAuth userType)
 *   2. Load linked students via hs_coach_students or hs_counselor_students
 *   3. Load profiles for those students (RLS grants coach/counselor SELECT)
 *   4. Load short_list_items for those students (RLS grants coach/counselor SELECT)
 *   5. Render roster, per-student cards, and activity summary
 *
 * Identity: user_id is the sole key — NO SAID
 */
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';
import CoachStudentCard from '../components/CoachStudentCard.jsx';
import CoachActivitySummary from '../components/CoachActivitySummary.jsx';
import PlayerCard from '../components/PlayerCard.jsx';

const ALLOWED_ROLES = ['hs_coach', 'hs_guidance_counselor'];

export default function CoachDashboardPage() {
  const { session, userType, loading: authLoading } = useAuth();

  // Data state
  const [students, setStudents] = useState([]); // profiles joined with link data
  const [shortlistByStudent, setShortlistByStudent] = useState({}); // { [user_id]: [...items] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [filterGradYear, setFilterGradYear] = useState('');
  const [filterName, setFilterName] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');

  const isCoach = userType === 'hs_coach';
  const isCounselor = userType === 'hs_guidance_counselor';
  const roleLabel = isCoach ? 'Coach' : isCounselor ? 'Counselor' : '';

  // ── Data loading ──
  useEffect(() => {
    if (authLoading) return;
    if (!session || !ALLOWED_ROLES.includes(userType)) {
      setLoading(false);
      return;
    }
    loadDashboardData();
  }, [session, userType, authLoading]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const userId = session.user.id;

      // Step 1: Get linked student user_ids
      let studentUserIds = [];

      if (isCoach) {
        const { data: links, error: linkErr } = await supabase
          .from('hs_coach_students')
          .select('student_user_id')
          .eq('coach_user_id', userId);

        if (linkErr) {
          setError('Failed to load student roster. Please try again.');
          setLoading(false);
          return;
        }
        studentUserIds = (links || []).map(l => l.student_user_id);
      } else if (isCounselor) {
        const { data: links, error: linkErr } = await supabase
          .from('hs_counselor_students')
          .select('student_user_id')
          .eq('counselor_user_id', userId);

        if (linkErr) {
          setError('Failed to load student roster. Please try again.');
          setLoading(false);
          return;
        }
        studentUserIds = (links || []).map(l => l.student_user_id);
      }

      if (studentUserIds.length === 0) {
        setStudents([]);
        setShortlistByStudent({});
        setLoading(false);
        return;
      }

      // Step 2: Fetch profiles and shortlist items in parallel
      // RLS policies grant coach/counselor SELECT on profiles and short_list_items
      // for their linked students
      const [profilesRes, shortlistRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, name, position, grad_year, high_school, gpa, sat, state')
          .in('user_id', studentUserIds),
        supabase
          .from('short_list_items')
          .select('*')
          .in('user_id', studentUserIds),
      ]);

      if (profilesRes.error) {
        setError('Failed to load student profiles. Please try again.');
        setLoading(false);
        return;
      }

      // Build profiles array — include students even if they have no profile row yet
      const profileMap = {};
      for (const p of (profilesRes.data || [])) {
        profileMap[p.user_id] = p;
      }

      const studentList = studentUserIds.map(uid => {
        return profileMap[uid] || {
          user_id: uid,
          name: null,
          position: null,
          grad_year: null,
          high_school: null,
          gpa: null,
          sat: null,
          state: null,
        };
      });

      setStudents(studentList);

      // Group shortlist items by student user_id
      const grouped = {};
      for (const uid of studentUserIds) {
        grouped[uid] = [];
      }
      for (const item of (shortlistRes.data || [])) {
        if (grouped[item.user_id]) {
          grouped[item.user_id].push(item);
        }
      }
      setShortlistByStudent(grouped);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('CoachDashboard loadData error:', err);
    }

    setLoading(false);
  };

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
      case 'schools_desc': {
        arr.sort((a, b) => {
          const aCount = (shortlistByStudent[a.user_id] || []).length;
          const bCount = (shortlistByStudent[b.user_id] || []).length;
          return bCount - aCount;
        });
        break;
      }
      case 'activity_desc': {
        arr.sort((a, b) => {
          const aItems = shortlistByStudent[a.user_id] || [];
          const bItems = shortlistByStudent[b.user_id] || [];
          const aDone = aItems.reduce((sum, it) => sum + (it.recruiting_journey_steps || []).filter(s => s.completed).length, 0);
          const bDone = bItems.reduce((sum, it) => sum + (it.recruiting_journey_steps || []).filter(s => s.completed).length, 0);
          return bDone - aDone;
        });
        break;
      }
      default:
        break;
    }

    return arr;
  }, [filteredStudents, sortBy, shortlistByStudent]);

  // ── All shortlist items for summary ──
  const allShortlistItems = useMemo(() => {
    return Object.values(shortlistByStudent).flat();
  }, [shortlistByStudent]);

  // ── Unique grad years for filter dropdown ──
  const gradYears = useMemo(() => {
    const years = new Set();
    for (const s of students) {
      if (s.grad_year) years.add(s.grad_year);
    }
    return [...years].sort();
  }, [students]);

  // ── Role gate ──
  if (!authLoading && (!session || !ALLOWED_ROLES.includes(userType))) {
    return (
      <div data-testid="coach-dashboard-denied" style={{ padding: 48, textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8B3A3A', margin: '0 0 8px' }}>
          Access Denied
        </h2>
        <p style={{ fontSize: '1rem', color: '#6B6B6B' }}>
          The Coach Dashboard is available to coaches and guidance counselors only.
        </p>
      </div>
    );
  }

  // ── Loading state ──
  if (loading || authLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#6B6B6B' }}>
        Loading {roleLabel.toLowerCase()} dashboard...
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ color: '#8B3A3A', fontSize: '1.125rem', marginBottom: 16 }}>{error}</p>
        <button
          onClick={loadDashboardData}
          style={{
            padding: '12px 24px', backgroundColor: '#8B3A3A', color: '#FFFFFF',
            border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty state ──
  if (students.length === 0) {
    return (
      <div data-testid="coach-dashboard-empty" style={{ padding: 48, textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#8B3A3A', margin: '0 0 8px' }}>
          {roleLabel} Dashboard
        </h2>
        <h3 style={{ fontSize: '1.25rem', color: '#2C2C2C', margin: '24px 0 8px' }}>
          No students linked yet.
        </h3>
        <p style={{ fontSize: '1rem', color: '#6B6B6B', margin: '0 0 24px' }}>
          Students will appear here once they confirm you as their {isCoach ? 'coach' : 'counselor'} during signup.
        </p>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div data-testid="coach-dashboard-page">
      {/* Page Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 12, marginBottom: 8,
      }}>
        <div>
          <h2
            data-testid="coach-dashboard-title"
            style={{ fontSize: '2rem', fontWeight: 700, color: '#8B3A3A', margin: '0 0 4px' }}
          >
            {roleLabel} Dashboard
          </h2>
          <p style={{ fontSize: '1.125rem', color: '#6B6B6B', margin: 0 }}>
            {filteredStudents.length === students.length
              ? `${students.length} student${students.length !== 1 ? 's' : ''}`
              : `${filteredStudents.length} of ${students.length} students`}
          </p>
        </div>

        <button
          data-testid="refresh-dashboard-btn"
          onClick={loadDashboardData}
          style={{
            padding: '8px 16px',
            border: '2px solid #8B3A3A',
            borderRadius: 4,
            backgroundColor: 'transparent',
            color: '#8B3A3A',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Activity Summary */}
      <CoachActivitySummary
        allShortlistItems={allShortlistItems}
        studentCount={students.length}
      />

      {/* Filter Bar */}
      <div
        data-testid="coach-filter-bar"
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 16,
          padding: '12px 16px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E8E8E8',
          borderRadius: 8,
        }}
      >
        {/* Name search */}
        <input
          data-testid="filter-name"
          type="text"
          placeholder="Search by name..."
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          style={{
            flex: '1 1 180px',
            padding: '8px 12px',
            border: '1px solid #D4D4D4',
            borderRadius: 4,
            fontSize: '0.875rem',
            color: '#2C2C2C',
            minWidth: 140,
          }}
        />

        {/* Grad year filter */}
        <select
          data-testid="filter-grad-year"
          value={filterGradYear}
          onChange={(e) => setFilterGradYear(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #D4D4D4',
            borderRadius: 4,
            fontSize: '0.875rem',
            color: '#2C2C2C',
            backgroundColor: '#FFFFFF',
          }}
        >
          <option value="">All Grad Years</option>
          {gradYears.map(y => (
            <option key={y} value={y}>Class of {y}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          data-testid="sort-students"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #D4D4D4',
            borderRadius: 4,
            fontSize: '0.875rem',
            color: '#2C2C2C',
            backgroundColor: '#FFFFFF',
          }}
        >
          <option value="name_asc">Name (A-Z)</option>
          <option value="name_desc">Name (Z-A)</option>
          <option value="grad_year_asc">Grad Year (earliest)</option>
          <option value="grad_year_desc">Grad Year (latest)</option>
          <option value="schools_desc">Most Schools</option>
          <option value="activity_desc">Most Activity</option>
        </select>

        {/* Clear filters */}
        {(filterName || filterGradYear) && (
          <button
            data-testid="clear-filters"
            onClick={() => { setFilterName(''); setFilterGradYear(''); }}
            style={{
              background: 'none',
              border: 'none',
              color: '#8B3A3A',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Student Cards — Player Card Grid */}
      <div data-testid="coach-student-roster" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 14, padding: '8px 0',
      }}>
        {sortedStudents.map(student => {
          const items = shortlistByStudent[student.user_id] || [];
          const totalSteps = items.reduce((sum, it) => sum + (it.recruiting_journey_steps || []).length, 0);
          const completedSteps = items.reduce((sum, it) => sum + (it.recruiting_journey_steps || []).filter(s => s.completed).length, 0);
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
              }}
              onCardClick={() => setExpandedStudentId(
                expandedStudentId === student.user_id ? null : student.user_id
              )}
            />
          );
        })}
      </div>

      {/* Expanded detail (existing CoachStudentCard) */}
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
            data-testid="clear-filters-inline"
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
    </div>
  );
}
