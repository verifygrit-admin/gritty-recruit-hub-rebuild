/**
 * GRIT FIT Results Page — orchestrates Map View and Table View with shared state.
 * UX Spec: UX_SPEC_GRITFIT_RESULTS.md
 *
 * Data flow:
 *   1. Load student profile from profiles table (via user_id)
 *   2. Load all 662 schools from schools table
 *   3. Load student's existing shortlist (for button state)
 *   4. Run scoring engine (client-side) => top30 matched schools
 *   5. Render in Map View (default) or Table View
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { runGritFitScoring } from '../lib/scoring.js';
import GritFitActionBar from '../components/GritFitActionBar.jsx';
import GritFitMapView from '../components/GritFitMapView.jsx';
import GritFitTableView from '../components/GritFitTableView.jsx';
import GritFitScoreDashboard from '../components/GritFitScoreDashboard.jsx';
import MoneyMap from '../components/MoneyMap.jsx';
import NextStepsDashboard from '../components/NextStepsDashboard.jsx';

const toggleBtnBase = {
  padding: '8px 12px', border: '2px solid #8B3A3A', borderRadius: 4,
  fontSize: '1rem', fontWeight: 500, cursor: 'pointer',
  transition: 'background-color 150ms ease-in-out, color 150ms ease-in-out',
};

export default function GritFitPage() {
  const { session, profileUpdatedAt } = useAuth();
  const navigate = useNavigate();

  // Data state
  const [profile, setProfile] = useState(null);
  const [allSchools, setAllSchools] = useState([]);
  const [shortlistIds, setShortlistIds] = useState(new Set());
  const [scoringResult, setScoringResult] = useState(null);

  // UI state
  const [view, setView] = useState('map'); // 'map' | 'table'
  const [filters, setFilters] = useState({ conference: '', division: '', state: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  // ── Data loading ──
  useEffect(() => {
    if (!session) return;
    loadData();
  }, [session]);

  // Auto-recalculate when profile is updated (e.g. from ProfilePage save)
  useEffect(() => {
    if (!profileUpdatedAt || !session || !allSchools.length) return;
    handleRecalculate();
  }, [profileUpdatedAt]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Parallel fetch: profile, schools, shortlist
      const [profileRes, schoolsRes, shortlistRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', session.user.id).single(),
        supabase.from('schools').select('*'),
        supabase.from('short_list_items').select('unitid').eq('user_id', session.user.id),
      ]);

      if (profileRes.error) {
        setError('Please complete your profile before viewing GRIT FIT results.');
        setLoading(false);
        return;
      }

      if (schoolsRes.error) {
        setError('Failed to load school data. Please try again.');
        setLoading(false);
        return;
      }

      const profileData = profileRes.data;
      const schoolsData = schoolsRes.data || [];
      const shortlistData = shortlistRes.data || [];

      setProfile(profileData);
      setAllSchools(schoolsData);
      setShortlistIds(new Set(shortlistData.map(s => s.unitid)));

      // Run scoring
      if (profileData.position && profileData.gpa) {
        const result = runGritFitScoring(profileData, schoolsData);
        setScoringResult(result);

        // Write zero-match tracking to profiles (Item 3 — coach visibility)
        supabase
          .from('profiles')
          .update({
            last_grit_fit_run_at: new Date().toISOString(),
            last_grit_fit_zero_match: result.top30.length === 0,
          })
          .eq('user_id', session.user.id)
          .then(({ error: writeErr }) => {
            if (writeErr) console.error('GRIT FIT profile write error:', writeErr);
          });
      } else {
        setError('Your profile needs at least a position and GPA to generate GRIT FIT results.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('GritFitPage loadData error:', err);
    }

    setLoading(false);
  };

  // ── Recalculate ──
  const handleRecalculate = useCallback(async () => {
    if (!session || recalculating) return;
    setRecalculating(true);

    // Re-fetch profile in case it was updated
    const { data: freshProfile, error: profileError } = await supabase
      .from('profiles').select('*').eq('user_id', session.user.id).single();

    if (profileError || !freshProfile) {
      showToast('Failed to load profile. Please try again.', 'error');
      setRecalculating(false);
      return;
    }

    setProfile(freshProfile);
    const result = runGritFitScoring(freshProfile, allSchools);
    setScoringResult(result);

    // Write zero-match tracking to profiles (Item 3 — coach visibility)
    supabase
      .from('profiles')
      .update({
        last_grit_fit_run_at: new Date().toISOString(),
        last_grit_fit_zero_match: result.top30.length === 0,
      })
      .eq('user_id', session.user.id)
      .then(({ error: writeErr }) => {
        if (writeErr) console.error('GRIT FIT profile write error:', writeErr);
      });

    setFilters({ conference: '', division: '', state: '', search: '' });
    showToast('Results updated with your latest profile', 'success');
    setRecalculating(false);
  }, [session, allSchools, recalculating]);

  // ── Add to shortlist ──
  const handleAddToShortlist = useCallback(async (school) => {
    if (!session || shortlistIds.has(school.unitid)) return;

    const payload = {
      user_id: session.user.id,
      unitid: school.unitid,
      school_name: school.school_name,
      div: school.type,  // schools.type is the 5-way tier (Power 4, G6, FCS, D2, D3)
      conference: school.conference,
      state: school.state,
      match_rank: school.matchRank,
      match_tier: school.matchTier,
      net_cost: school.netCost,
      droi: school.droi,
      break_even: school.breakEven,
      adltv: school.adltv,
      grad_rate: school.gradRate,
      coa: school.coa_out_of_state ? parseFloat(school.coa_out_of_state) : null,
      dist: school.dist,
      q_link: school.recruiting_q_link,
      coach_link: school.coach_link,
      source: 'grit_fit',
      grit_fit_status: 'currently_recommended',
      grit_fit_labels: ['currently_recommended'],
    };

    const { error } = await supabase.from('short_list_items').insert(payload);

    if (error) {
      if (error.code === '23505') {
        // Already in shortlist — just update local state
        setShortlistIds(prev => new Set([...prev, school.unitid]));
        showToast(`${school.school_name} is already in your shortlist`, 'success');
      } else {
        showToast('Failed to add to shortlist. Please try again.', 'error');
        console.error('Shortlist insert error:', error);
      }
      return;
    }

    setShortlistIds(prev => new Set([...prev, school.unitid]));
    showToast(`Added ${school.school_name} to your shortlist`, 'success');
  }, [session, shortlistIds]);

  // ── Toast ──
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Filter results ──
  const filteredResults = useMemo(() => {
    if (!scoringResult?.top30) return [];
    let arr = [...scoringResult.top30];

    if (filters.conference) {
      arr = arr.filter(s => s.conference === filters.conference);
    }
    if (filters.division) {
      arr = arr.filter(s => s.type === filters.division);
    }
    if (filters.state) {
      arr = arr.filter(s => s.state === filters.state);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      arr = arr.filter(s =>
        (s.school_name || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q) ||
        (s.state || '').toLowerCase().includes(q)
      );
    }

    return arr;
  }, [scoringResult, filters]);

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#6B6B6B' }}>
        Loading GRIT FIT results...
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ color: '#8B3A3A', fontSize: '1.125rem', marginBottom: 16 }}>{error}</p>
        <a
          href="/profile"
          style={{
            display: 'inline-block', padding: '12px 24px', backgroundColor: '#8B3A3A',
            color: '#FFFFFF', borderRadius: 4, textDecoration: 'none', fontWeight: 600,
          }}
        >
          Complete Your Profile
        </a>
      </div>
    );
  }

  const top30Count = scoringResult?.top30?.length || 0;

  // Zero-match state — render NextStepsDashboard instead of map/table
  if (scoringResult && top30Count === 0) {
    return (
      <NextStepsDashboard
        scoringResult={scoringResult}
        profile={profile}
        onEditProfile={() => navigate('/profile')}
        onBrowseAllSchools={() => navigate('/')}
      />
    );
  }

  return (
    <div data-testid="grit-fit-results">
      {/* Toast */}
      {toast && (
        <div
          role="alert"
          style={{
            position: 'fixed', top: 16, right: 16, zIndex: 9999,
            padding: '12px 24px', borderRadius: 4, fontSize: '0.875rem',
            color: '#FFFFFF', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            backgroundColor: toast.type === 'success' ? '#4CAF50' : '#F44336',
            transition: 'opacity 300ms',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Page Heading */}
      <h2
        data-testid="grit-fit-page-title"
        style={{ fontSize: '2rem', fontWeight: 700, color: '#8B3A3A', margin: '0 0 8px' }}
      >
        Your {top30Count} GRIT FIT Matches
      </h2>
      <p
        data-testid="grit-fit-result-count"
        style={{ fontSize: '1.125rem', color: '#6B6B6B', margin: '0 0 24px' }}
      >
        Showing {filteredResults.length} of {top30Count} schools matched to your profile
      </p>

      {/* Score Dashboard */}
      {scoringResult && (
        <GritFitScoreDashboard
          scores={{
            athleticFit: scoringResult.athFit?.[scoringResult.topTier] ?? null,
            academicRigor: scoringResult.acadRigorScore ?? null,
            testOptional: scoringResult.acadTestOptScore ?? null,
          }}
          studentName={profile?.name?.split(' ')[0]}
        />
      )}

      {/* Speed40 missing banner — Item 4 */}
      {scoringResult && !profile?.speed_40 && (
        <div
          data-testid="speed40-missing-banner"
          role="alert"
          style={{
            margin: '0 0 20px',
            padding: '12px 16px',
            backgroundColor: '#FFF3E0',
            borderLeft: '4px solid #FF9800',
            borderRadius: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.95rem', color: '#2C2C2C' }}>
            <strong>Your 40-yard dash time is missing.</strong>{' '}
            Without it, your speed is scored at 0 — your athletic fit and match count may be lower than your actual ability.
            Enter your best estimate to improve your results.
          </span>
          <button
            data-testid="speed40-missing-banner-cta"
            onClick={() => navigate('/profile')}
            style={{
              padding: '8px 20px',
              backgroundColor: '#FF9800',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Update Profile
          </button>
        </div>
      )}

      {/* View Toggle */}
      <div data-testid="view-toggle-group" style={{ display: 'flex', marginBottom: 24 }}>
        <button
          data-testid="view-toggle-map"
          aria-pressed={view === 'map'}
          aria-label="Map View"
          onClick={() => setView('map')}
          style={{
            ...toggleBtnBase,
            borderRight: 'none',
            borderTopRightRadius: 0, borderBottomRightRadius: 0,
            backgroundColor: view === 'map' ? '#8B3A3A' : 'transparent',
            color: view === 'map' ? '#FFFFFF' : '#8B3A3A',
          }}
        >
          Map View
        </button>
        <button
          data-testid="view-toggle-table"
          aria-pressed={view === 'table'}
          aria-label="Table View"
          onClick={() => setView('table')}
          style={{
            ...toggleBtnBase,
            borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
            backgroundColor: view === 'table' ? '#8B3A3A' : 'transparent',
            color: view === 'table' ? '#FFFFFF' : '#8B3A3A',
          }}
        >
          Table View
        </button>
      </div>

      {/* Action Bar (filters, recalculate, search) */}
      <GritFitActionBar
        results={scoringResult?.top30}
        allSchools={allSchools}
        filters={filters}
        onFilterChange={setFilters}
        onRecalculate={handleRecalculate}
        recalculating={recalculating}
      />

      {/* Conditional View Rendering */}
      <div style={{ transition: 'opacity 200ms ease-in-out' }}>
        {view === 'map' ? (
          <GritFitMapView
            matchedSchools={filteredResults}
            shortlistIds={shortlistIds}
            onAddToShortlist={handleAddToShortlist}
          />
        ) : (
          <>
            <MoneyMap schools={filteredResults} />
            <GritFitTableView
              results={filteredResults}
              shortlistIds={shortlistIds}
              onAddToShortlist={handleAddToShortlist}
            />
          </>
        )}
      </div>

      {/* No results after filtering */}
      {filteredResults.length === 0 && scoringResult?.top30?.length > 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#6B6B6B' }}>
          <p>No schools match your filters.</p>
          <button
            onClick={() => setFilters({ conference: '', division: '', state: '', search: '' })}
            style={{
              background: 'none', border: 'none', color: '#8B3A3A',
              textDecoration: 'underline', cursor: 'pointer', fontSize: '1rem',
            }}
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Gate diagnostics (development only) */}
      {import.meta.env.DEV && scoringResult && (
        <div style={{
          marginTop: 32, padding: 16, backgroundColor: '#F5F5F5', borderRadius: 4,
          fontSize: '0.75rem', color: '#6B6B6B',
        }}>
          <strong>GRIT FIT Gate Diagnostics:</strong>{' '}
          Athletic tier: {scoringResult.topTier || 'none'} |{' '}
          Reach: {scoringResult.recruitReach} mi |{' '}
          Pass athletic: {scoringResult.gates.passAthletic} |{' '}
          Pass distance: {scoringResult.gates.passDist} |{' '}
          Pass academic: {scoringResult.gates.passAcad} |{' '}
          Pass all: {scoringResult.gates.passAll}
        </div>
      )}
    </div>
  );
}
