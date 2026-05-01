/**
 * AthletesPage — Sprint 011
 *
 * Public, read-only roster of GrittyFB partner-school student-athletes.
 * Mounts at /athletes. No auth, no Layout wrapper, no scheduler.
 *
 * Note: Page renders at /athletes. Component children retain Recruit* prefix
 * (RecruitCard, RecruitsTopNav, etc.) — historical naming preserved during
 * Sprint 011 path pivot from /recruits to /athletes (see retro for context).
 *
 * Phase 1: top nav (D2) + hero (D3).
 * Phase 2: school toggle (D4) + filter bar (D5) + RecruitCard grid (D6) +
 *          data fetch via useRecruitsRoster + loading/error/empty states.
 * Phase 3: mobile pass + footer (D7-D8).
 */

import { useMemo, useState } from 'react';
import RecruitsTopNav from '../components/recruits/RecruitsTopNav.jsx';
import RecruitsHero from '../components/recruits/RecruitsHero.jsx';
import SchoolToggle from '../components/recruits/SchoolToggle.jsx';
import RecruitsFilterBar from '../components/recruits/RecruitsFilterBar.jsx';
import RecruitCard from '../components/recruits/RecruitCard.jsx';
import RecruitsFooter from '../components/recruits/RecruitsFooter.jsx';
import CoachSchedulerCTA from '../components/scheduler/CoachSchedulerCTA.jsx';
import CoachSchedulerSection from '../components/scheduler/CoachSchedulerSection.jsx';
import { RECRUIT_SCHOOLS } from '../data/recruits-schools.js';
import useRecruitsRoster from '../hooks/useRecruitsRoster.js';

const DEFAULT_FILTERS = {
  search: '',
  position: '',
  classYear: '',
  sort: 'name-asc',
};

function uniqueSorted(values) {
  return Array.from(new Set(values.filter((v) => v != null && v !== ''))).sort(
    (a, b) => (a > b ? 1 : a < b ? -1 : 0)
  );
}

function applyFilters(profiles, filters) {
  const search = filters.search.trim().toLowerCase();
  let out = profiles;
  if (search) {
    out = out.filter((p) =>
      String(p.name || '').toLowerCase().includes(search)
    );
  }
  if (filters.position) {
    out = out.filter((p) => p.position === filters.position);
  }
  if (filters.classYear) {
    out = out.filter((p) => String(p.grad_year) === String(filters.classYear));
  }
  const sorted = [...out];
  switch (filters.sort) {
    case 'name-desc':
      sorted.sort((a, b) => String(b.name).localeCompare(String(a.name)));
      break;
    case 'class-year':
      sorted.sort((a, b) => (a.grad_year ?? 0) - (b.grad_year ?? 0));
      break;
    case 'name-asc':
    default:
      sorted.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      break;
  }
  return sorted;
}

