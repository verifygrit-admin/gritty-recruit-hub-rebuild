/**
 * Coach Dashboard Page — shell with tab navigation for coaches and counselors.
 * Item 3: Multi-page layout (Students / Calendar / Reports).
 *
 * Data flow:
 *   1. Verify user is hs_coach or hs_guidance_counselor (via useAuth userType)
 *   2. Load linked students via hs_coach_students or hs_counselor_students
 *   3. Load profiles for those students (RLS grants coach/counselor SELECT)
 *   4. Load short_list_items for those students (RLS grants coach/counselor SELECT)
 *   5. Pass data down to active tab page
 *
 * Identity: user_id is the sole key — NO SAID
 */
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';
import CoachStudentsPage from './coach/CoachStudentsPage.jsx';
import CoachReportsPage from './coach/CoachReportsPage.jsx';
import CoachCalendarPage from './coach/CoachCalendarPage.jsx';
import CoachRecruitingIntelPage from './coach/CoachRecruitingIntelPage.jsx';

const ALLOWED_ROLES = ['hs_coach', 'hs_guidance_counselor'];
const TABS = [
  { key: 'students', label: 'Students' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'reports', label: 'Reports' },
  { key: 'intel', label: 'Recruiting Intelligence' },
];

export default function CoachDashboardPage() {
  const { session, userType, loading: authLoading } = useAuth();

  // Data state
  const [students, setStudents] = useState([]);
  const [shortlistByStudent, setShortlistByStudent] = useState({});
  const [counselorByStudent, setCounselorByStudent] = useState({});
  const [coachByStudent, setCoachByStudent] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [activeTab, setActiveTab] = useState('students');
  const [intelSelectedDivision, setIntelSelectedDivision] = useState(null);

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
        if (linkErr) { setError('Failed to load student roster. Please try again.'); setLoading(false); return; }
        studentUserIds = (links || []).map(l => l.student_user_id);
      } else if (isCounselor) {
        const { data: links, error: linkErr } = await supabase
          .from('hs_counselor_students')
          .select('student_user_id')
          .eq('counselor_user_id', userId);
        if (linkErr) { setError('Failed to load student roster. Please try again.'); setLoading(false); return; }
        studentUserIds = (links || []).map(l => l.student_user_id);
      }

      if (studentUserIds.length === 0) {
        setStudents([]);
        setShortlistByStudent({});
        setLoading(false);
        return;
      }

      // Step 2: Fetch profiles and shortlist items in parallel
      const [profilesRes, shortlistRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, name, position, grad_year, high_school, gpa, sat, state, email, last_grit_fit_run_at, last_grit_fit_zero_match, hudl_url, avatar_storage_path')
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

      const profileMap = {};
      for (const p of (profilesRes.data || [])) { profileMap[p.user_id] = p; }

      const studentList = studentUserIds.map(uid =>
        profileMap[uid] || {
          user_id: uid, name: null, position: null, grad_year: null,
          high_school: null, gpa: null, sat: null, state: null,
          email: null, last_grit_fit_run_at: null, last_grit_fit_zero_match: false,
          hudl_url: null, avatar_storage_path: null,
        }
      );

      setStudents(studentList);

      const grouped = {};
      for (const uid of studentUserIds) { grouped[uid] = []; }
      for (const item of (shortlistRes.data || [])) {
        if (grouped[item.user_id]) grouped[item.user_id].push(item);
      }
      setShortlistByStudent(grouped);

      // Step 3: Fetch counselor emails for each student (for coach Panel 2 mailto)
      // Also fetch coach emails for each student (for counselor Panel 2 mailto)
      const counselorMap = {};
      const coachMap = {};
      try {
        const [counselorLinksRes, coachLinksRes] = await Promise.all([
          supabase
            .from('hs_counselor_students')
            .select('student_user_id, counselor_user_id')
            .in('student_user_id', studentUserIds),
          supabase
            .from('hs_coach_students')
            .select('student_user_id, coach_user_id')
            .in('student_user_id', studentUserIds),
        ]);

        const counselorLinks = counselorLinksRes.data || [];
        const coachLinks = coachLinksRes.data || [];

        // Collect all unique advisor IDs in one profiles fetch
        const counselorIds = [...new Set(counselorLinks.map(l => l.counselor_user_id))];
        const coachIds = [...new Set(coachLinks.map(l => l.coach_user_id))];
        const allAdvisorIds = [...new Set([...counselorIds, ...coachIds])];

        if (allAdvisorIds.length > 0) {
          const { data: advisorProfiles } = await supabase
            .from('profiles')
            .select('user_id, email')
            .in('user_id', allAdvisorIds);

          const advisorEmailMap = {};
          for (const ap of (advisorProfiles || [])) { advisorEmailMap[ap.user_id] = ap.email; }

          for (const link of counselorLinks) {
            counselorMap[link.student_user_id] = advisorEmailMap[link.counselor_user_id] || null;
          }
          for (const link of coachLinks) {
            coachMap[link.student_user_id] = advisorEmailMap[link.coach_user_id] || null;
          }
        }
      } catch (_) {
        // Non-critical — Panel 2 mailto buttons will just not render
      }
      setCounselorByStudent(counselorMap);
      setCoachByStudent(coachMap);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('CoachDashboard loadData error:', err);
    }

    setLoading(false);
  };

  // ── All shortlist items for summary ──
  const allShortlistItems = useMemo(() =>
    Object.values(shortlistByStudent).flat(),
    [shortlistByStudent]
  );

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
            {students.length} student{students.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          data-testid="refresh-dashboard-btn"
          onClick={loadDashboardData}
          style={{
            padding: '8px 16px', border: '2px solid #8B3A3A', borderRadius: 4,
            backgroundColor: 'transparent', color: '#8B3A3A', fontSize: '0.875rem',
            fontWeight: 500, cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #E8E8E8',
        backgroundColor: '#FFFFFF', marginBottom: 16,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            data-testid={`tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #8B3A3A' : '2px solid transparent',
              color: activeTab === tab.key ? '#8B3A3A' : '#6B6B6B',
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'color 150ms, border-color 150ms',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'students' && (
        <CoachStudentsPage
          students={students}
          shortlistByStudent={shortlistByStudent}
          counselorByStudent={counselorByStudent}
          coachByStudent={coachByStudent}
          viewerRole={userType}
        />
      )}
      {activeTab === 'reports' && (
        <CoachReportsPage
          students={students}
          shortlistByStudent={shortlistByStudent}
          allShortlistItems={allShortlistItems}
        />
      )}
      {activeTab === 'calendar' && (
        <CoachCalendarPage />
      )}
      {activeTab === 'intel' && (
        <CoachRecruitingIntelPage
          students={students}
          shortlistByStudent={shortlistByStudent}
          selectedDivision={intelSelectedDivision}
          onSelectedDivisionChange={setIntelSelectedDivision}
        />
      )}
    </div>
  );
}
