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
import GritFitMapView from '../components/GritFitMapView.jsx';
import GritFitTableView from '../components/GritFitTableView.jsx';
import MoneyMap from '../components/MoneyMap.jsx';
import NextStepsDashboard from '../components/NextStepsDashboard.jsx';
import { applyRecruitingListFilter, RECRUITING_LIST_OPTIONS } from '../lib/map/recruitingListFilter.js';
import { filterByStatus } from '../lib/map/statusFilter.js';
import { STATUS_LABELS, STATUS_ORDER } from '../lib/statusLabels.js';
import AthleticFitScorecard from '../components/grit-fit/AthleticFitScorecard.jsx';
import AcademicRigorScorecard from '../components/grit-fit/AcademicRigorScorecard.jsx';
import GritFitExplainer from '../components/grit-fit/GritFitExplainer.jsx';
import WhatIfSliders from '../components/grit-fit/WhatIfSliders.jsx';
import { applyMatchReturnLogic, MATCH_RETURN_LIMIT } from '../lib/grit-fit/matchReturnLogic.js';
import { recomputeMatches } from '../lib/grit-fit/recomputeMatches.js';
import useIsDesktop from '../hooks/useIsDesktop.js';

/**
 * GritFitCollapseWrapper — Sprint 004 G1 (ruling A-5).
 *
 * Owns the collapse state for the Athletic Fit + Academic Rigor scorecard
 * pair. Desktop = ONE shared bool (collapsing either strip collapses both);
 * Mobile = TWO independent bools. Desktop also renders as a single modal
 * container (both scorecards in one wrapper); mobile renders them stacked
 * as two separate containers.
 *
 * `isDesktop` is injected as a prop so the wrapper is pure-presentational
 * and trivially testable. GritFitPage passes the live useIsDesktop() value;
 * tests can drive it directly.
 *
 * Default state: both expanded (isCollapsed=false). State is local useState
 * and is intentionally NOT persisted across navigation or sessions.
 */
export function GritFitCollapseWrapper({ scoringResult, isDesktop }) {
  // Desktop shared bool
  const [isBothCollapsed, setBothCollapsed] = useState(false);
  // Mobile independent bools
  const [athleticCollapsed, setAthleticCollapsed] = useState(false);
  const [academicCollapsed, setAcademicCollapsed] = useState(false);

  const athleticIsCollapsed = isDesktop ? isBothCollapsed : athleticCollapsed;
  const academicIsCollapsed = isDesktop ? isBothCollapsed : academicCollapsed;

  const onAthleticToggle = isDesktop
    ? () => setBothCollapsed(v => !v)
    : () => setAthleticCollapsed(v => !v);
  const onAcademicToggle = isDesktop
    ? () => setBothCollapsed(v => !v)
    : () => setAcademicCollapsed(v => !v);

  const variant = isDesktop ? 'desktop' : 'mobile';

  const athleticScorecard = (
    <AthleticFitScorecard
      athFit={scoringResult.athFit}
      isCollapsed={athleticIsCollapsed}
      onToggle={onAthleticToggle}
      variant={variant}
    />
  );
  const academicScorecard = (
    <AcademicRigorScorecard
      academicRigorScore={scoringResult.acadRigorScore ?? scoringResult.academicRigorScore ?? null}
      testOptionalScore={scoringResult.acadTestOptScore ?? scoringResult.testOptionalScore ?? null}
      isCollapsed={academicIsCollapsed}
      onToggle={onAcademicToggle}
      variant={variant}
    />
  );

  if (isDesktop) {
    // ONE modal-level container so the pair visually collapses together.
    return (
      <div
        data-testid="grit-fit-scorecards"
        data-layout="desktop"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 16,
          backgroundColor: 'transparent',
        }}
      >
        {athleticScorecard}
        {academicScorecard}
      </div>
    );
  }

  // Mobile: TWO separate stacked containers (each collapses independently).
  return (
    <div
      data-testid="grit-fit-scorecards"
      data-layout="mobile"
      style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}
    >
      <div data-testid="grit-fit-scorecard-athletic-wrapper">{athleticScorecard}</div>
      <div data-testid="grit-fit-scorecard-academic-wrapper">{academicScorecard}</div>
    </div>
  );
}

