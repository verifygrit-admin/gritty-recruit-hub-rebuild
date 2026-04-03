# Recruiting Intelligence Tab Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace CoachRecruitingIntelPage.jsx with a two-layer drill-down intelligence view (Division -> Conference) with deadline countdown bar, avatar badges, and student slideout panel.

**Architecture:** Single-file replacement. Section 1 is a static deadline countdown bar. Section 2 (Division Layer) and Section 3 (Conference Layer) are state-driven views within the same component — Layer 2 slides in below Layer 1 when a division card is clicked, no route change. A student slideout panel (mirroring StudentDetailPanel pattern) opens on avatar click, filtered to the current division or conference context. All data derives from `shortlistByStudent` prop (already RLS-gated by parent) plus one read-only `schools` table fetch for camp/division data.

**Tech Stack:** React (useState/useEffect/useMemo), Supabase JS client (existing), CSS-in-JS inline styles (matching app pattern). No new dependencies.

---

## Constraints (Scout-confirmed)

- Frontend only. No migrations. No schema changes. No new tables.
- Single file: `src/pages/coach/CoachRecruitingIntelPage.jsx`
- One parent edit: `src/pages/CoachDashboardPage.jsx` — pass `students` prop to intel tab
- Colors: maroon `#6B1A1A`, gold `#C9A84C` (Chris-specified for this rebuild)
- Existing app colors (`#8B3A3A`, `#D4AF37`) remain in all other files — NOT changed

## File Structure

Only two files touched:

| File | Action | Responsibility |
|------|--------|----------------|
| `src/pages/coach/CoachRecruitingIntelPage.jsx` | Replace entirely | All 3 sections + slideout + data logic |
| `src/pages/CoachDashboardPage.jsx` | 1-line edit | Pass `students` prop to intel tab |

The component is intentionally one file because all sections share state (selected division, selected student, school details map). Splitting would require prop-drilling or context with no reuse benefit.

## Data Shape Reference

**`students` prop** (from parent — array of profile objects):
```js
{ user_id, name, position, grad_year, high_school, gpa, sat, state, email,
  last_grit_fit_run_at, last_grit_fit_zero_match, hudl_url, avatar_storage_path }
```

**`shortlistByStudent` prop** (from parent — `{ [user_id]: item[] }`):
Each item has:
```js
{ id, unitid, user_id, school_name, div, conference, coach_link, q_link,
  grit_fit_status, grit_fit_labels, recruiting_journey_steps, source, ... }
```
Note: `div` is the division field on items (not `type`). `prospect_camp_link` is NOT on items — must come from `schools` table.

**`schools` table fetch** (read-only, for camp links + type field):
```js
supabase.from('schools')
  .select('unitid, school_name, type, conference, prospect_camp_link, coach_link')
  .in('unitid', allUnitids)
```
Note: `schools.type` is the canonical division name (e.g., "D3", "FCS"). Items use `item.div` which should match.

**Avatar resolution** (from PlayerCard pattern):
```js
// Storage photo
supabase.storage.from('avatars').getPublicUrl(student.avatar_storage_path)
// Hudl fallback — show initial letter (Hudl logo import not needed for 32px circles)
// Final fallback — first initial in gold circle
```

## Deadline Data (hardcoded)

```js
const DEADLINES = [
  { name: 'Pre-Read Submissions', date: new Date(2026, 5, 15) },    // June 15
  { name: 'Dead Period Begins', date: new Date(2026, 7, 1) },       // Aug 1
  { name: 'Early Decision Applications', date: new Date(2026, 9, 31) }, // Oct 31
  { name: 'Early Signing Day', date: new Date(2026, 11, 7) },       // Dec 7
];
```

Color logic: gold `#C9A84C` if >60 days, maroon `#6B1A1A` if <=60, red `#D32F2F` if <=14 days.

---

## Task 1: Parent Prop Pass (1 min)

**Files:**
- Modify: `src/pages/CoachDashboardPage.jsx:322-325`

