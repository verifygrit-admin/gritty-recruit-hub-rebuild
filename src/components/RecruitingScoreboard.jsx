/**
 * RecruitingScoreboard.jsx — Sprint 007 B.1
 *
 * Read-only progress lens that mounts as a collapsible above the Pre-Read
 * Docs Library on the Shortlist page. One row per shortlisted school across
 * three column groups:
 *   - Identity (Rank, UNITID, College, Division)
 *   - Five Key Recruiting Journey Steps (HC Contact, AC Contact, Jr Day,
 *     FB Camp, Tour/Visit Confirmed) — read-only booleans pulled from
 *     short_list_items.recruiting_journey_steps post-0037 relabel
 *   - Two Offers (Admissions Pre-Read Requested, Financial Aid Pre-Read
 *     Submitted) — also read-only booleans from the same JSONB
 *
 * Together the seven booleans drive the Quality Offer Score
 * (count of Yes ÷ 7 × 100%). The student's Athletic Fit Score from the
 * Grit Fit Engine is mapped per school's level of competition and
 * multiplied with Quality to produce Offer Profile.
 *
 * Sort: descending by Offer Profile.
 * Boundary marker row inserts at the 35% threshold (PROFILE_THRESHOLD).
 *
 * Build references:
 *   - prototypes/recruiting-scoreboard/recruiting-scoreboard.html (visual ground truth)
 *   - prototypes/recruiting-scoreboard/SPEC_FOR_CODE.md
 *   - prototypes/recruiting-scoreboard/DESIGN_NOTES.md
 *
 * Mobile pattern (per Phase B Addition Part 1):
 *   The prototype specifies horizontal-scroll-within-fixed-container for
 *   narrow viewports — the scoreboard-content wraps `overflow-x: auto`
 *   over a `min-width: 1200px` table. We build to that pattern. The page
 *   itself does not overflow horizontally; only the inner table scroll
 *   container does. Verified at 375px and 414px.
 *
 * Read-only:
 *   No editable cells. Boolean state changes only via the existing
 *   school-card UI elsewhere on the Shortlist (D2.5 / D2.6 in DESIGN_NOTES).
 */

import { useMemo, useState } from 'react';
import { TIER_ORDER } from '../lib/constants.js';
import { calcAthleticFit, calcAthleticBoost } from '../lib/scoring.js';
import { hasVerbalOffer, hasWrittenOffer } from '../lib/offerStatus.js';
import OfferBadge from './OfferBadge.jsx';

// ── Constants ────────────────────────────────────────────────────────────

/** Threshold for the Active-prospects vs lower-priority boundary marker. */
export const PROFILE_THRESHOLD = 35;

/**
 * The seven Scoreboard booleans, in column order. Each entry maps to a
 * step_id in short_list_items.recruiting_journey_steps (post-migration
 * 0037 relabel). The label here is the prototype column header — it does
 * NOT have to match the JSONB label (the JSONB labels were aligned in 0037,
 * but the Scoreboard renders these prototype headers verbatim regardless).
 */
const SCOREBOARD_COLUMNS = Object.freeze([
  { key: 'hc_contact',       header: 'HC\nContact',                     stepId: 11, group: 'events' },
  { key: 'ac_contact',       header: 'AC\nContact',                     stepId: 4,  group: 'events' },
  { key: 'jr_day_invite',    header: 'Jr Day\nInvite',                  stepId: 7,  group: 'events' },
  { key: 'fb_camp_invite',   header: 'FB Camp\nInvite',                 stepId: 9,  group: 'events' },
  { key: 'tour_visit',       header: 'Tour /\nVisit Confirmed',         stepId: 8,  group: 'events' },
  { key: 'admissions_preread', header: 'Admissions\nPre-Read Req.',     stepId: 12, group: 'offers' },
  { key: 'finaid_preread',   header: 'Financial Aid\nPre-Read Submitted', stepId: 13, group: 'offers' },
]);

