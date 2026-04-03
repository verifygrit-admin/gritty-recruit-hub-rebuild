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

  // ── Division aggregation ──
  const divisionData = useMemo(() => {
    const divs = {};

    for (const [userId, items] of Object.entries(shortlistByStudent)) {
      for (const item of items) {
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
    </div>
  );
}