- [ ] **Step 1: Add `students` prop to intel tab render**

In `CoachDashboardPage.jsx`, find:
```jsx
      {activeTab === 'intel' && (
        <CoachRecruitingIntelPage
          shortlistByStudent={shortlistByStudent}
        />
      )}
```

Replace with:
```jsx
      {activeTab === 'intel' && (
        <CoachRecruitingIntelPage
          students={students}
          shortlistByStudent={shortlistByStudent}
        />
      )}
```

- [ ] **Step 2: Verify build still passes**

Run: `npx vite build 2>&1 | tail -5`
Expected: "built in" with 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/CoachDashboardPage.jsx
git commit -m "feat: pass students prop to recruiting intel tab"
```

---

## Task 2: Scaffold + Deadline Countdown Bar (Section 1)

**Files:**
- Replace: `src/pages/coach/CoachRecruitingIntelPage.jsx`

- [ ] **Step 1: Write the full file scaffold with Section 1 only**

Replace the entire file content with:

```jsx
/**
 * CoachRecruitingIntelPage — Recruiting Intelligence tab panel.
 * Two-layer drill-down: Division (Layer 1) -> Conference (Layer 2).
 * Deadline countdown bar at top. Student slideout on avatar click.
 *
 * Props from CoachDashboardPage shell:
 *   students — profile objects array (for avatars + names)
 *   shortlistByStudent — { [user_id]: shortlist_item[] }
 *
 * Data flow:
 *   1. Aggregate shortlistByStudent by division (from item.div)
 *   2. Fetch school details from schools table for camp links
 *   3. Layer 1: division cards with student avatars
 *   4. Layer 2: conference cards within selected division
 *   5. Student slideout: filtered to current division/conference context
 *
 * No migrations. No new tables. Read-only query on existing schools table.
 */
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient.js';

// ── Constants ────────────────────────────────────────────────────────────────

const MAROON = '#6B1A1A';
const GOLD = '#C9A84C';
const RED = '#D32F2F';
const TEXT_DARK = '#2C2C2C';
const TEXT_MED = '#6B6B6B';
const BORDER = '#E8E8E8';
const CREAM = '#F5EFE0';
const MAX_STEPS = 15;
const MAX_AVATARS = 6;

const DEADLINES = [
  { name: 'Pre-Read Submissions', date: new Date(2026, 5, 15) },
  { name: 'Dead Period Begins', date: new Date(2026, 7, 1) },
  { name: 'Early Decision Applications', date: new Date(2026, 9, 31) },
  { name: 'Early Signing Day', date: new Date(2026, 11, 7) },
];

function daysUntil(target) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const t = new Date(target);
  t.setHours(0, 0, 0, 0);
  return Math.ceil((t - now) / (1000 * 60 * 60 * 24));
}