/**
 * Map an item's div/type string to a Grit Fit tier key.
 * UConn (FBS Independent) maps to G6 per DEC-CFBRB locked decision —
 * but `schools.type` already stores 'G6' for UConn (verified 2026-04-26)
 * so the mapping is a no-op for it; this function exists as a safety net
 * for any row that arrives with a coarse division string instead of a
 * 5-tier value.
 */
function tierFromDiv(div) {
  if (!div) return null;
  const v = String(div).trim();
  // Already a tier key
  if (TIER_ORDER.includes(v)) return v;
  // Fallback rough mappings for any legacy/coarse value
  const lower = v.toLowerCase();
  if (lower === 'p4' || lower === 'power 4' || lower === 'power4') return 'Power 4';
  if (lower === 'g6') return 'G6';
  if (lower === 'fcs' || lower === '1-fcs') return 'FCS';
  if (lower === 'd2' || lower === '2-div ii' || lower === '2-d2') return 'D2';
  if (lower === 'd3' || lower === '3-div iii' || lower === '3-d3') return 'D3';
  // Coarse FBS without P4/G6 disambiguation — safer to default to G6
  // (matches the DEC-CFBRB rule for any future FBS Indy school).
  if (lower === '1-fbs' || lower === 'fbs') return 'G6';
  return null;
}

/**
 * Compute the student's per-tier Athletic Fit object. 0–1 scale per tier.
 * Returns null when the profile is missing the measurables required to
 * compute fit (Edge case 3 in SPEC_FOR_CODE).
 */
function computeAthFit(profile) {
  if (!profile) return null;
  const { position, height, weight, speed_40 } = profile;
  // Heuristic for the "missing measurables" path: position + a usable height
  // and a usable weight are the floor for a meaningful score. speed_40 is
  // optional — calcAthleticFit handles the absent case (Item 4 decision).
  if (!position) return null;
  const heightInches = parseHeight(height);
  const weightNum = weight ? Number(weight) : 0;
  if (!heightInches || !weightNum) return null;

  const speedNum = speed_40 ? Number(speed_40) : 0;
  const base = {};
  TIER_ORDER.forEach((tier) => {
    base[tier] = calcAthleticFit(position, heightInches, weightNum, speedNum, tier);
  });
  const boost = calcAthleticBoost({
    expected_starter: profile.expected_starter,
    captain:          profile.captain,
    all_conference:   profile.all_conference,
    all_state:        profile.all_state,
  });
  const out = {};
  TIER_ORDER.forEach((tier) => {
    out[tier] = Math.min(1, base[tier] + boost);
  });
  return out;
}