/**
 * GritFitMapFilters — Sprint 004 G6.
 *
 * Filter bar for the My Grit Fit Map. Replaces the legacy GritFitActionBar
 * rendering on this page. The Conferences single-select dropdown has been
 * removed; in its place is a Status multi-select (6-value GRIT FIT taxonomy
 * from SC-2) that renders as a pill-style toggle set mirroring the coloring
 * used by the status pills elsewhere in the app.
 *
 * State shape:
 *   filters            = { division, state, search, recruitingList }
 *   selectedStatuses   = string[] of STATUS_ORDER keys (default = all 6)
 *
 * Exported for unit-test targeting without needing to mount GritFitPage.
 */
const filterDropdownBase = {
  padding: '12px 16px', border: '1px solid #D4D4D4', borderRadius: 4,
  fontSize: '1rem', color: '#2C2C2C', backgroundColor: '#FFFFFF',
  cursor: 'pointer', outline: 'none',
};

export function GritFitMapFilters({
  results,
  allSchools,
  filters,
  onFilterChange,
  selectedStatuses,
  onSelectedStatusesChange,
  onRecalculate,
  recalculating,
}) {
  const recruitingList = filters.recruitingList || 'all';
  const matchCount = results?.length || 0;
  const totalSchools = allSchools?.length || 662;
  const optionSource = (allSchools && allSchools.length) ? allSchools : (results || []);

  const states = useMemo(() => {
    const set = new Set(optionSource.map(s => s.state).filter(Boolean));
    return [...set].sort();
  }, [optionSource]);

  const divisions = ['Power 4', 'G6', 'FCS', 'D2', 'D3'];

  const allStatusesSelected =
    selectedStatuses.length === STATUS_ORDER.length &&
    STATUS_ORDER.every(k => selectedStatuses.includes(k));

  const hasActiveFilters =
    filters.division || filters.state || filters.search ||
    (filters.recruitingList && filters.recruitingList !== 'all') ||
    !allStatusesSelected;

  const handleClear = () => {
    onFilterChange({ division: '', state: '', search: '', recruitingList: 'all' });
    onSelectedStatusesChange(STATUS_ORDER.slice());
  };

  const toggleStatus = (key) => {
    const next = selectedStatuses.includes(key)
      ? selectedStatuses.filter(k => k !== key)
      : [...selectedStatuses, key];
    onSelectedStatusesChange(next);
  };

  return (
    <div data-testid="grit-fit-map-filters" style={{ marginBottom: 16 }}>
      {/* Row 1: Recalculate + School Count + Clear */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        <button
          data-testid="recalculate-button"
          onClick={onRecalculate}
          disabled={recalculating}
          style={{
            padding: '12px 24px',
            backgroundColor: recalculating ? '#E8E8E8' : '#D4AF37',
            color: recalculating ? '#6B6B6B' : '#2C2C2C',
            border: 'none',
            borderRadius: 4,
            fontSize: '1rem',
            fontWeight: 500,
            cursor: recalculating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'background-color 150ms ease-in-out',
          }}
        >
          {recalculating ? 'Calculating...' : '⟲ Recalculate'}
        </button>

        <span data-testid="school-count" style={{ color: '#6B6B6B', fontSize: '0.875rem' }}>
          Showing {matchCount} of {totalSchools} schools ({matchCount} GRIT FIT matches)
        </span>

        {hasActiveFilters && (
          <button
            data-testid="clear-filters-link"
            onClick={handleClear}
            style={{
              background: 'none', border: 'none', textDecoration: 'underline',
              color: '#8B3A3A', fontSize: '0.875rem', cursor: 'pointer', padding: 0,
            }}
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Row 2: Recruiting List + Division + State + Search */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <select
          data-testid="filter-recruiting-list"
          value={recruitingList}
          onChange={(e) => onFilterChange({ ...filters, recruitingList: e.target.value })}
          style={{ ...filterDropdownBase, borderColor: '#8B3A3A', fontWeight: 600 }}
          aria-label="Recruiting List filter"
        >
          {RECRUITING_LIST_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          data-testid="filter-division"
          value={filters.division}
          onChange={(e) => onFilterChange({ ...filters, division: e.target.value })}
          style={filterDropdownBase}
          aria-label="Competition Level filter"
        >
          <option value="">All Competition Levels</option>
          {divisions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          data-testid="filter-state"
          value={filters.state}
          onChange={(e) => onFilterChange({ ...filters, state: e.target.value })}
          style={filterDropdownBase}
        >
          <option value="">All States</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 200 }}>
          <input
            type="text"
            data-testid="search-schools"
            placeholder="Search by school name or location..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            style={{
              ...filterDropdownBase,
              width: '100%',
              boxSizing: 'border-box',
              paddingLeft: 36,
            }}
          />
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: '1rem', color: '#6B6B6B', pointerEvents: 'none',
          }}>
            &#x1F50D;
          </span>
        </div>
      </div>

      {/* Row 3: Status multi-select — pill toggles */}
      <div
        data-testid="filter-status-group"
        role="group"
        aria-label="Filter by GRIT FIT status"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <span style={{ fontSize: '0.875rem', color: '#6B6B6B', fontWeight: 500, marginRight: 4 }}>
          Status:
        </span>
        {STATUS_ORDER.map(key => {
          const cfg = STATUS_LABELS[key];
          const selected = selectedStatuses.includes(key);  // user-controlled only
          return (
            <button
              key={key}
              type="button"
              data-testid={`filter-status-${key}`}
              data-status-key={key}
              data-selected={selected ? 'true' : 'false'}
              aria-pressed={selected}
              onClick={() => toggleStatus(key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 16,
                border: selected ? `2px solid ${cfg.bg}` : '2px solid #D4D4D4',
                backgroundColor: selected ? cfg.bg : '#FFFFFF',
                color: selected ? cfg.textColor : '#6B6B6B',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 150ms, border-color 150ms, color 150ms',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: cfg.bg,
                  border: selected ? '1px solid rgba(255,255,255,0.6)' : `1px solid ${cfg.bg}`,
                }}
              />
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const toggleBtnBase = {
  padding: '8px 12px', border: '2px solid #8B3A3A', borderRadius: 4,
  fontSize: '1rem', fontWeight: 500, cursor: 'pointer',
  transition: 'background-color 150ms ease-in-out, color 150ms ease-in-out',
};

export default function GritFitPage() {
  const { session, profileUpdatedAt } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  // Data state
  const [profile, setProfile] = useState(null);
  const [allSchools, setAllSchools] = useState([]);
  const [shortlistIds, setShortlistIds] = useState(new Set());
  const [trueScoringResult, setTrueScoringResult] = useState(null);

  // UI state
  const [view, setView] = useState('map'); // 'map' | 'table'
  const [filters, setFilters] = useState({
    division: '', state: '', search: '', recruitingList: 'all',
  });
  // Sprint 004 G6 — Status multi-select (replaces Conferences). Local state
  // only: NOT persisted across sessions or navigation (ruling A-6).
  // Sprint 007 A.4 — default state on every mount is "currently_recommended"
  // only. Re-fires on each mount of the page (the useState initializer runs
  // once per component instance, and GritFitPage unmounts/remounts on
  // navigation away/back). The "Clear all filters" action remains the path
  // back to the all-6 selection — that user-initiated reset is unchanged.
  const [selectedStatuses, setSelectedStatuses] = useState(() => ['currently_recommended']);
  // View-only what-if slider overrides (Sprint 003 D4). Empty = show true profile.
  const [sliderOverrides, setSliderOverrides] = useState({});
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
        // Sprint 003 D4 — apply the new match-return rule (D2-cap-at-2 + D3 fill)
        // to the full eligible list. Non-qualifying profiles are untouched.
        const eligibleSorted = (result.scored || [])
          .filter(s => s.eligible)
          .sort((a, b) => b.acadScore - a.acadScore);
        const top = applyMatchReturnLogic(
          eligibleSorted,
          result.athFit,
          result.acadRigorScore,
          MATCH_RETURN_LIMIT,
          { profile: profileData, schoolsPool: schoolsData },
        );
        const finalResult = { ...result, top30: top };
        setTrueScoringResult(finalResult);

        // Write zero-match tracking to profiles (Item 3 — coach visibility)
        supabase
          .from('profiles')
          .update({
            last_grit_fit_run_at: new Date().toISOString(),
            last_grit_fit_zero_match: top.length === 0,
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
    const eligibleSorted = (result.scored || [])
      .filter(s => s.eligible)
      .sort((a, b) => b.acadScore - a.acadScore);
    const top = applyMatchReturnLogic(
      eligibleSorted,
      result.athFit,
      result.acadRigorScore,
      MATCH_RETURN_LIMIT,
      { profile: freshProfile, schoolsPool: allSchools },
    );
    const finalResult = { ...result, top30: top };
    setTrueScoringResult(finalResult);

    // Write zero-match tracking to profiles (Item 3 — coach visibility)
    supabase
      .from('profiles')
      .update({
        last_grit_fit_run_at: new Date().toISOString(),
        last_grit_fit_zero_match: top.length === 0,
      })
      .eq('user_id', session.user.id)
      .then(({ error: writeErr }) => {
        if (writeErr) console.error('GRIT FIT profile write error:', writeErr);
      });

    setFilters({ division: '', state: '', search: '', recruitingList: 'all' });
    setSelectedStatuses(STATUS_ORDER.slice());
    setSliderOverrides({});
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

  // Sprint 003 D4 — when sliders are active, derive a live scoring result from
  // the true profile + overrides. Pure client-side recompute — zero network
  // writes. The live result supersedes the true result for display only.
  const hasOverrides = useMemo(() => {
    if (!sliderOverrides) return false;
    return Object.values(sliderOverrides).some(v => v !== undefined && v !== null && v !== '');
  }, [sliderOverrides]);

  const liveScoringResult = useMemo(() => {
    if (!trueScoringResult) return null;
    if (!hasOverrides || !profile || !allSchools.length) return trueScoringResult;
    return recomputeMatches(profile, allSchools, sliderOverrides, MATCH_RETURN_LIMIT);
  }, [trueScoringResult, hasOverrides, profile, allSchools, sliderOverrides]);

  // Downstream memos read from `scoringResult` — this points at either the
  // true result or the slider-overridden live result.
  const scoringResult = liveScoringResult;

  // Apply the text/dropdown filters common to both views.
  // Sprint 004 G6 — Conferences dropdown removed; replaced by Status multi-
  // select handled separately via filterByStatus() in the map memo.
  const applyCommonFilters = useCallback((arr) => {
    let out = arr;
    if (filters.division) {
      out = out.filter(s => s.type === filters.division);
    }
    if (filters.state) {
      out = out.filter(s => s.state === filters.state);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      out = out.filter(s =>
        (s.school_name || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q) ||
        (s.state || '').toLowerCase().includes(q)
      );
    }
    return out;
  }, [filters.division, filters.state, filters.search]);

  // Unitid sets used by the map for overlays and for the Recruiting List filter.
  const gritFitUnitIds = useMemo(() => {
    if (!scoringResult?.top30) return new Set();
    return new Set(scoringResult.top30.map(s => s.unitid));
  }, [scoringResult]);

  // Table View still shows top30 (filtered by the common filters only — the
  // Recruiting List dropdown is a map-view concept).
  const filteredResults = useMemo(() => {
    if (!scoringResult?.top30) return [];
    return applyCommonFilters([...scoringResult.top30]);
  }, [scoringResult, applyCommonFilters]);

  // Map View renders the 662-school base layer filtered by Recruiting List
  // plus the common filters. Grit Fit + Shortlist overlays are applied per-pin.
  // Sprint 004 G6 — also apply the Status multi-select via filterByStatus().
  const mapSchools = useMemo(() => {
    if (!allSchools.length) return [];
    const scoredByUnitid = new Map();
    if (scoringResult?.scored) {
      for (const s of scoringResult.scored) scoredByUnitid.set(s.unitid, s);
    }
    // Prefer the scored record when available so popups can show ADLTV, etc.
    const base = allSchools.map(s => scoredByUnitid.get(s.unitid) || s);
    const afterList = applyRecruitingListFilter(base, filters.recruitingList || 'all', gritFitUnitIds, shortlistIds);
    const afterCommon = applyCommonFilters(afterList);
    return filterByStatus(
      afterCommon,
      selectedStatuses,
      scoringResult?.topTier ?? null,
      scoringResult?.recruitReach ?? null,
    );
  }, [allSchools, scoringResult, filters.recruitingList, gritFitUnitIds, shortlistIds, applyCommonFilters, selectedStatuses]);

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
        Your GRIT FIT Matches
      </h2>
      <p
        data-testid="grit-fit-result-count"
        style={{ fontSize: '1.125rem', color: '#6B6B6B', margin: '0 0 24px' }}
      >
        Showing {filteredResults.length} of {top30Count} schools matched to your profile
      </p>

      {/* Sprint 003 D4 — new scorecard pair (per-division Athletic Fit +
          merged Academic Rigor), followed by the GRIT FIT Explainer and the
          view-only What-If sliders.

          Sprint 004 G1 — both scorecards now carry <CollapsibleTitleStrip>
          headers. Desktop shares one collapse bool; mobile has independent
          bools. State is held in GritFitCollapseWrapper (local useState, not
          persisted). */}
      {scoringResult && (
        <GritFitCollapseWrapper scoringResult={scoringResult} isDesktop={isDesktop} />
      )}

      {scoringResult && <GritFitExplainer />}

      {scoringResult && profile && (
        <WhatIfSliders
          trueProfile={profile}
          overrides={sliderOverrides}
          onChange={setSliderOverrides}
          onReset={() => setSliderOverrides({})}
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

      {/* Action Bar (filters, recalculate, search) — Sprint 004 G6 rebuilt
          inline with the Status multi-select replacing the Conferences
          dropdown. GritFitActionBar is no longer rendered by this page. */}
      <GritFitMapFilters
        results={scoringResult?.top30}
        allSchools={allSchools}
        filters={filters}
        onFilterChange={setFilters}
        selectedStatuses={selectedStatuses}
        onSelectedStatusesChange={setSelectedStatuses}
        onRecalculate={handleRecalculate}
        recalculating={recalculating}
      />

      {/* Conditional View Rendering */}
      <div style={{ transition: 'opacity 200ms ease-in-out' }}>
        {view === 'map' ? (
          <GritFitMapView
            schools={mapSchools}
            gritFitUnitIds={gritFitUnitIds}
            shortlistIds={shortlistIds}
            onAddToShortlist={handleAddToShortlist}
            topTier={scoringResult?.topTier}
            recruitReach={scoringResult?.recruitReach}
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
            onClick={() => {
              setFilters({ division: '', state: '', search: '', recruitingList: 'all' });
              setSelectedStatuses(STATUS_ORDER.slice());
            }}
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