function deadlineColor(days) {
  if (days <= 14) return RED;
  if (days <= 60) return MAROON;
  return GOLD;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CoachRecruitingIntelPage({ students, shortlistByStudent }) {
  const [schoolDetails, setSchoolDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [slideoutStudent, setSlideoutStudent] = useState(null);
  const [slideoutFilter, setSlideoutFilter] = useState(null); // { type: 'division'|'conference', value: string }
  const [imgErrors, setImgErrors] = useState({});

  // ── Student lookup map ──
  const studentMap = useMemo(() => {
    const map = {};
    for (const s of students) { map[s.user_id] = s; }
    return map;
  }, [students]);

  // ── Collect all unitids and fetch school details ──
  const allUnitids = useMemo(() => {
    const ids = new Set();
    for (const items of Object.values(shortlistByStudent)) {
      for (const item of items) { if (item.unitid) ids.add(item.unitid); }
    }
    return [...ids];
  }, [shortlistByStudent]);

  useEffect(() => {
    if (allUnitids.length === 0) { setLoading(false); return; }
    supabase
      .from('schools')
      .select('unitid, school_name, type, conference, prospect_camp_link, coach_link')
      .in('unitid', allUnitids)
      .then(({ data, error }) => {
        if (error) { console.error('Intel school fetch error:', error); setLoading(false); return; }
        const map = {};
        for (const s of (data || [])) { map[s.unitid] = s; }
        setSchoolDetails(map);
        setLoading(false);
      });
  }, [allUnitids]);

  // ── SECTION 1: Deadline Countdown Bar ──
  // (Sections 2 and 3 will be added in subsequent tasks)

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: TEXT_MED }}>
        Loading recruiting intelligence...
      </div>
    );
  }

  // Empty state
  const hasData = Object.values(shortlistByStudent).some(items => items.length > 0);
  if (!hasData) {
    return (
      <div data-testid="recruiting-intel-empty" style={{
        background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: 8,
        padding: 32, textAlign: 'center',
      }}>
        <p style={{ fontSize: '1rem', color: TEXT_MED, margin: 0 }}>
          No shortlist data yet — encourage students to build their school lists.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="recruiting-intel-page">
      {/* ── SECTION 1: Deadline Countdown Bar ── */}
      <div
        data-testid="deadline-bar"
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 4,
          marginBottom: 24,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {DEADLINES.map(dl => {
          const days = daysUntil(dl.date);
          const color = deadlineColor(days);
          const isPast = days < 0;
          return (
            <div
              key={dl.name}
              data-testid={`deadline-pill-${dl.name.replace(/\s+/g, '-').toLowerCase()}`}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px 20px',
                borderRadius: 24,
                border: `2px solid ${isPast ? BORDER : color}`,
                backgroundColor: isPast ? '#F9F9F9' : '#FFFFFF',
                opacity: isPast ? 0.5 : 1,
                minWidth: 160,
              }}
            >
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: isPast ? TEXT_MED : color,
                textAlign: 'center',
                lineHeight: 1.3,
              }}>
                {dl.name}
              </span>
              <span style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: isPast ? TEXT_MED : color,
                marginTop: 2,
              }}>
                {isPast ? 'Passed' : `${days}d`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Sections 2 and 3 render here — added in Tasks 3 and 4 */}
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx vite build 2>&1 | tail -5`
Expected: "built in" with 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/coach/CoachRecruitingIntelPage.jsx
git commit -m "feat: scaffold recruiting intel page with deadline countdown bar"
```

---

## Task 3: Division Layer (Section 2 — Layer 1)

**Files:**
- Modify: `src/pages/coach/CoachRecruitingIntelPage.jsx`

This task adds the division aggregation logic and the 3-column card grid.

- [ ] **Step 1: Add division aggregation useMemo**

Insert this block after the `allUnitids` useEffect (after the `setLoading(false)` closing `});`), before the `// ── SECTION 1` comment:

```jsx
  // ── Division aggregation ──
  const divisionData = useMemo(() => {
    const divs = {};

    for (const [userId, items] of Object.entries(shortlistByStudent)) {
      for (const item of items) {
        // Use schools.type as canonical division, fall back to item.div
        const school = schoolDetails[item.unitid];
        const division = school?.type || item.div || 'Unknown';
        if (!divs[division]) {
          divs[division] = {
            name: division,
            studentIds: new Set(),
            schoolUnitids: new Set(),
            conferences: new Set(),
            items: [],
          };
        }
        divs[division].studentIds.add(userId);
        divs[division].schoolUnitids.add(item.unitid);
        if (item.conference) divs[division].conferences.add(item.conference);
        divs[division].items.push({ ...item, _userId: userId });
      }
    }

    return Object.values(divs)
      .map(d => ({
        name: d.name,
        studentIds: [...d.studentIds],
        schoolCount: d.schoolUnitids.size,
        conferenceCount: d.conferences.size,
        rosterPct: students.length > 0
          ? Math.round((d.studentIds.size / students.length) * 100)
          : 0,
        items: d.items,
      }))
      .sort((a, b) => b.studentIds.length - a.studentIds.length);
  }, [shortlistByStudent, schoolDetails, students]);
```