function parseHeight(h) {
  if (h == null) return NaN;
  if (typeof h === 'number') return h;
  const s = String(h).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const m = s.match(/(\d+)['\-]\s*(\d+)/);
  if (m) return parseInt(m[1], 10) * 12 + parseInt(m[2], 10);
  return parseFloat(s);
}

/** count of Yes booleans / 7, expressed 0–100. */
export function qualityOfferScore(boolList) {
  const yes = boolList.filter(Boolean).length;
  return (yes / SCOREBOARD_COLUMNS.length) * 100;
}

/** Multiplicative offer profile, expressed 0–100. */
export function offerProfile(qualityScore, athFitPct) {
  return (qualityScore * athFitPct) / 100;
}

/**
 * Pull the seven booleans for a shortlist item, in column order.
 * Looks up by step_id (not array index) to be robust against future
 * order changes.
 */
export function extractScoreboardBooleans(item) {
  const steps = Array.isArray(item?.recruiting_journey_steps)
    ? item.recruiting_journey_steps
    : [];
  const byStepId = new Map();
  for (const s of steps) {
    if (s && s.step_id != null) byStepId.set(s.step_id, Boolean(s.completed));
  }
  return SCOREBOARD_COLUMNS.map((col) => byStepId.get(col.stepId) === true);
}

// ── Color tokens (matched to prototype) ──────────────────────────────────

const C = {
  burgundyDeep: '#5C1620',
  burgundy:     '#7B1F2C',
  // Quality bar — deeper, more saturated dark red. Sprint 007 hotfix CHG-4:
  // raised contrast against the lighter Ath Fit pink so the two bands read
  // as distinct semantic series at a glance. Also surfaces in the legend
  // chip ("Quality Offer Score (live)").
  burgundyMid:  '#9B1C2C',
  // Ath Fit bar — clearly lighter / pinker. Sprint 007 hotfix CHG-4: paired
  // shift with burgundyMid so the dark-red / muted-pink semantic is preserved
  // but readable. Legend chip ("Athletic Fit Score (Grit Fit Engine)") tracks.
  burgundySoft: '#E8B5BE',
  parchmentBg:  '#FAF5EE',
  paper:        '#FAF6EA',
  ink:          '#2A1F1A',
  inkSoft:      '#4A3A30',
  inkMute:      '#7A6A60',
  rule:         'rgba(92, 22, 32, 0.15)',
  ruleStrong:   'rgba(92, 22, 32, 0.32)',
  yesBg:        '#C8DDB8',
  yesText:      '#2D4A1F',
  noBg:         '#F0CFC9',
  noText:       '#6E2620',
  groupEvents:  '#2D5C3A',
  scoreHigh:    '#2D7A4A',
  scoreMid:     '#E89A3C',
  scoreLow:     '#B85B3F',
  barTrack:     'rgba(92, 22, 32, 0.10)',
};

function tierClass(quality) {
  if (quality >= 70) return C.scoreHigh;
  if (quality >= 40) return C.scoreMid;
  return C.scoreLow;
}

// ── Component ────────────────────────────────────────────────────────────

export default function RecruitingScoreboard({
  items = [],
  studentProfile = null,
  /** Optional persistence callback for collapse state. */
  onCollapseChange = null,
  /** Optional initial collapse state. Default: expanded. */
  initialCollapsed = false,
  /** Optional click handler — receives the shortlist item when its school
   *  name is clicked. ShortlistPage uses this to open the matching slide-out. */
  onSchoolClick = null,
}) {
  const [isCollapsed, setIsCollapsed] = useState(Boolean(initialCollapsed));

  const handleToggle = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof onCollapseChange === 'function') onCollapseChange(next);
      return next;
    });
  };

  const athFit = useMemo(() => computeAthFit(studentProfile), [studentProfile]);
  const measurablesMissing = athFit === null;

  // Enrich + sort once per items / athFit change. Sprint 007 hotfix CHG-7:
  // schools with Quality Offer Score == 0 are filtered out of the Scoreboard
  // render. The shortlist below is unaffected — this filter is Scoreboard-only.
  // Post-filter rows are re-ranked at render time so the displayed Rank starts
  // at 1 and increments without gaps.
  const rows = useMemo(() => {
    if (!items || items.length === 0) return [];
    const enriched = items
      .map((item) => {
        const bools = extractScoreboardBooleans(item);
        const quality = qualityOfferScore(bools);
        const tier = tierFromDiv(item.div);
        const athFitPctRaw = athFit && tier ? athFit[tier] : null;
        const athFitPct = athFitPctRaw != null ? athFitPctRaw * 100 : null;
        const profile = athFitPct != null ? offerProfile(quality, athFitPct) : null;
        return { item, bools, quality, tier, athFitPct, profile };
      })
      .filter((row) => row.quality > 0);
    // Sort descending by profile. Rows with no profile (missing tier or no
    // athFit) sort to the bottom in order of descending quality.
    enriched.sort((a, b) => {
      if (a.profile == null && b.profile == null) return b.quality - a.quality;
      if (a.profile == null) return 1;
      if (b.profile == null) return -1;
      return b.profile - a.profile;
    });
    return enriched;
  }, [items, athFit]);

  // CHG-7: distinguish "no shortlist at all" from "shortlist exists but every
  // row is filtered out by Quality == 0". The two states show different copy.
  const hasItems = items && items.length > 0;
  const allFilteredOut = hasItems && rows.length === 0;

  // Boundary index — first row whose Profile drops below PROFILE_THRESHOLD.
  const boundaryIdx = useMemo(() => {
    if (!rows.length) return -1;
    return rows.findIndex(
      (r) => r.profile != null && r.profile < PROFILE_THRESHOLD,
    );
  }, [rows]);

  // ── Styles ─────────────────────────────────────────────────────────────

  const wrapperStyle = {
    marginBottom: 24,
    borderRadius: 4,
    overflow: 'hidden',
    background: C.paper,
    border: '1px solid rgba(92, 22, 32, 0.18)',
    boxShadow: '0 2px 8px rgba(92, 22, 32, 0.06)',
  };

  const toggleStyle = {
    background: C.burgundy,
    color: 'var(--brand-gold)',
    padding: '14px 22px',
    minHeight: 56, // ≥ 44px tap target per Phase B Addition Part 2
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    fontFamily: "'Cormorant Garamond', serif",
    fontWeight: 600,
    fontSize: '1.375rem',
    letterSpacing: '0.01em',
    userSelect: 'none',
    border: 'none',
    width: '100%',
    textAlign: 'left',
  };

  const introStyle = {
    padding: '18px 24px 16px',
    borderBottom: `1px solid ${C.rule}`,
    background: C.paper,
  };

  const introTextStyle = {
    fontSize: '0.8125rem',
    color: C.inkSoft,
    lineHeight: 1.6,
    maxWidth: 920,
    margin: 0,
  };

  const legendStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 14,
    fontSize: '0.6875rem',
    color: C.inkMute,
    letterSpacing: '0.02em',
  };

  // The prototype's mobile pattern: outer scroll-x container; inner table
  // sets a min-width so columns don't squeeze. Page-level horizontal
  // overflow is prevented by the page wrapper.
  const tableScrollStyle = {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.78125rem', // 12.5px to match prototype
    background: C.paper,
    minWidth: 1200,
  };

  // Sprint 007 hotfix HF-6 — sticky thead. The group-header row sticks at
  // top: 0 of the Scoreboard's containing block; the column-header row
  // sticks just below it. Per-<th> sticky is the cross-browser-reliable
  // pattern (sticky on <thead>/<tr> is inconsistent across Safari versions).
  // The vertical sticky scope is bounded by the table itself, so headers
  // remain visible only while the Scoreboard is still in view — once the
  // student scrolls past the table entirely, sticky deactivates and the
  // headers scroll out with the rest of the component.
  const GROUP_ROW_STICKY_TOP = 0;
  const COL_ROW_STICKY_TOP = 36; // approx group-row height at body-font 0.875rem + 8+8 padding

  const groupRowThStyle = {
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: '0.875rem',
    letterSpacing: '0.04em',
    padding: '8px 8px',
    textAlign: 'center',
    color: '#F4ECD8',
    borderRight: '1px solid rgba(244, 236, 216, 0.18)',
    borderBottom: '1px solid rgba(244, 236, 216, 0.18)',
    position: 'sticky',
    top: GROUP_ROW_STICKY_TOP,
    zIndex: 6,
  };

  const colRowThStyle = {
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    fontSize: '0.6875rem',
    padding: '9px 8px',
    textAlign: 'center',
    letterSpacing: '0.04em',
    borderRight: '1px solid rgba(244, 236, 216, 0.10)',
    borderBottom: `2px solid ${C.burgundy}`,
    color: '#F4ECD8',
    verticalAlign: 'bottom',
    whiteSpace: 'pre-line',
    position: 'sticky',
    top: COL_ROW_STICKY_TOP,
    zIndex: 5,
  };

  const tdBaseStyle = {
    padding: '10px 10px',
    borderRight: `1px solid ${C.rule}`,
    verticalAlign: 'middle',
  };

  // ── Body sub-components ────────────────────────────────────────────────

  function BoolCell({ value }) {
    const yes = Boolean(value);
    return (
      <td
        data-testid={`scoreboard-bool-cell-${yes ? 'yes' : 'no'}`}
        style={{
          ...tdBaseStyle,
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.71875rem',
          fontWeight: 500,
          width: 90,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '3px 12px',
            borderRadius: 3,
            minWidth: 38,
            backgroundColor: yes ? C.yesBg : C.noBg,
            color: yes ? C.yesText : C.noText,
          }}
        >
          {yes ? 'Yes' : 'No'}
        </span>
      </td>
    );
  }

  function ProfileViz({ quality, athFitPct, profile }) {
    const qualityW = `${Math.max(0, Math.min(100, quality)).toFixed(2)}%`;
    const athW = athFitPct != null ? `${Math.max(0, Math.min(100, athFitPct)).toFixed(2)}%` : '0%';
    const profileW = profile != null ? `${Math.max(0, Math.min(100, profile)).toFixed(2)}%` : '0%';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <ProfileRow label="QUALITY" widthPct={qualityW} value={`${quality.toFixed(0)}%`} fillColor={C.burgundyMid} />
        <ProfileRow label="ATH FIT" widthPct={athW} value={athFitPct != null ? `${athFitPct.toFixed(1)}%` : '—'} fillColor={C.burgundySoft} striped />
        <div style={{ height: 1, background: C.rule, margin: '2px 4px' }} />
        <ProfileRow
          label="PROFILE"
          widthPct={profileW}
          value={profile != null ? `${profile.toFixed(0)}%` : '—'}
          fillColor={C.burgundyMid}
          opacity={0.85}
          composite
        />
      </div>
    );
  }

  function ProfileRow({ label, widthPct, value, fillColor, striped = false, opacity = 1, composite = false }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.65625rem' }}>
        <span
          style={{
            flexShrink: 0,
            width: 50,
            color: composite ? C.burgundy : C.inkMute,
            fontWeight: composite ? 700 : 500,
            letterSpacing: '0.04em',
            fontSize: composite ? '0.5625rem' : '0.59375rem',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        <div
          style={{
            flex: 1,
            height: 12,
            background: C.barTrack,
            borderRadius: 2,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: widthPct,
              height: '100%',
              background: fillColor,
              backgroundImage: striped
                ? 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.18) 3px, rgba(255,255,255,0.18) 6px)'
                : undefined,
              opacity,
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <span
          style={{
            flexShrink: 0,
            width: 38,
            textAlign: 'right',
            fontWeight: composite ? 700 : 600,
            color: composite ? C.burgundy : C.ink,
            fontSize: '0.65625rem',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div data-testid="recruiting-scoreboard" style={wrapperStyle}>
      <button
        type="button"
        data-testid="recruiting-scoreboard-toggle"
        aria-expanded={!isCollapsed}
        onClick={handleToggle}
        style={toggleStyle}
      >
        <span>Recruiting Scoreboard</span>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            color: 'var(--brand-gold)',
          }}
        >
          ▾
        </span>
      </button>

      {!isCollapsed && (
        <div data-testid="recruiting-scoreboard-body">
          <div style={introStyle}>
            <p style={introTextStyle}>
              The Scoreboard tracks <strong>relationship progress</strong> across seven Key
              Recruiting Journey Steps for every school in your shortlist. The Quality Offer
              Score reflects how completely the relationship has been developed; the Athletic
              Fit Score (from the Grit Fit Engine) reflects how well your athletic profile
              matches that school's level of competition. Together they form the{' '}
              <strong>Offer Profile</strong> — Quality × Athletic Fit, sorted descending.
              Schools above the line clear the {PROFILE_THRESHOLD}% Offer Profile threshold.
            </p>
            <div style={legendStyle}>
              <LegendChip swatchColor={C.yesBg} swatchBorder={C.yesText} label="Yes (step completed)" />
              <LegendChip swatchColor={C.noBg} swatchBorder={C.noText} label="No (not yet)" />
              <LegendChip swatchColor={C.burgundyMid} label="Quality Offer Score (live)" />
              <LegendChip swatchColor={C.burgundySoft} label="Athletic Fit Score (Grit Fit Engine)" striped />
            </div>
          </div>

          {measurablesMissing ? (
            <div
              data-testid="scoreboard-no-measurables"
              style={{
                padding: '24px 22px',
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                color: C.burgundy,
                fontSize: '1rem',
                background: C.paper,
              }}
            >
              Grit Fit not yet computed. Add your position, height, and weight to your Student
              Profile to see Athletic Fit and Offer Profile here. Quality Offer Score still
              renders below from your shortlist activity.
            </div>
          ) : null}

          <div style={tableScrollStyle}>
            <table data-testid="scoreboard-table" style={tableStyle}>
              <thead style={{ background: C.burgundyDeep, color: '#F4ECD8' }}>
                <tr>
                  <th colSpan={4} style={{ ...groupRowThStyle, background: C.burgundyDeep }}>
                    Recruiting Scoreboard
                  </th>
                  <th colSpan={5} style={{ ...groupRowThStyle, background: C.groupEvents }}>
                    Key Recruiting Journey Steps
                  </th>
                  <th colSpan={2} style={{ ...groupRowThStyle, background: C.burgundy }}>
                    Offers
                  </th>
                  <th colSpan={2} style={{ ...groupRowThStyle, background: C.burgundyDeep, borderRight: 'none' }}>
                    Offer Profile
                  </th>
                </tr>
                <tr>
                  <th style={{ ...colRowThStyle, background: C.burgundyDeep }}>Rank</th>
                  <th style={{ ...colRowThStyle, background: C.burgundyDeep }}>UNITID</th>
                  <th style={{ ...colRowThStyle, background: C.burgundyDeep }}>College</th>
                  <th style={{ ...colRowThStyle, background: C.burgundyDeep }}>Division</th>
                  {SCOREBOARD_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      data-testid={`scoreboard-col-${col.key}`}
                      style={{
                        ...colRowThStyle,
                        background: col.group === 'events' ? C.groupEvents : C.burgundy,
                      }}
                    >
                      {col.header}
                    </th>
                  ))}
                  <th style={{ ...colRowThStyle, background: C.burgundyDeep }}>{'Quality Offer\nScore'}</th>
                  <th style={{ ...colRowThStyle, background: C.burgundyDeep, borderRight: 'none' }}>{'Compound\nProfile'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const showBoundary = idx === boundaryIdx;
                  return (
                    <ScoreboardRowGroup
                      key={row.item.id ?? `${row.item.unitid}-${idx}`}
                      row={row}
                      rank={idx + 1}
                      showBoundary={showBoundary}
                      threshold={PROFILE_THRESHOLD}
                      tdBaseStyle={tdBaseStyle}
                      BoolCell={BoolCell}
                      ProfileViz={ProfileViz}
                      onSchoolClick={onSchoolClick}
                    />
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td
                      data-testid={allFilteredOut ? 'scoreboard-no-activity' : 'scoreboard-no-items'}
                      colSpan={13}
                      style={{ ...tdBaseStyle, textAlign: 'center', padding: '24px 16px', color: C.inkMute }}
                    >
                      {allFilteredOut
                        ? 'No recruiting activity yet. Mark journey steps complete on your Shortlist below to populate the Scoreboard.'
                        : 'No schools yet. Add to your shortlist to see your Recruiting Scoreboard fill in.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '14px 22px 22px' }}>
            <div
              style={{
                fontSize: '0.71875rem',
                color: C.inkMute,
                lineHeight: 1.6,
                padding: '12px 16px',
                borderLeft: `3px solid ${C.burgundySoft}`,
                background: 'rgba(123, 31, 44, 0.08)',
                borderRadius: 2,
              }}
            >
              The Quality Offer Score is computed live from seven Key Recruiting Journey Steps:
              count of Yes ÷ 7 × 100%. The Athletic Fit Score is pulled from the GrittyOS Grit
              Fit Scoring Engine, mapped to each school's level of competition (Power 4 / G6 /
              FCS / D2 / D3). The journey-step booleans are <strong>read-only</strong> in the
              Scoreboard; they update only when you mark a step complete on the school card
              itself. <strong>Offer Profile = Quality × Athletic Fit</strong> — both metrics
              required, neither substitutes for the other.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendChip({ swatchColor, swatchBorder, label, striped = false }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: 20,
          height: 12,
          borderRadius: 2,
          background: swatchColor,
          backgroundImage: striped
            ? 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.18) 3px, rgba(255,255,255,0.18) 6px)'
            : undefined,
          border: swatchBorder ? `1px solid ${swatchBorder}` : undefined,
          opacity: swatchBorder ? 0.7 : 1,
        }}
      />
      {label}
    </span>
  );
}

