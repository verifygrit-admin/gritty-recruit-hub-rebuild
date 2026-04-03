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

      {/* Student slideout renders here — added in Task 5 */}
    </div>
  );
}