- [ ] **Step 2: Add the avatar renderer helper**

Insert this helper function inside the component, after the `divisionData` useMemo, before the loading check:

```jsx
  // ── Avatar helper ──
  function renderAvatars(studentIds, filterCtx) {
    const visible = studentIds.slice(0, MAX_AVATARS);
    const overflow = studentIds.length - MAX_AVATARS;

    return (
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
        {visible.map((uid, i) => {
          const student = studentMap[uid];
          if (!student) return null;
          const hasStorageAvatar = student.avatar_storage_path && !imgErrors[uid];
          let avatarUrl = null;
          if (hasStorageAvatar) {
            const { data } = supabase.storage.from('avatars').getPublicUrl(student.avatar_storage_path);
            avatarUrl = data?.publicUrl;
          }
          const initial = student.name?.charAt(0).toUpperCase() || '?';

          return (
            <div
              key={uid}
              title={student.name || 'Unknown'}
              onClick={(e) => { e.stopPropagation(); setSlideoutStudent(uid); setSlideoutFilter(filterCtx); }}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '2px solid #FFFFFF',
                backgroundColor: CREAM,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, color: MAROON,
                cursor: 'pointer',
                marginLeft: i > 0 ? -8 : 0,
                zIndex: MAX_AVATARS - i,
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
                transition: 'transform 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={student.name}
                  onError={() => setImgErrors(prev => ({ ...prev, [uid]: true }))}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                initial
              )}
            </div>
          );
        })}
        {overflow > 0 && (
          <span style={{
            marginLeft: 6,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: TEXT_MED,
          }}>
            +{overflow} more
          </span>
        )}
      </div>
    );
  }
```

- [ ] **Step 3: Add the Division Grid (Section 2) to the JSX return**

Replace the `{/* Sections 2 and 3 render here — added in Tasks 3 and 4 */}` comment with:

```jsx
      {/* ── SECTION 2: Division Layer (Layer 1) ── */}
      {!selectedDivision && (
        <div data-testid="division-layer">
          <h3 style={{
            fontSize: '1.125rem', fontWeight: 600, color: TEXT_DARK,
            margin: '0 0 4px',
          }}>
            Recruiting Intelligence
          </h3>
          <p style={{
            fontSize: '0.875rem', color: TEXT_MED, margin: '0 0 20px', lineHeight: 1.5,
          }}>
            Schools your athletes are targeting — drill down by division and conference.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {divisionData.map(div => (
              <div
                key={div.name}
                data-testid={`division-card-${div.name}`}
                onClick={() => setSelectedDivision(div.name)}
                style={{
                  background: '#FFFFFF',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'box-shadow 200ms, transform 200ms',
                  aspectRatio: '1 / 0.85',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 6px 20px ${GOLD}33`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: MAROON }}>
                      {div.name}
                    </span>
                    <span style={{
                      background: GOLD, color: MAROON, fontWeight: 700,
                      fontSize: '0.7rem', padding: '3px 10px', borderRadius: 12,
                    }}>
                      {div.conferenceCount} conf.
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: TEXT_MED, marginBottom: 4 }}>
                    {div.schoolCount} school{div.schoolCount !== 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: MAROON, fontWeight: 600 }}>
                    {div.rosterPct}% of your roster
                  </div>
                </div>

                {renderAvatars(div.studentIds, { type: 'division', value: div.name })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3 (Conference Layer) renders here — added in Task 4 */}

      {/* Student slideout renders here — added in Task 5 */}
```

- [ ] **Step 4: Verify build passes**

Run: `npx vite build 2>&1 | tail -5`
Expected: "built in" with 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/coach/CoachRecruitingIntelPage.jsx
git commit -m "feat: add division layer grid with avatar badges"
```

---

## Task 4: Conference Layer (Section 3 — Layer 2)