function ScoreboardRowGroup({ row, rank, showBoundary, threshold, tdBaseStyle, BoolCell, ProfileViz, onSchoolClick }) {
  const { item, bools, quality, athFitPct, profile, tier } = row;
  const qualityColor = tierClass(quality);
  const schoolNameIsLink = typeof onSchoolClick === 'function';

  return (
    <>
      {showBoundary && (
        <tr data-testid="scoreboard-boundary-marker">
          <td
            colSpan={13}
            style={{
              padding: '6px 14px',
              fontFamily: 'var(--font-body)',
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: '0.75rem',
              color: '#7B1F2C',
              letterSpacing: '0.05em',
              background: 'linear-gradient(90deg, rgba(123, 31, 44, 0.08) 0%, transparent 100%)',
              borderBottom: '1px solid rgba(92, 22, 32, 0.32)',
            }}
          >
            — Active prospects (Offer Profile ≥ {threshold}%) above. Below: Increase outreach to coaches, attend more recruiting events, or make lower priority.
          </td>
        </tr>
      )}
      <tr
        data-testid="scoreboard-row"
        data-unitid={item.unitid}
        style={{ borderBottom: `1px solid ${'#5C162026'}` }}
      >
        <td
          style={{
            ...tdBaseStyle,
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '1rem',
            fontWeight: 600,
            color: '#7B1F2C',
            textAlign: 'center',
            width: 44,
          }}
        >
          {rank}
        </td>
        <td
          style={{
            ...tdBaseStyle,
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.6875rem',
            color: '#7A6A60',
            textAlign: 'center',
            letterSpacing: '0.02em',
            width: 64,
          }}
        >
          {item.unitid}
        </td>
        <td
          style={{
            ...tdBaseStyle,
            fontWeight: 500,
            color: '#2A1F1A',
            fontSize: '0.8125rem',
            minWidth: 220,
          }}
        >
          {schoolNameIsLink ? (
            <button
              type="button"
              data-testid="scoreboard-school-link"
              onClick={() => onSchoolClick(item)}
              style={{
                display: 'block',
                fontWeight: 500,
                fontSize: 'inherit',
                color: '#8B3A3A',
                background: 'none',
                border: 'none',
                padding: 0,
                margin: 0,
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              {item.school_name}
            </button>
          ) : (
            <span style={{ display: 'block', fontWeight: 500 }}>{item.school_name}</span>
          )}
          {(hasVerbalOffer(item) || hasWrittenOffer(item)) && (
            <div
              data-testid="scoreboard-offer-badges"
              style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}
            >
              {hasVerbalOffer(item) && <OfferBadge variant="verbal" size="sm" />}
              {hasWrittenOffer(item) && <OfferBadge variant="written" size="sm" />}
            </div>
          )}
          {item.conference && (
            <span
              style={{
                display: 'block',
                fontSize: '0.65625rem',
                color: '#7A6A60',
                marginTop: 1,
                letterSpacing: '0.04em',
              }}
            >
              {item.conference}
            </span>
          )}
        </td>
        <td
          style={{
            ...tdBaseStyle,
            textAlign: 'center',
            fontSize: '0.6875rem',
            color: '#4A3A30',
            fontWeight: 500,
            width: 70,
            letterSpacing: '0.02em',
          }}
        >
          {tier ?? item.div ?? '—'}
        </td>
        {bools.map((b, i) => (
          <BoolCell key={i} value={b} />
        ))}
        <td
          style={{
            ...tdBaseStyle,
            textAlign: 'center',
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '1rem',
            fontWeight: 600,
            width: 110,
            color: qualityColor,
          }}
        >
          {quality.toFixed(2)}%
        </td>
        <td
          style={{
            ...tdBaseStyle,
            width: 220,
            padding: '10px 14px',
            borderRight: 'none',
          }}
        >
          <ProfileViz quality={quality} athFitPct={athFitPct} profile={profile} />
        </td>
      </tr>
    </>
  );
}