export default function AthletesPage() {
  const initialActive = RECRUIT_SCHOOLS.find((s) => s.active) || RECRUIT_SCHOOLS[0];
  const [activeSlug, setActiveSlug] = useState(initialActive.slug);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const activeSchool = RECRUIT_SCHOOLS.find((s) => s.slug === activeSlug);
  const { profiles, loading, error, retry } = useRecruitsRoster({
    filter: activeSchool && activeSchool.active ? activeSchool.filter : null,
  });

  const positions = useMemo(
    () => uniqueSorted(profiles.map((p) => p.position)),
    [profiles]
  );
  const classYears = useMemo(
    () => uniqueSorted(profiles.map((p) => p.grad_year)),
    [profiles]
  );

  const filtered = useMemo(
    () => applyFilters(profiles, filters),
    [profiles, filters]
  );

  return (
    <div
      data-testid="athletes-page"
      style={{
        minHeight: '100vh',
        background: 'var(--gf-light-bg)',
        color: 'var(--gf-light-text)',
        fontFamily: 'var(--gf-body)',
      }}
    >
      <RecruitsTopNav />
      <RecruitsHero />

      {/* Sprint 012 Phase 2 — sticky CTA strip. MUST be a direct child of
          the page-root <div>, not nested inside <main>; position: sticky
          anchors against this scroll container. CTA owns its own scroll
          behavior — clicking smooth-scrolls to #coach-scheduler-section. */}
      <CoachSchedulerCTA />

      <main
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: 'var(--gf-space-3xl) var(--gf-space-xl)',
        }}
      >
        <header
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'end',
            justifyContent: 'space-between',
            gap: 'var(--gf-space-lg)',
            marginBottom: 'var(--gf-space-xl)',
            paddingBottom: 'var(--gf-space-lg)',
            borderBottom: '1px solid var(--gf-light-border)',
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--gf-display)',
                fontWeight: 500,
                fontSize: '2.5rem',
                letterSpacing: '-0.02em',
                marginBottom: '0.4rem',
                color: 'var(--gf-light-text)',
              }}
            >
              Gritty Recruits
            </h2>
            <p
              style={{
                fontFamily: 'var(--gf-body)',
                color: 'var(--gf-light-text-muted)',
                fontSize: '1rem',
              }}
            >
              Student-athletes available for in-person evaluation during the
              contact period.
            </p>
          </div>
          <div
            data-testid="athletes-count"
            style={{
              fontFamily: 'var(--gf-display)',
              fontStyle: 'italic',
              fontSize: '0.95rem',
              color: 'var(--gf-light-text-muted)',
            }}
          >
            <strong style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--gf-light-text)' }}>
              {filtered.length}
            </strong>{' '}
            athletes ·{' '}
            <strong style={{ fontStyle: 'normal', fontWeight: 600, color: 'var(--gf-light-text)' }}>
              {RECRUIT_SCHOOLS.filter((s) => s.active).length}
            </strong>{' '}
            school active
          </div>
        </header>

        <SchoolToggle activeSlug={activeSlug} onChange={setActiveSlug} />

        <RecruitsFilterBar
          filters={filters}
          onChange={setFilters}
          positions={positions}
          classYears={classYears}
        />

        {error && (
          <div
            data-testid="athletes-error"
            role="alert"
            style={{
              fontFamily: 'var(--gf-body)',
              background: 'var(--gf-light-bg-elev)',
              border: '1px solid var(--gf-light-border)',
              borderLeft: '3px solid var(--gf-accent-deep)',
              borderRadius: 'var(--gf-radius-sm)',
              padding: 'var(--gf-space-md) var(--gf-space-lg)',
              marginBottom: 'var(--gf-space-lg)',
              color: 'var(--gf-light-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--gf-space-md)',
            }}
          >
            <span>
              Couldn't load the roster. {error.message ? `(${error.message})` : ''}
            </span>
            <button
              type="button"
              onClick={retry}
              style={{
                fontFamily: 'var(--gf-body)',
                background: 'var(--gf-accent)',
                color: 'var(--gf-text-on-accent)',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--gf-radius-pill)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {loading && (
          <div
            data-testid="athletes-loading"
            aria-busy="true"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 'var(--gf-space-lg)',
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                aria-hidden="true"
                style={{
                  background: 'var(--gf-bg-elev)',
                  borderRadius: 'var(--gf-radius)',
                  height: 280,
                  opacity: 0.4,
                }}
              />
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && profiles.length > 0 && (
          <div
            data-testid="athletes-empty-filtered"
            style={{
              fontFamily: 'var(--gf-body)',
              color: 'var(--gf-light-text-muted)',
              padding: 'var(--gf-space-xl)',
              textAlign: 'center',
            }}
          >
            No matches. Adjust filters.
          </div>
        )}

        {!loading && !error && profiles.length === 0 && (
          <div
            data-testid="athletes-empty-roster"
            style={{
              fontFamily: 'var(--gf-body)',
              color: 'var(--gf-light-text-muted)',
              padding: 'var(--gf-space-xl)',
              textAlign: 'center',
            }}
          >
            No athletes available for this school yet.
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div
            data-testid="athletes-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 'var(--gf-space-lg)',
            }}
          >
            {filtered.map((p) => (
              <RecruitCard key={p.user_id} profile={p} />
            ))}
          </div>
        )}
      </main>

      {/* Sprint 012 Phase 2 — inline scheduler section. Rendered as a sibling
          of <main> so the dark band extends edge-to-edge horizontally rather
          than being constrained by <main>'s 1280px max-width and light-bg
          gutters. CTA strip scroll-targets this section's id. */}
      <CoachSchedulerSection />

      <RecruitsFooter />
    </div>
  );
}