**Files:**
- Modify: `src/pages/coach/CoachRecruitingIntelPage.jsx`

- [ ] **Step 1: Add conference aggregation useMemo**

Insert after the `divisionData` useMemo, before the `renderAvatars` function:

```jsx
  // ── Conference aggregation (for selected division) ──
  const conferenceData = useMemo(() => {
    if (!selectedDivision) return [];

    const confs = {};
    for (const [userId, items] of Object.entries(shortlistByStudent)) {
      for (const item of items) {
        const school = schoolDetails[item.unitid];
        const division = school?.type || item.div || 'Unknown';
        if (division !== selectedDivision) continue;

        const conf = item.conference || 'Independent';
        if (!confs[conf]) {
          confs[conf] = {
            name: conf,
            studentIds: new Set(),
            schools: new Map(), // unitid -> { school_name, coach_link }
            items: [],
          };
        }
        confs[conf].studentIds.add(userId);
        confs[conf].items.push({ ...item, _userId: userId });

        if (!confs[conf].schools.has(item.unitid)) {
          confs[conf].schools.set(item.unitid, {
            school_name: item.school_name || school?.school_name || `UNITID ${item.unitid}`,
            coach_link: item.coach_link || school?.coach_link || null,
            prospect_camp_link: school?.prospect_camp_link || null,
          });
        }
      }
    }

    return Object.values(confs)
      .map(c => ({
        name: c.name,
        studentIds: [...c.studentIds],
        schoolCount: c.schools.size,
        schools: [...c.schools.values()],
        rosterPct: students.length > 0
          ? Math.round((c.studentIds.size / students.length) * 100)
          : 0,
        items: c.items,
      }))
      .sort((a, b) => b.studentIds.length - a.studentIds.length);
  }, [selectedDivision, shortlistByStudent, schoolDetails, students]);
```

- [ ] **Step 2: Add the Conference Layer JSX**

Replace the `{/* Section 3 (Conference Layer) renders here — added in Task 4 */}` comment with:

```jsx
      {/* ── SECTION 3: Conference Layer (Layer 2) ── */}
      {selectedDivision && (
        <div
          data-testid="conference-layer"
          style={{
            animation: 'slideDown 250ms ease-out',
          }}
        >
          {/* Back button */}
          <button
            data-testid="back-to-divisions"
            onClick={() => setSelectedDivision(null)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: MAROON, fontWeight: 600, fontSize: '0.875rem',
              padding: '4px 0', marginBottom: 16,
            }}
          >
            &larr; All Divisions
          </button>

          <h3 style={{
            fontSize: '1.125rem', fontWeight: 600, color: TEXT_DARK,
            margin: '0 0 4px',
          }}>
            {selectedDivision} — Conferences
          </h3>
          <p style={{
            fontSize: '0.875rem', color: TEXT_MED, margin: '0 0 20px', lineHeight: 1.5,
          }}>
            Conference breakdown for {selectedDivision} schools on your athletes' shortlists.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {conferenceData.map(conf => {
              const coachLinkSchools = conf.schools.filter(s => s.coach_link);
              const visibleCoachLinks = coachLinkSchools.slice(0, 4);
              const moreCoachLinks = coachLinkSchools.length - 4;

              return (
                <div
                  key={conf.name}
                  data-testid={`conference-card-${conf.name}`}
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'box-shadow 200ms, transform 200ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 6px 20px ${GOLD}33`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: MAROON }}>
                      {conf.name}
                    </span>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 600, color: TEXT_MED,
                    }}>
                      {conf.schoolCount} school{conf.schoolCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: MAROON, fontWeight: 600, marginBottom: 4 }}>
                    {conf.rosterPct}% of your roster
                  </div>

                  {renderAvatars(conf.studentIds, { type: 'conference', value: conf.name })}

                  {/* Coaching Staff links */}
                  {visibleCoachLinks.length > 0 && (
                    <div style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: `1px solid ${BORDER}`,
                    }}>
                      <div style={{
                        fontSize: '0.6875rem', fontWeight: 600, color: TEXT_MED,
                        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
                      }}>
                        Coaching Staff
                      </div>
                      {visibleCoachLinks.map((s, i) => (
                        <a
                          key={i}
                          href={s.coach_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'block',
                            fontSize: '0.8125rem',
                            color: MAROON,
                            textDecoration: 'none',
                            padding: '2px 0',
                            fontWeight: 500,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {s.school_name} &rarr;
                        </a>
                      ))}
                      {moreCoachLinks > 0 && (
                        <span style={{ fontSize: '0.75rem', color: TEXT_MED }}>
                          +{moreCoachLinks} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
```

- [ ] **Step 3: Add the CSS keyframe for slide-down animation**

Insert this `useEffect` after the existing `useEffect` for school data fetching, before the `divisionData` useMemo:

```jsx
  // ── Inject slide-down keyframe (once) ──
  useEffect(() => {
    const id = 'intel-slide-keyframe';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }`;
    document.head.appendChild(style);
    return () => { const el = document.getElementById(id); if (el) el.remove(); };
  }, []);
```

- [ ] **Step 4: Verify build passes**

Run: `npx vite build 2>&1 | tail -5`
Expected: "built in" with 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/coach/CoachRecruitingIntelPage.jsx
git commit -m "feat: add conference layer with coaching staff links"
```

---

## Task 5: Student Slideout Panel

**Files:**
- Modify: `src/pages/coach/CoachRecruitingIntelPage.jsx`

This mirrors the `StudentDetailPanel` pattern: fixed overlay, backdrop, right-edge panel, body scroll lock, Escape to close.

- [ ] **Step 1: Add slideout status label constants**

Insert after the `DEADLINES` array at the top of the file (outside the component):

```jsx
const STATUS_LABELS = {
  currently_recommended: 'Currently Recommended',
  out_of_academic_reach: 'Academic Stretch',
  below_academic_fit: 'Below Academic Fit',
  out_of_athletic_reach: 'Athletic Stretch',
  below_athletic_fit: 'Highly Recruitable',
  outside_geographic_reach: 'Outside Geographic Reach',
  not_evaluated: 'Not Evaluated',
};

const STATUS_COLORS = {
  currently_recommended: '#4CAF50',
  out_of_academic_reach: '#F44336',
  below_academic_fit: '#FF9800',
  out_of_athletic_reach: '#F44336',
  below_athletic_fit: '#D4A017',
  outside_geographic_reach: '#9C27B0',
  not_evaluated: '#6B6B6B',
};
```

- [ ] **Step 2: Add body-scroll-lock effect for slideout**

Insert inside the component, after the `imgErrors` state declaration:

```jsx
  // ── Lock body scroll when slideout is open ──
  useEffect(() => {
    if (!slideoutStudent) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [slideoutStudent]);

  // ── Close slideout on Escape ──
  useEffect(() => {
    if (!slideoutStudent) return;
    const handler = (e) => { if (e.key === 'Escape') { setSlideoutStudent(null); setSlideoutFilter(null); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [slideoutStudent]);
```

- [ ] **Step 3: Compute filtered items for the slideout**

Insert inside the component, after the `conferenceData` useMemo:

```jsx
  // ── Slideout: filtered shortlist items for selected student ──
  const slideoutItems = useMemo(() => {
    if (!slideoutStudent || !slideoutFilter) return [];
    const items = shortlistByStudent[slideoutStudent] || [];

    return items.filter(item => {
      const school = schoolDetails[item.unitid];
      if (slideoutFilter.type === 'division') {
        const division = school?.type || item.div || 'Unknown';
        return division === slideoutFilter.value;
      }
      if (slideoutFilter.type === 'conference') {
        return (item.conference || 'Independent') === slideoutFilter.value;
      }
      return true;
    }).map(item => {
      const school = schoolDetails[item.unitid];
      const steps = item.recruiting_journey_steps || [];
      const done = steps.filter(s => s.completed).length;
      return {
        ...item,
        _done: done,
        _total: steps.length,
        _pct: steps.length > 0 ? Math.round((done / steps.length) * 100) : 0,
        _campLink: school?.prospect_camp_link || null,
      };
    }).sort((a, b) => b._pct - a._pct);
  }, [slideoutStudent, slideoutFilter, shortlistByStudent, schoolDetails]);
```

- [ ] **Step 4: Add the slideout JSX**

Replace the `{/* Student slideout renders here — added in Task 5 */}` comment with:

```jsx
      {/* ── Student Slideout ── */}
      {slideoutStudent && (() => {
        const student = studentMap[slideoutStudent];
        if (!student) return null;
        const filterLabel = slideoutFilter
          ? `${slideoutFilter.value} schools`
          : 'schools';

        return (
          <div
            data-testid="intel-student-slideout-overlay"
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}
          >
            {/* Backdrop */}
            <div
              style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
              onClick={() => { setSlideoutStudent(null); setSlideoutFilter(null); }}
              aria-hidden="true"
            />
            {/* Panel */}
            <div
              data-testid="intel-student-slideout"
              style={{
                position: 'relative',
                width: 'min(50vw, 560px)',
                height: '100%',
                backgroundColor: '#FFFFFF',
                boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
                overflowY: 'auto',
                transition: 'transform 250ms ease-out',
              }}
            >
              {/* Sticky close button */}
              <div style={{
                position: 'sticky', top: 0, zIndex: 2,
                display: 'flex', justifyContent: 'flex-start',
                padding: '12px 16px 0', backgroundColor: '#FFFFFF',
              }}>
                <button
                  data-testid="slideout-close"
                  onClick={() => { setSlideoutStudent(null); setSlideoutFilter(null); }}
                  style={{
                    background: 'none', border: `1px solid ${BORDER}`,
                    borderRadius: 4, padding: '6px 14px', cursor: 'pointer',
                    fontSize: '0.8125rem', color: TEXT_MED, fontWeight: 500,
                  }}
                >
                  Close
                </button>
              </div>

              {/* Student header */}
              <div style={{ padding: '16px 20px 0' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.125rem', fontWeight: 600, color: TEXT_DARK }}>
                  {student.name || 'Unknown Student'}
                </h3>
                <div style={{ fontSize: '0.875rem', color: TEXT_MED, marginBottom: 4 }}>
                  {[student.position, student.grad_year ? `Class of ${student.grad_year}` : null]
                    .filter(Boolean).join(' \u2022 ') || 'No profile details'}
                </div>
                <div style={{
                  fontSize: '0.8125rem', color: MAROON, fontWeight: 500, marginBottom: 16,
                }}>
                  Showing {slideoutItems.length} {filterLabel}
                </div>
              </div>

              {/* Filtered school list */}
              <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {slideoutItems.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: TEXT_MED, fontStyle: 'italic' }}>
                    No schools in this {slideoutFilter?.type || 'filter'}.
                  </p>
                ) : (
                  slideoutItems.map(item => (
                    <div
                      key={item.id}
                      data-testid={`slideout-school-${item.id}`}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: CREAM,
                        borderRadius: 6,
                      }}
                    >
                      {/* School name + status badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: TEXT_DARK }}>
                          {item.school_name || `UNITID ${item.unitid}`}
                        </span>
                        <span style={{
                          fontSize: '0.6875rem', fontWeight: 500, color: '#FFFFFF',
                          backgroundColor: STATUS_COLORS[item.grit_fit_status] || TEXT_MED,
                          padding: '2px 8px', borderRadius: 12,
                        }}>
                          {STATUS_LABELS[item.grit_fit_status] || item.grit_fit_status || 'Not Evaluated'}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{
                          flex: 1, height: 6, backgroundColor: BORDER,
                          borderRadius: 3, overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', width: `${item._pct}%`,
                            backgroundColor: MAROON, borderRadius: 3,
                          }} />
                        </div>
                        <span style={{ fontSize: '0.6875rem', color: TEXT_MED, whiteSpace: 'nowrap' }}>
                          {item._done}/{item._total}
                        </span>
                      </div>

                      {/* Camp link */}
                      {item._campLink && (
                        <a
                          href={item._campLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: '0.75rem', color: '#2A6B5C', fontWeight: 500,
                            textDecoration: 'none',
                          }}
                        >
                          <span style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: '#4CAF50', display: 'inline-block',
                          }} />
                          2026 Camp Available
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}
```

- [ ] **Step 5: Add responsive media query for slideout**

Update the existing `useEffect` that injects the slideDown keyframe. Replace it entirely with:

```jsx
  // ── Inject keyframes + responsive rules (once) ──
  useEffect(() => {
    const id = 'intel-slide-keyframe';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = [
      '@keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }',
      '@media (max-width: 768px) { [data-testid="intel-student-slideout"] { width: 100% !important; } }',
    ].join('\n');
    document.head.appendChild(style);
    return () => { const el = document.getElementById(id); if (el) el.remove(); };
  }, []);
```

- [ ] **Step 6: Verify build passes**

Run: `npx vite build 2>&1 | tail -5`
Expected: "built in" with 0 errors

- [ ] **Step 7: Commit**

```bash
git add src/pages/coach/CoachRecruitingIntelPage.jsx
git commit -m "feat: add student slideout panel with filtered school list"
```

---

## Task 6: Final Polish + Build Verification

**Files:**
- Verify: `src/pages/coach/CoachRecruitingIntelPage.jsx`
- Verify: `src/pages/CoachDashboardPage.jsx`

- [ ] **Step 1: Verify the full file compiles**

Run: `npx vite build 2>&1 | tail -5`
Expected: "built in" with 0 errors

- [ ] **Step 2: Verify no console warnings about missing keys or props**

Run: `npx vite build 2>&1 | grep -i "warning\|error" | head -10`
Expected: Only the existing chunk-size warning (not a code issue)

- [ ] **Step 3: Final commit (squash candidate or standalone)**

If all prior tasks were committed individually, this step only fires if Task 6 required fixes:

```bash
git add src/pages/coach/CoachRecruitingIntelPage.jsx src/pages/CoachDashboardPage.jsx
git commit -m "fix: polish recruiting intel page, verify clean build"
```

- [ ] **Step 4: Report**

Report to Chris:
- File changed: `src/pages/coach/CoachRecruitingIntelPage.jsx` (full replacement)
- File changed: `src/pages/CoachDashboardPage.jsx` (1 line — added `students` prop)
- Total line count of new CoachRecruitingIntelPage.jsx
- Assumptions made about data shape

---

## Post-Commit Gate (Scout holds)

After final commit, three agents fire in sequence:

1. **Dexter** — credential scan on both changed files
2. **David** — RLS chain verification on all queries (schools table fetch + all data derived from shortlistByStudent)
3. **Rio** — push to origin/master after both clear

Scout holds the gate until Dexter and David both report PASS/SAFE.

---

## Assumptions

1. `short_list_items` rows carry `div` (division string matching `schools.type`), `conference`, `school_name`, `coach_link`, `grit_fit_status`, `recruiting_journey_steps` array.
2. `prospect_camp_link` is NOT on `short_list_items` — must be fetched from `schools` table.
3. `students` prop from parent has `avatar_storage_path` and `hudl_url` fields. Avatars resolve via `supabase.storage.from('avatars').getPublicUrl()`.
4. `schools.type` is the canonical division field (e.g., "D3", "FCS", "FBS"). `item.div` is used as fallback if school not found.
5. The `shortlistByStudent` prop is already RLS-gated by the parent's `hs_coach_students` query chain.
6. No Hudl logo component is imported for 32px avatar circles — initial letter fallback is used instead (simpler at this size).
